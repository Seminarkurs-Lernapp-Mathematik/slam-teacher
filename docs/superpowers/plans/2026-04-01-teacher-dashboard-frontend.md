# Teacher Dashboard Frontend (slam-teacher) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the slam-teacher React web app — a desktop-first Teacher Dashboard covering classroom view, live monitoring, analytics, student management, learning goals, and settings.

**Architecture:** Vite + React 18 + TypeScript SPA. Firebase Auth provides ID tokens sent as Bearer headers to the slam-backend REST API. TanStack Query v5 manages all server state (with polling for live screens); Zustand 5 holds UI state (selected class, beamer mode, theme, open student panel, edit mode). React Router v6 handles routing; an auth guard redirects unauthenticated users to `/login`, and a 404-on-`/api/teacher/me` check triggers the onboarding wizard on first login.

**Tech Stack:** React 18, TypeScript 5, Vite 5, Tailwind CSS 3, shadcn/ui, TanStack Query v5, Zustand 5, React Router v6, Firebase Auth JS SDK v10, @dnd-kit/core 6, Vitest 2, @testing-library/react 16

---

## Prerequisites: Backend Fix (slam-backend)

`PUT /api/teacher/me` currently returns 404 when no teacher doc exists, blocking onboarding. Add `POST /api/teacher/me` to create the initial teacher profile.

### Task 0: Add POST /api/teacher/me to slam-backend

**Repo:** `slam-backend` (not slam-teacher)

**Files:**
- Modify: `src/teacher/me.ts`
- Modify: `src/teacher/me.test.ts`

- [ ] **Step 1: Write failing tests** in `src/teacher/me.test.ts` — add a new `describe` block after the PUT block:

```typescript
describe('POST /api/teacher/me', () => {
  beforeEach(async () => {
    vi.resetModules()
    vi.doMock('../utils/firebaseAuth', () => ({
      getFirebaseConfig: vi.fn().mockResolvedValue({
        projectId: 'test-proj',
        accessToken: 'test-token',
      }),
    }))
  })

  async function makeApp() {
    const { default: router } = await import('./me')
    const app = new Hono<{ Bindings: Env; Variables: { teacherUid: string } }>()
    app.use('*', async (c, next) => {
      c.set('teacherUid', 'teacher-uid-1')
      await next()
    })
    app.route('/', router)
    return app
  }

  const mockNewTeacher = {
    name: 'projects/test-proj/databases/(default)/documents/teachers/teacher-uid-1',
    fields: {
      uid: { stringValue: 'teacher-uid-1' },
      displayName: { stringValue: 'Herr Müller' },
      email: { stringValue: 'mueller@mvl-gym.de' },
      schoolId: { stringValue: 'mvl' },
      classIds: { arrayValue: { values: [] } },
      theme: { stringValue: 'dark' },
      createdAt: { stringValue: '2026-04-01T00:00:00.000Z' },
    },
  }

  it('creates teacher profile and returns 201', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response('', { status: 404 })) // fsGet → not found
      .mockResolvedValueOnce(new Response(JSON.stringify(mockNewTeacher))) // fsPatch → created
    )
    const app = await makeApp()
    const res = await app.fetch(
      new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: 'Herr Müller',
          email: 'mueller@mvl-gym.de',
          theme: 'dark',
        }),
      }),
      mockEnv
    )
    expect(res.status).toBe(201)
    const body = await res.json() as any
    expect(body.displayName).toBe('Herr Müller')
    expect(body.uid).toBe('teacher-uid-1')
  })

  it('returns 400 when displayName is missing', async () => {
    const app = await makeApp()
    const res = await app.fetch(
      new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'mueller@mvl-gym.de' }),
      }),
      mockEnv
    )
    expect(res.status).toBe(400)
  })

  it('returns 409 when teacher profile already exists', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(mockNewTeacher))) // fsGet → already exists
    )
    const app = await makeApp()
    const res = await app.fetch(
      new Request('http://localhost/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: 'Herr Müller', email: 'mueller@mvl-gym.de' }),
      }),
      mockEnv
    )
    expect(res.status).toBe(409)
  })
})
```

- [ ] **Step 2: Run tests to confirm failures**

```bash
cd /c/Users/marco/dev/Seminarkurs/slam-backend
npm test -- --run src/teacher/me.test.ts
```

Expected: 3 new tests FAIL (handler not implemented yet).

- [ ] **Step 3: Add the POST handler** to `src/teacher/me.ts` — insert before `export default router`:

```typescript
router.post('/', async (c) => {
  const teacherUid = c.get('teacherUid')
  const body = await c.req.json<{ displayName?: string; email?: string; theme?: 'dark' | 'light' }>()

  if (!body.displayName?.trim()) {
    return c.json({ success: false, error: 'displayName is required' }, 400)
  }

  const { projectId, accessToken } = await getFirebaseConfig(c.env)

  const existing = await fsGet(projectId, accessToken, `teachers/${teacherUid}`)
  if (existing) {
    return c.json({ success: false, error: 'Teacher profile already exists' }, 409)
  }

  const teacher: TeacherDoc = {
    uid: teacherUid,
    displayName: body.displayName.trim(),
    email: body.email?.trim() ?? '',
    schoolId: 'mvl',
    classIds: [],
    theme: body.theme ?? 'dark',
    createdAt: new Date().toISOString(),
  }

  const result = await fsPatch(
    projectId,
    accessToken,
    `teachers/${teacherUid}`,
    teacher as unknown as Record<string, unknown>
  )
  return c.json(result, 201)
})
```

Also add the missing `fsGet` import — update the import line at the top of `me.ts`:
```typescript
import { fsGet, fsPatch } from '../utils/firestore'
```
(It already has `fsGet` and `fsPatch` — verify they are both present.)

- [ ] **Step 4: Run all tests to confirm green**

```bash
npm test -- --run
```

Expected: `Test Files 8 passed (8)` — same count, all tests pass. (The new 3 POST tests plus the existing 4 ME tests = 7 tests in me.test.ts.)

- [ ] **Step 5: Commit**

```bash
cd /c/Users/marco/dev/Seminarkurs/slam-backend
git add src/teacher/me.ts src/teacher/me.test.ts
git commit -m "feat: add POST /api/teacher/me for onboarding profile creation"
```

---

## File Map (slam-teacher)

```
slam-teacher/
├── src/
│   ├── main.tsx                    # React DOM render, QueryClient, Router, theme init
│   ├── App.tsx                     # Route definitions + FirebaseAuthGuard
│   ├── App.test.tsx                # Auth guard redirect tests
│   ├── firebase.ts                 # Firebase app init, auth export
│   ├── types.ts                    # Shared TS types matching backend shapes
│   ├── store.ts                    # Zustand store (5 UI state slices)
│   ├── store.test.ts               # Store state-transition tests
│   ├── test-setup.ts               # RTL + jest-dom + Firebase mock
│   ├── api/
│   │   ├── client.ts               # apiFetch — auth token injection + error throwing
│   │   ├── client.test.ts          # Bearer header + error propagation tests
│   │   ├── hooks.ts                # All TanStack Query read hooks
│   │   └── mutations.ts            # All TanStack Query write mutations
│   ├── components/
│   │   ├── Layout.tsx              # Sidebar nav + ClassSelector + <Outlet />
│   │   ├── ClassSelector.tsx       # Dropdown to pick active class
│   │   ├── ClassSelector.test.tsx
│   │   ├── DeskTile.tsx            # 108×66 student desk tile (status, name, time)
│   │   ├── DeskTile.test.tsx
│   │   ├── ClassroomGrid.tsx       # CSS grid of DeskTiles with DnD in edit mode
│   │   ├── ClassroomGrid.test.tsx
│   │   ├── AlertPill.tsx           # "N Schüler kämpfen" pill
│   │   ├── AlertPill.test.tsx
│   │   ├── SessionRing.tsx         # SVG circular progress ring (Live Monitor)
│   │   ├── StudentPanel.tsx        # Sliding right panel: AI assessment + feed
│   │   └── StudentPanel.test.tsx
│   └── pages/
│       ├── Login.tsx               # Firebase email/password sign-in
│       ├── Onboarding.tsx          # 3-step first-login wizard
│       ├── Onboarding.test.tsx
│       ├── Klassenraum.tsx         # §7.1 classroom grid home
│       ├── Klassenraum.test.tsx
│       ├── LiveMonitor.tsx         # §7.2 polling + session ring + beamer mode
│       ├── LiveMonitor.test.tsx
│       ├── Analytik.tsx            # §7.3 summary cards + topic bar chart
│       ├── Analytik.test.tsx
│       ├── Schueler.tsx            # §7.4 roster table + StudentPanel
│       ├── Schueler.test.tsx
│       ├── Lernziele.tsx           # §7.5 topic picker tree + exam date + save
│       ├── Lernziele.test.tsx
│       ├── Einstellungen.tsx       # §7.6 profile + theme + class mgmt + invite
│       └── Einstellungen.test.tsx
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tsconfig.node.json
├── tailwind.config.ts
├── postcss.config.js
├── .env.example
└── package.json
```

---

## Task 1: Project Scaffold

**Files:** All config + entry files listed above.

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "slam-teacher",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest"
  },
  "dependencies": {
    "@dnd-kit/core": "^6.1.0",
    "@dnd-kit/utilities": "^3.2.2",
    "@tanstack/react-query": "^5.56.2",
    "firebase": "^10.13.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.2",
    "zustand": "^5.0.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.0.1",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.20",
    "jsdom": "^25.0.1",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.13",
    "typescript": "^5.5.3",
    "vite": "^5.4.8",
    "vitest": "^2.1.1"
  }
}
```

- [ ] **Step 2: Write `vite.config.ts`**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    env: {
      VITE_API_URL: 'http://localhost:8787',
      VITE_FIREBASE_API_KEY: 'test-key',
      VITE_FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com',
      VITE_FIREBASE_PROJECT_ID: 'test-proj',
    },
  },
})
```

- [ ] **Step 3: Write `tsconfig.json`**

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.app.json" }
  ]
}
```

Write `tsconfig.app.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

Write `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 4: Write `tailwind.config.ts`**

```typescript
import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'room-bg': '#101828',
        'page-bg': '#0d1117',
      },
    },
  },
  plugins: [],
} satisfies Config
```

Write `postcss.config.js`:

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 5: Write `index.html`**

```html
<!doctype html>
<html lang="de" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Learn Smart – Lehrerpanel</title>
  </head>
  <body class="bg-[#0d1117] text-white font-sans antialiased">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Write `.env.example`**

```
VITE_API_URL=http://localhost:8787
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
```

- [ ] **Step 7: Write `src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 8: Write smoke-test `src/App.test.tsx`** (minimal — just checks React renders)

```typescript
import { describe, it, expect } from 'vitest'

describe('smoke test', () => {
  it('1 + 1 equals 2', () => {
    expect(1 + 1).toBe(2)
  })
})
```

- [ ] **Step 9: Write `src/test-setup.ts`**

```typescript
import '@testing-library/jest-dom'
import { vi } from 'vitest'

vi.mock('./firebase', () => ({
  auth: {
    currentUser: {
      uid: 'teacher-uid-1',
      email: 'mueller@mvl-gym.de',
      getIdToken: vi.fn().mockResolvedValue('mock-token'),
    },
    onAuthStateChanged: vi.fn((callback: (user: object | null) => void) => {
      callback({ uid: 'teacher-uid-1', email: 'mueller@mvl-gym.de' })
      return vi.fn() // unsubscribe
    }),
  },
}))
```

- [ ] **Step 10: Write `src/main.tsx`** (minimal — will be expanded in later tasks)

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div>slam-teacher</div>
  </React.StrictMode>
)
```

- [ ] **Step 11: Install dependencies**

```bash
cd /c/Users/marco/dev/Seminarkurs/slam-teacher
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 12: Initialize shadcn/ui**

```bash
npx shadcn@latest init
```

When prompted, choose:
- Style: Default
- Base color: Slate
- CSS variables: yes
- Tailwind config: `tailwind.config.ts`
- Components alias: `@/components`
- Utils alias: `@/lib/utils`

Then add the components needed throughout the app:

```bash
npx shadcn@latest add button input label dialog select table badge
```

These create files in `src/components/ui/`.

- [ ] **Step 13: Run the smoke test**

```bash
npm test -- --run
```

Expected: `Tests 1 passed (1)`.

- [ ] **Step 14: Commit**

```bash
git add -A
git commit -m "feat: scaffold slam-teacher Vite + React + TS + Tailwind + shadcn/ui"
```

---

## Task 2: TypeScript Types + Firebase Init + Zustand Store

**Files:**
- Create: `src/types.ts`
- Create: `src/firebase.ts`
- Create: `src/store.ts`
- Create: `src/store.test.ts`

- [ ] **Step 1: Write `src/types.ts`**

```typescript
export interface ClassDoc {
  id: string
  name: string
  teacherId: string
  schoolId: string
  studentIds: string[]
  gridConfig: { rows: number; cols: number }
  deskPositions: Record<string, { col: number; row: number }>
  createdAt: string
  updatedAt: string
}

export interface TeacherDoc {
  uid: string
  displayName: string
  email: string
  schoolId: string
  classIds: string[]
  theme: 'dark' | 'light'
  createdAt: string
}

export interface ClassGoalDoc {
  classId: string
  teacherId: string
  topics: Array<{ leitidee: string; thema: string; unterthema: string }>
  examDate: string | null
  setAt: string
}

export interface StudentSummary {
  uid: string
  displayName: string
  email: string
  lastActive: string | null
  accuracy7d: number
  streak: number
  totalXp: number
  status: 'active' | 'idle' | 'struggling' | 'offline'
  currentTopic: string | null
  sessionProgress: { answered: number; total: number } | null
}

export interface TopicAccuracy {
  leitidee: string
  thema: string
  unterthema: string
  correct: number
  incorrect: number
  accuracyPct: number
  isWissensluecke: boolean
}

export interface FeedEntry {
  userId: string
  displayName: string
  questionText: string
  studentAnswer: string
  isCorrect: boolean
  feedback: string
  hintsUsed: number
  timeSpentSeconds: number
  timestamp: number
  leitidee: string
  thema: string
  unterthema: string
}

export interface AnalyticsSummary {
  questionsToday: number
  questionsThisWeek: number
  classAverageAccuracy: number
  avgDailyStreak: number
  activeStudentsToday: number
}

export interface AnalyticsResponse {
  summary: AnalyticsSummary
  topics: TopicAccuracy[]
}

export interface FeedResponse {
  entries: FeedEntry[]
}
```

- [ ] **Step 2: Write `src/firebase.ts`**

```typescript
import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
```

- [ ] **Step 3: Write failing store tests** in `src/store.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { useStore } from './store'

describe('useStore', () => {
  beforeEach(() => {
    useStore.setState({
      selectedClassId: null,
      beamerMode: false,
      theme: 'dark',
      activePanelStudentId: null,
      editMode: false,
    })
  })

  it('starts with no selected class', () => {
    expect(useStore.getState().selectedClassId).toBeNull()
  })

  it('setSelectedClassId updates selectedClassId', () => {
    useStore.getState().setSelectedClassId('class-abc')
    expect(useStore.getState().selectedClassId).toBe('class-abc')
  })

  it('setBeamerMode enables beamer mode', () => {
    useStore.getState().setBeamerMode(true)
    expect(useStore.getState().beamerMode).toBe(true)
  })

  it('setTheme switches to light', () => {
    useStore.getState().setTheme('light')
    expect(useStore.getState().theme).toBe('light')
  })

  it('setActivePanelStudentId sets the active student', () => {
    useStore.getState().setActivePanelStudentId('student-xyz')
    expect(useStore.getState().activePanelStudentId).toBe('student-xyz')
  })

  it('setEditMode activates edit mode', () => {
    useStore.getState().setEditMode(true)
    expect(useStore.getState().editMode).toBe(true)
  })
})
```

- [ ] **Step 4: Run tests to confirm failures**

```bash
npm test -- --run src/store.test.ts
```

Expected: FAIL — "Cannot find module './store'".

- [ ] **Step 5: Write `src/store.ts`**

```typescript
import { create } from 'zustand'

interface AppState {
  selectedClassId: string | null
  beamerMode: boolean
  theme: 'dark' | 'light'
  activePanelStudentId: string | null
  editMode: boolean
  setSelectedClassId: (id: string | null) => void
  setBeamerMode: (v: boolean) => void
  setTheme: (v: 'dark' | 'light') => void
  setActivePanelStudentId: (id: string | null) => void
  setEditMode: (v: boolean) => void
}

export const useStore = create<AppState>((set) => ({
  selectedClassId: null,
  beamerMode: false,
  theme: 'dark',
  activePanelStudentId: null,
  editMode: false,
  setSelectedClassId: (id) => set({ selectedClassId: id }),
  setBeamerMode: (v) => set({ beamerMode: v }),
  setTheme: (v) => set({ theme: v }),
  setActivePanelStudentId: (id) => set({ activePanelStudentId: id }),
  setEditMode: (v) => set({ editMode: v }),
}))
```

- [ ] **Step 6: Run tests to confirm passing**

```bash
npm test -- --run src/store.test.ts
```

Expected: `Tests 6 passed (6)`.

- [ ] **Step 7: Commit**

```bash
git add src/types.ts src/firebase.ts src/store.ts src/store.test.ts
git commit -m "feat: add types, firebase init, and zustand store"
```

---

## Task 3: API Client

**Files:**
- Create: `src/api/client.ts`
- Create: `src/api/client.test.ts`

- [ ] **Step 1: Write failing tests** in `src/api/client.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Firebase mock is provided globally by test-setup.ts — auth.currentUser.getIdToken()
// resolves to 'mock-token'. VITE_API_URL is 'http://localhost:8787' from vite.config.ts test.env.

describe('apiFetch', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('sends Bearer token in Authorization header', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    )
    vi.stubGlobal('fetch', fetchSpy)

    const { apiFetch } = await import('./client')
    await apiFetch('/api/test')

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:8787/api/test',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer mock-token',
        }),
      })
    )
  })

  it('throws with error message when response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
    ))

    const { apiFetch } = await import('./client')
    await expect(apiFetch('/api/restricted')).rejects.toThrow('Forbidden')
  })

  it('returns undefined for 204 No Content responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(null, { status: 204 })
    ))

    const { apiFetch } = await import('./client')
    const result = await apiFetch('/api/deleted')
    expect(result).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to confirm failures**

```bash
npm test -- --run src/api/client.test.ts
```

Expected: FAIL — "Cannot find module './client'".

- [ ] **Step 3: Write `src/api/client.ts`**

```typescript
import { auth } from '../firebase'

const API_URL = import.meta.env.VITE_API_URL as string

export async function apiFetch<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const user = auth.currentUser
  if (!user) throw new Error('Not authenticated')

  const token = await user.getIdToken()

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options?.headers ?? {}),
    },
  })

  if (res.status === 204) return undefined as T

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }

  return res.json() as Promise<T>
}
```

- [ ] **Step 4: Run tests to confirm passing**

```bash
npm test -- --run src/api/client.test.ts
```

Expected: `Tests 3 passed (3)`.

- [ ] **Step 5: Commit**

```bash
git add src/api/client.ts src/api/client.test.ts
git commit -m "feat: add authenticated API client"
```

---

## Task 4: TanStack Query Hooks

**Files:**
- Create: `src/api/hooks.ts`
- Create: `src/api/mutations.ts`

No separate test file for hooks — integration tested through page components in later tasks. Hooks are thin wrappers over `apiFetch`; the logic under test is in the components that use them.

- [ ] **Step 1: Write `src/api/hooks.ts`**

```typescript
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from './client'
import type {
  TeacherDoc,
  ClassDoc,
  StudentSummary,
  AnalyticsResponse,
  FeedResponse,
} from '../types'

export function useTeacher() {
  return useQuery({
    queryKey: ['teacher', 'me'],
    queryFn: () => apiFetch<TeacherDoc>('/api/teacher/me'),
    retry: false,
  })
}

export function useClasses(classIds: string[]) {
  return useQuery({
    queryKey: ['classes', classIds],
    queryFn: async () => {
      const results = await Promise.all(
        classIds.map((id) => apiFetch<ClassDoc>(`/api/teacher/class/${id}`))
      )
      return results
    },
    enabled: classIds.length > 0,
  })
}

export function useStudents(classId: string | null, refetchInterval = 30_000) {
  return useQuery({
    queryKey: ['students', classId],
    queryFn: () => apiFetch<StudentSummary[]>(`/api/teacher/class/${classId}/students`),
    enabled: !!classId,
    refetchInterval,
  })
}

export function useAnalytics(classId: string | null) {
  return useQuery({
    queryKey: ['analytics', classId],
    queryFn: () => apiFetch<AnalyticsResponse>(`/api/teacher/class/${classId}/analytics`),
    enabled: !!classId,
    staleTime: 60_000,
  })
}

export function useClassFeed(classId: string | null) {
  return useQuery({
    queryKey: ['feed', classId],
    queryFn: () => apiFetch<FeedResponse>(`/api/teacher/class/${classId}/feed`),
    enabled: !!classId,
  })
}

export function useAiAssessment(userId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ['ai-assessment', userId],
    queryFn: () =>
      apiFetch<{ assessment: string; generatedAt: string }>(
        `/api/teacher/student/${userId}/ai-assessment`,
        { method: 'POST' }
      ),
    enabled: !!userId && enabled,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}
```

- [ ] **Step 2: Write `src/api/mutations.ts`**

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from './client'
import type { ClassDoc, TeacherDoc, ClassGoalDoc } from '../types'

export function useCreateTeacher() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { displayName: string; email: string; theme: 'dark' | 'light' }) =>
      apiFetch<TeacherDoc>('/api/teacher/me', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (data) => {
      qc.setQueryData(['teacher', 'me'], data)
    },
  })
}

export function useUpdateTeacher() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { displayName?: string; theme?: 'dark' | 'light' }) =>
      apiFetch<TeacherDoc>('/api/teacher/me', { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: (data) => {
      qc.setQueryData(['teacher', 'me'], data)
    },
  })
}

export function useCreateClass() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; gridConfig?: { rows: number; cols: number } }) =>
      apiFetch<ClassDoc>('/api/teacher/class', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher', 'me'] })
    },
  })
}

export function useUpdateClass(classId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      name?: string
      gridConfig?: { rows: number; cols: number }
      deskPositions?: Record<string, { col: number; row: number }>
    }) =>
      apiFetch<ClassDoc>(`/api/teacher/class/${classId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students', classId] })
    },
  })
}

export function useDeleteClass() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (classId: string) =>
      apiFetch(`/api/teacher/class/${classId}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teacher', 'me'] })
    },
  })
}

export function useAddStudents(classId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (studentIds: string[]) =>
      apiFetch<ClassDoc>(`/api/teacher/class/${classId}/students`, {
        method: 'POST',
        body: JSON.stringify({ studentIds }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students', classId] })
    },
  })
}

export function useRemoveStudent(classId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch(`/api/teacher/class/${classId}/students/${userId}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students', classId] })
    },
  })
}

export function useInviteStudent() {
  return useMutation({
    mutationFn: (data: { email: string; displayName?: string }) =>
      apiFetch<{ uid: string; email: string }>('/api/teacher/student/invite', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (email: string) =>
      apiFetch('/api/teacher/student/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
  })
}

export function useSetGoal(classId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      topics: Array<{ leitidee: string; thema: string; unterthema: string }>
      examDate: string | null
    }) =>
      apiFetch<ClassGoalDoc>(`/api/teacher/class/${classId}/goal`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['analytics', classId] })
    },
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add src/api/hooks.ts src/api/mutations.ts
git commit -m "feat: add TanStack Query hooks and mutations"
```

---

## Task 5: App Router + Login Page + Auth Guard

**Files:**
- Create: `src/pages/Login.tsx`
- Modify: `src/main.tsx`
- Create: `src/App.tsx`
- Modify: `src/App.test.tsx`

- [ ] **Step 1: Write failing test** for auth guard in `src/App.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Auth mock from test-setup.ts already provides a logged-in user.
// Override for the "no user" case inline where needed.

vi.mock('./api/hooks', () => ({
  useTeacher: vi.fn().mockReturnValue({
    data: {
      uid: 'teacher-uid-1',
      displayName: 'Frau Müller',
      email: 'mueller@mvl-gym.de',
      schoolId: 'mvl',
      classIds: ['class-1'],
      theme: 'dark',
      createdAt: '2026-01-01T00:00:00Z',
    },
    isLoading: false,
    isError: false,
  }),
}))

vi.mock('./store', () => ({
  useStore: vi.fn((selector: (s: object) => unknown) =>
    selector({
      selectedClassId: 'class-1',
      setSelectedClassId: vi.fn(),
      setTheme: vi.fn(),
    })
  ),
}))

// Stub @tanstack/react-query so QueryClient isn't needed in tests
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>()
  return {
    ...actual,
    QueryClientProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    QueryClient: class {},
  }
})

import { App } from './App'

describe('App routing', () => {
  it('renders Klassenraum page at /', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    )
    expect(screen.getByText('Klassenraum')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to confirm failure**

```bash
npm test -- --run src/App.test.tsx
```

Expected: FAIL — "Cannot find module './App'".

- [ ] **Step 3: Write `src/pages/Login.tsx`**

```typescript
import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Anmeldung fehlgeschlagen')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
      <div className="w-full max-w-sm p-8 bg-[#101828] rounded-xl border border-slate-800">
        <h1 className="text-2xl font-bold text-white mb-6">Learn Smart</h1>
        <p className="text-slate-400 mb-6 text-sm">Anmeldung für Lehrkräfte</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@mvl-gym.de"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Passwort</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? 'Anmelden…' : 'Anmelden'}
          </Button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Write `src/App.tsx`**

```typescript
import { useEffect, useState } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from './firebase'
import { useStore } from './store'
import { useTeacher } from './api/hooks'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Onboarding } from './pages/Onboarding'
import { Klassenraum } from './pages/Klassenraum'
import { LiveMonitor } from './pages/LiveMonitor'
import { Analytik } from './pages/Analytik'
import { Schueler } from './pages/Schueler'
import { Lernziele } from './pages/Lernziele'
import { Einstellungen } from './pages/Einstellungen'

function AuthenticatedApp() {
  const { data: teacher, isLoading, isError } = useTeacher()
  const setTheme = useStore((s) => s.setTheme)
  const setSelectedClassId = useStore((s) => s.setSelectedClassId)

  useEffect(() => {
    if (teacher) {
      setTheme(teacher.theme)
      document.documentElement.classList.toggle('dark', teacher.theme === 'dark')
      if (teacher.classIds.length > 0) {
        setSelectedClassId(teacher.classIds[0])
      }
    }
  }, [teacher, setTheme, setSelectedClassId])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <p className="text-slate-400">Laden…</p>
      </div>
    )
  }

  // 404 from /api/teacher/me means first login → onboarding
  if (isError) {
    return <Onboarding />
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Klassenraum />} />
        <Route path="monitor" element={<LiveMonitor />} />
        <Route path="analytik" element={<Analytik />} />
        <Route path="schueler" element={<Schueler />} />
        <Route path="lernziele" element={<Lernziele />} />
        <Route path="einstellungen" element={<Einstellungen />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function FirebaseAuthGuard() {
  const [user, setUser] = useState<User | null | 'loading'>('loading')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u))
    return unsub
  }, [])

  if (user === 'loading') {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <p className="text-slate-400">Laden…</p>
      </div>
    )
  }

  if (!user) return <Login />
  return <AuthenticatedApp />
}

export function App() {
  return (
    <Routes>
      <Route path="*" element={<FirebaseAuthGuard />} />
    </Routes>
  )
}
```

- [ ] **Step 5: Create stub pages** so imports in App.tsx don't fail. Create each with a minimal export:

`src/pages/Onboarding.tsx`:
```typescript
export function Onboarding() {
  return <div>Onboarding</div>
}
```

`src/pages/Klassenraum.tsx`:
```typescript
export function Klassenraum() {
  return <div>Klassenraum</div>
}
```

`src/pages/LiveMonitor.tsx`:
```typescript
export function LiveMonitor() {
  return <div>Live Monitor</div>
}
```

`src/pages/Analytik.tsx`:
```typescript
export function Analytik() {
  return <div>Analytik</div>
}
```

`src/pages/Schueler.tsx`:
```typescript
export function Schueler() {
  return <div>Schüler</div>
}
```

`src/pages/Lernziele.tsx`:
```typescript
export function Lernziele() {
  return <div>Lernziele</div>
}
```

`src/pages/Einstellungen.tsx`:
```typescript
export function Einstellungen() {
  return <div>Einstellungen</div>
}
```

`src/components/Layout.tsx`:
```typescript
import { Outlet } from 'react-router-dom'
export function Layout() {
  return <Outlet />
}
```

- [ ] **Step 6: Update `src/main.tsx`**

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { App } from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)
```

- [ ] **Step 7: Run tests**

```bash
npm test -- --run
```

Expected: `Tests passed` (all previous tests + App test).

- [ ] **Step 8: Commit**

```bash
git add src/App.tsx src/App.test.tsx src/main.tsx src/pages/ src/components/Layout.tsx
git commit -m "feat: add app router, login page, and auth guard"
```

---

## Task 6: Navigation Layout (Sidebar + ClassSelector)

**Files:**
- Modify: `src/components/Layout.tsx`
- Create: `src/components/ClassSelector.tsx`
- Create: `src/components/ClassSelector.test.tsx`

- [ ] **Step 1: Write failing test** in `src/components/ClassSelector.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ClassSelector } from './ClassSelector'
import type { TeacherDoc } from '../types'

const mockTeacher: TeacherDoc = {
  uid: 'teacher-1',
  displayName: 'Frau Müller',
  email: 'mueller@mvl-gym.de',
  schoolId: 'mvl',
  classIds: ['cls-1', 'cls-2'],
  theme: 'dark',
  createdAt: '2026-01-01T00:00:00Z',
}

vi.mock('../api/hooks', () => ({
  useTeacher: vi.fn().mockReturnValue({ data: mockTeacher }),
  useStudents: vi.fn().mockReturnValue({ data: [] }),
}))

vi.mock('../store', () => {
  let selectedClassId = 'cls-1'
  return {
    useStore: vi.fn((selector: (s: object) => unknown) =>
      selector({
        selectedClassId,
        setSelectedClassId: vi.fn((id: string) => { selectedClassId = id }),
      })
    ),
  }
})

// Firestore class names fetched via useClasses — mock it
vi.mock('../api/hooks', () => ({
  useTeacher: vi.fn().mockReturnValue({ data: mockTeacher }),
  useClasses: vi.fn().mockReturnValue({
    data: [
      { id: 'cls-1', name: '11a' },
      { id: 'cls-2', name: '11b' },
    ],
  }),
}))

describe('ClassSelector', () => {
  it('shows the currently selected class name', () => {
    render(<ClassSelector />)
    expect(screen.getByText('11a')).toBeInTheDocument()
  })

  it('lists all teacher classes as options', async () => {
    render(<ClassSelector />)
    await userEvent.click(screen.getByRole('combobox'))
    expect(screen.getByText('11b')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to confirm failure**

```bash
npm test -- --run src/components/ClassSelector.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Write `src/components/ClassSelector.tsx`**

```typescript
import { useTeacher, useClasses } from '../api/hooks'
import { useStore } from '../store'

export function ClassSelector() {
  const { data: teacher } = useTeacher()
  const { data: classes } = useClasses(teacher?.classIds ?? [])
  const selectedClassId = useStore((s) => s.selectedClassId)
  const setSelectedClassId = useStore((s) => s.setSelectedClassId)

  if (!classes || classes.length === 0) return null

  return (
    <select
      role="combobox"
      value={selectedClassId ?? ''}
      onChange={(e) => setSelectedClassId(e.target.value)}
      className="w-full bg-[#0d1117] text-white border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
    >
      {classes.map((cls) => (
        <option key={cls.id} value={cls.id}>
          {cls.name}
        </option>
      ))}
    </select>
  )
}
```

- [ ] **Step 4: Write the full `src/components/Layout.tsx`**

```typescript
import { Outlet, NavLink } from 'react-router-dom'
import { ClassSelector } from './ClassSelector'

const NAV_ITEMS = [
  { to: '/', label: 'Klassenraum', icon: '🏫', end: true },
  { to: '/monitor', label: 'Live Monitor', icon: '📡' },
  { to: '/analytik', label: 'Analytik', icon: '📊' },
  { to: '/schueler', label: 'Schüler', icon: '👤' },
  { to: '/lernziele', label: 'Lernziele', icon: '🎯' },
  { to: '/einstellungen', label: 'Einstellungen', icon: '⚙' },
] as const

export function Layout() {
  return (
    <div className="flex min-h-screen bg-[#0d1117]">
      {/* Sidebar */}
      <aside className="w-56 flex-none bg-[#101828] border-r border-slate-800 flex flex-col">
        {/* Class selector */}
        <div className="p-4 border-b border-slate-800">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Klasse</p>
          <ClassSelector />
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-4">
          {NAV_ITEMS.map(({ to, label, icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={'end' in { end } ? end : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'text-white bg-blue-600/20 border-r-2 border-blue-500'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`
              }
            >
              <span>{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
```

- [ ] **Step 5: Run tests**

```bash
npm test -- --run src/components/ClassSelector.test.tsx
```

Expected: `Tests 2 passed (2)`.

- [ ] **Step 6: Commit**

```bash
git add src/components/Layout.tsx src/components/ClassSelector.tsx src/components/ClassSelector.test.tsx
git commit -m "feat: add sidebar layout and class selector"
```

---

## Task 7: Onboarding Wizard

**Files:**
- Modify: `src/pages/Onboarding.tsx`
- Create: `src/pages/Onboarding.test.tsx`

- [ ] **Step 1: Write failing tests** in `src/pages/Onboarding.test.tsx`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const mockCreateTeacher = vi.fn()
const mockCreateClass = vi.fn()
const mockInviteStudent = vi.fn()

vi.mock('../api/mutations', () => ({
  useCreateTeacher: vi.fn(() => ({
    mutateAsync: mockCreateTeacher.mockResolvedValue({
      uid: 'teacher-1',
      displayName: 'Frau Müller',
      classIds: [],
    }),
    isPending: false,
  })),
  useCreateClass: vi.fn(() => ({
    mutateAsync: mockCreateClass.mockResolvedValue({ id: 'cls-1', name: '11a' }),
    isPending: false,
  })),
  useInviteStudent: vi.fn(() => ({
    mutateAsync: mockInviteStudent.mockResolvedValue({ uid: 'stu-1', email: 'anna@mvl-gym.de' }),
    isPending: false,
  })),
  useAddStudents: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  })),
}))

vi.mock('../store', () => ({
  useStore: vi.fn((selector: (s: object) => unknown) =>
    selector({
      setSelectedClassId: vi.fn(),
      setTheme: vi.fn(),
    })
  ),
}))

import { Onboarding } from './Onboarding'

describe('Onboarding wizard', () => {
  beforeEach(() => {
    mockCreateTeacher.mockClear()
    mockCreateClass.mockClear()
    mockInviteStudent.mockClear()
  })

  it('shows step 1 Willkommen on mount', () => {
    render(<Onboarding />)
    expect(screen.getByText('Willkommen')).toBeInTheDocument()
    expect(screen.getByLabelText('Anzeigename')).toBeInTheDocument()
  })

  it('advances to step 2 after entering display name', async () => {
    render(<Onboarding />)
    await userEvent.type(screen.getByLabelText('Anzeigename'), 'Frau Müller')
    await userEvent.click(screen.getByRole('button', { name: /weiter/i }))
    expect(screen.getByText('Klasse erstellen')).toBeInTheDocument()
  })

  it('step 2 shows class name and grid config inputs', async () => {
    render(<Onboarding />)
    await userEvent.type(screen.getByLabelText('Anzeigename'), 'Frau Müller')
    await userEvent.click(screen.getByRole('button', { name: /weiter/i }))
    expect(screen.getByLabelText('Klassenname')).toBeInTheDocument()
    expect(screen.getByLabelText('Reihen')).toBeInTheDocument()
    expect(screen.getByLabelText('Spalten')).toBeInTheDocument()
  })

  it('calls createTeacher + createClass on finish', async () => {
    render(<Onboarding />)
    await userEvent.type(screen.getByLabelText('Anzeigename'), 'Frau Müller')
    await userEvent.click(screen.getByRole('button', { name: /weiter/i }))
    await userEvent.type(screen.getByLabelText('Klassenname'), '11a')
    await userEvent.click(screen.getByRole('button', { name: /weiter/i }))
    // Step 3 — skip students
    await userEvent.click(screen.getByRole('button', { name: /fertig/i }))
    await waitFor(() => expect(mockCreateTeacher).toHaveBeenCalledOnce())
    await waitFor(() => expect(mockCreateClass).toHaveBeenCalledWith(
      expect.objectContaining({ name: '11a' })
    ))
  })
})
```

- [ ] **Step 2: Run test to confirm failure**

```bash
npm test -- --run src/pages/Onboarding.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Write `src/pages/Onboarding.tsx`**

```typescript
import { useState } from 'react'
import { auth } from '../firebase'
import { useStore } from '../store'
import {
  useCreateTeacher,
  useCreateClass,
  useInviteStudent,
  useAddStudents,
} from '../api/mutations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Theme = 'dark' | 'light'

export function Onboarding() {
  const [step, setStep] = useState(1)
  const [displayName, setDisplayName] = useState('')
  const [theme, setThemeState] = useState<Theme>('dark')
  const [className, setClassName] = useState('')
  const [rows, setRows] = useState(4)
  const [cols, setCols] = useState(5)
  const [emailsRaw, setEmailsRaw] = useState('')
  const [error, setError] = useState<string | null>(null)

  const setStoreTheme = useStore((s) => s.setTheme)
  const setSelectedClassId = useStore((s) => s.setSelectedClassId)

  const createTeacher = useCreateTeacher()
  const createClass = useCreateClass()
  const inviteStudent = useInviteStudent()
  const addStudents = useAddStudents('')  // classId filled in at finish

  async function handleFinish() {
    setError(null)
    try {
      const user = auth.currentUser!
      await createTeacher.mutateAsync({
        displayName: displayName.trim(),
        email: user.email ?? '',
        theme,
      })

      const cls = await createClass.mutateAsync({
        name: className.trim(),
        gridConfig: { rows, cols },
      })

      const emails = emailsRaw
        .split('\n')
        .map((e) => e.trim())
        .filter((e) => e.length > 0)

      const addStudentsMutation = useAddStudents(cls.id)
      const invitedUids: string[] = []
      for (const email of emails) {
        try {
          const result = await inviteStudent.mutateAsync({ email })
          invitedUids.push(result.uid)
        } catch {
          // skip failed invites silently
        }
      }

      if (invitedUids.length > 0) {
        await addStudentsMutation.mutateAsync(invitedUids)
      }

      setStoreTheme(theme)
      document.documentElement.classList.toggle('dark', theme === 'dark')
      setSelectedClassId(cls.id)
    } catch (err: unknown) {
      setError((err as Error).message)
    }
  }

  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-8">
      <div className="w-full max-w-md bg-[#101828] rounded-xl border border-slate-800 p-8">
        {/* Progress indicator */}
        <div className="flex gap-2 mb-8">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                n <= step ? 'bg-blue-500' : 'bg-slate-700'
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <Step1
            displayName={displayName}
            theme={theme}
            onDisplayNameChange={setDisplayName}
            onThemeChange={setThemeState}
            onNext={() => {
              if (!displayName.trim()) return
              setStep(2)
            }}
          />
        )}

        {step === 2 && (
          <Step2
            className={className}
            rows={rows}
            cols={cols}
            onClassNameChange={setClassName}
            onRowsChange={setRows}
            onColsChange={setCols}
            onNext={() => {
              if (!className.trim()) return
              setStep(3)
            }}
          />
        )}

        {step === 3 && (
          <Step3
            emailsRaw={emailsRaw}
            onEmailsChange={setEmailsRaw}
            onFinish={handleFinish}
            isPending={createTeacher.isPending || createClass.isPending}
          />
        )}

        {error && <p className="mt-4 text-red-400 text-sm">{error}</p>}
      </div>
    </div>
  )
}

function Step1({
  displayName, theme, onDisplayNameChange, onThemeChange, onNext,
}: {
  displayName: string; theme: 'dark' | 'light'
  onDisplayNameChange: (v: string) => void; onThemeChange: (v: 'dark' | 'light') => void
  onNext: () => void
}) {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold text-white">Willkommen</h2>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="displayName">Anzeigename</Label>
        <Input
          id="displayName"
          value={displayName}
          onChange={(e) => onDisplayNameChange(e.target.value)}
          placeholder="z.B. Frau Müller"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Design</Label>
        <div className="flex gap-3">
          {(['dark', 'light'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onThemeChange(t)}
              className={`flex-1 py-2 rounded-lg border text-sm transition-colors ${
                theme === t
                  ? 'border-blue-500 bg-blue-600/20 text-white'
                  : 'border-slate-700 text-slate-400 hover:border-slate-500'
              }`}
            >
              {t === 'dark' ? 'Dunkel' : 'Hell'}
            </button>
          ))}
        </div>
      </div>
      <Button onClick={onNext} disabled={!displayName.trim()}>Weiter</Button>
    </div>
  )
}

function Step2({
  className, rows, cols, onClassNameChange, onRowsChange, onColsChange, onNext,
}: {
  className: string; rows: number; cols: number
  onClassNameChange: (v: string) => void; onRowsChange: (v: number) => void
  onColsChange: (v: number) => void; onNext: () => void
}) {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold text-white">Klasse erstellen</h2>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="className">Klassenname</Label>
        <Input
          id="className"
          value={className}
          onChange={(e) => onClassNameChange(e.target.value)}
          placeholder="z.B. 11a"
        />
      </div>
      <div className="flex gap-4">
        <div className="flex flex-col gap-1.5 flex-1">
          <Label htmlFor="rows">Reihen</Label>
          <Input
            id="rows"
            type="number"
            min={1}
            max={8}
            value={rows}
            onChange={(e) => onRowsChange(Number(e.target.value))}
          />
        </div>
        <div className="flex flex-col gap-1.5 flex-1">
          <Label htmlFor="cols">Spalten</Label>
          <Input
            id="cols"
            type="number"
            min={1}
            max={8}
            value={cols}
            onChange={(e) => onColsChange(Number(e.target.value))}
          />
        </div>
      </div>
      <Button onClick={onNext} disabled={!className.trim()}>Weiter</Button>
    </div>
  )
}

function Step3({
  emailsRaw, onEmailsChange, onFinish, isPending,
}: {
  emailsRaw: string; onEmailsChange: (v: string) => void
  onFinish: () => void; isPending: boolean
}) {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-2xl font-bold text-white">Schüler hinzufügen</h2>
      <p className="text-slate-400 text-sm">
        Eine E-Mail-Adresse pro Zeile. Schüler erhalten eine Einrichtungs-E-Mail.
      </p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="emails">E-Mail-Adressen</Label>
        <textarea
          id="emails"
          value={emailsRaw}
          onChange={(e) => onEmailsChange(e.target.value)}
          placeholder="anna.mueller@mvl-gym.de&#10;ben.schmidt@mvl-gym.de"
          rows={6}
          className="w-full bg-[#0d1117] text-white border border-slate-700 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-blue-500"
        />
      </div>
      <Button onClick={onFinish} disabled={isPending}>
        {isPending ? 'Wird gespeichert…' : 'Fertig'}
      </Button>
    </div>
  )
}
```

**Note:** The `useAddStudents(cls.id)` call inside `handleFinish` won't work as a hook inside a non-hook function. Fix: call `useAddStudents` with a state variable `classId` or use `useMutation` directly. Update `handleFinish` to use `addStudents` correctly:

The simplest fix is to use a ref or pass `classId` to a pre-created mutation. Replace the `useAddStudents('')` and `addStudentsMutation` calls in the component with a pattern that calls the API directly:

```typescript
// Replace the addStudents mutation and its usage with direct apiFetch:
import { apiFetch } from '../api/client'

// Inside handleFinish, replace addStudentsMutation call with:
if (invitedUids.length > 0) {
  await apiFetch(`/api/teacher/class/${cls.id}/students`, {
    method: 'POST',
    body: JSON.stringify({ studentIds: invitedUids }),
  })
}
```

Remove the `useAddStudents` import and call entirely from the component.

- [ ] **Step 4: Run tests**

```bash
npm test -- --run src/pages/Onboarding.test.tsx
```

Expected: `Tests 4 passed (4)`.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Onboarding.tsx src/pages/Onboarding.test.tsx
git commit -m "feat: add 3-step onboarding wizard"
```

---

## Task 8: DeskTile + AlertPill + SessionRing

**Files:**
- Modify: `src/pages/Klassenraum.tsx` (add stub content)
- Create: `src/components/DeskTile.tsx`
- Create: `src/components/DeskTile.test.tsx`
- Create: `src/components/AlertPill.tsx`
- Create: `src/components/AlertPill.test.tsx`
- Create: `src/components/SessionRing.tsx`

- [ ] **Step 1: Write failing DeskTile tests** in `src/components/DeskTile.test.tsx`

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DeskTile } from './DeskTile'
import type { StudentSummary } from '../types'

const baseStudent: StudentSummary = {
  uid: 'stu-1',
  displayName: 'Anna Müller',
  email: 'anna@mvl-gym.de',
  lastActive: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
  accuracy7d: 80,
  streak: 5,
  totalXp: 1200,
  status: 'active',
  currentTopic: 'Ableitungen',
  sessionProgress: null,
}

describe('DeskTile', () => {
  it('renders student name', () => {
    render(<DeskTile student={baseStudent} />)
    expect(screen.getByText('Anna Müller')).toBeInTheDocument()
  })

  it('shows "Aktiv" label for active status', () => {
    render(<DeskTile student={baseStudent} />)
    expect(screen.getByText('Aktiv')).toBeInTheDocument()
  })

  it('shows "Kämpft" label for struggling status', () => {
    render(<DeskTile student={{ ...baseStudent, status: 'struggling' }} />)
    expect(screen.getByText('Kämpft')).toBeInTheDocument()
  })

  it('shows "Offline" label for offline status', () => {
    render(<DeskTile student={{ ...baseStudent, status: 'offline' }} />)
    expect(screen.getByText('Offline')).toBeInTheDocument()
  })

  it('uses beamerName when provided', () => {
    render(<DeskTile student={baseStudent} beamerName="Schüler 3" />)
    expect(screen.getByText('Schüler 3')).toBeInTheDocument()
    expect(screen.queryByText('Anna Müller')).not.toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn()
    render(<DeskTile student={baseStudent} onClick={onClick} />)
    await userEvent.click(screen.getByTestId('desk-tile'))
    expect(onClick).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- --run src/components/DeskTile.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Write `src/components/DeskTile.tsx`**

```typescript
import type { StudentSummary } from '../types'

const STATUS_CONFIG = {
  active: {
    label: 'Aktiv',
    dotClass: 'bg-green-500',
    textClass: 'text-green-500',
    borderClass: 'border-green-500',
    glowClass: 'shadow-[0_0_8px_rgba(34,197,94,0.4)]',
    pulse: false,
  },
  idle: {
    label: 'Idle',
    dotClass: 'bg-amber-400',
    textClass: 'text-amber-400',
    borderClass: 'border-amber-400',
    glowClass: '',
    pulse: false,
  },
  struggling: {
    label: 'Kämpft',
    dotClass: 'bg-red-500',
    textClass: 'text-red-500',
    borderClass: 'border-red-500',
    glowClass: '',
    pulse: true,
  },
  offline: {
    label: 'Offline',
    dotClass: 'bg-slate-600',
    textClass: 'text-slate-500',
    borderClass: 'border-slate-700',
    glowClass: '',
    pulse: false,
  },
}

function formatTimeSince(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'Gerade eben'
  if (mins < 60) return `vor ${mins} Min.`
  const hours = Math.floor(mins / 60)
  return `vor ${hours} Std.`
}

interface Props {
  student: StudentSummary
  onClick?: () => void
  beamerName?: string
  extraContent?: React.ReactNode
}

export function DeskTile({ student, onClick, beamerName, extraContent }: Props) {
  const cfg = STATUS_CONFIG[student.status]
  const name = beamerName ?? student.displayName
  const isOffline = student.status === 'offline'

  return (
    <div
      data-testid="desk-tile"
      onClick={onClick}
      className={`w-[108px] h-[66px] rounded-[8px] border-2 ${cfg.borderClass} ${cfg.glowClass} ${
        isOffline ? 'opacity-50' : ''
      } bg-[#101828] cursor-pointer flex flex-col justify-center items-center p-1 gap-0.5 select-none`}
    >
      <span className="text-white text-xs font-medium truncate max-w-full px-1 leading-tight">
        {name}
      </span>
      <div className="flex items-center gap-1">
        <span
          className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass} ${cfg.pulse ? 'animate-pulse' : ''}`}
        />
        <span className={`text-[10px] ${cfg.textClass}`}>{cfg.label}</span>
      </div>
      <span className="text-[9px] text-slate-500 leading-tight">
        {student.lastActive ? formatTimeSince(student.lastActive) : '—'}
      </span>
      {extraContent}
    </div>
  )
}
```

- [ ] **Step 4: Run DeskTile tests**

```bash
npm test -- --run src/components/DeskTile.test.tsx
```

Expected: `Tests 6 passed (6)`.

- [ ] **Step 5: Write failing AlertPill tests** in `src/components/AlertPill.test.tsx`

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AlertPill } from './AlertPill'
import type { StudentSummary } from '../types'

const makeStudent = (status: StudentSummary['status'], topic: string | null = null): StudentSummary => ({
  uid: Math.random().toString(),
  displayName: 'Test',
  email: '',
  lastActive: null,
  accuracy7d: 50,
  streak: 0,
  totalXp: 0,
  status,
  currentTopic: topic,
  sessionProgress: null,
})

describe('AlertPill', () => {
  it('renders nothing when no students are struggling', () => {
    const { container } = render(<AlertPill students={[makeStudent('active')]} />)
    expect(container.firstChild).toBeNull()
  })

  it('shows count of struggling students', () => {
    const students = [
      makeStudent('struggling', 'Ableitungen'),
      makeStudent('struggling', 'Ableitungen'),
      makeStudent('active'),
    ]
    render(<AlertPill students={students} />)
    expect(screen.getByText(/2 Schüler kämpfen/)).toBeInTheDocument()
  })

  it('includes topic name in message', () => {
    render(<AlertPill students={[makeStudent('struggling', 'Potenzregel')]} />)
    expect(screen.getByText(/Potenzregel/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Write `src/components/AlertPill.tsx`**

```typescript
import type { StudentSummary } from '../types'

interface Props {
  students: StudentSummary[]
}

export function AlertPill({ students }: Props) {
  const struggling = students.filter((s) => s.status === 'struggling')
  if (struggling.length === 0) return null

  const topics = [...new Set(struggling.map((s) => s.currentTopic).filter(Boolean))]
  const topicText = topics[0] ?? 'unbekanntem Thema'

  return (
    <div className="flex items-center gap-2 bg-red-950 border border-red-800 text-red-400 text-sm rounded-full px-4 py-1">
      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-none" />
      <span>
        {struggling.length} Schüler kämpfen mit <strong className="text-red-300">{topicText}</strong>
      </span>
    </div>
  )
}
```

- [ ] **Step 7: Write `src/components/SessionRing.tsx`** (no test — pure SVG math, no behaviour)

```typescript
interface Props {
  answered: number
  total: number
  size?: number
}

export function SessionRing({ answered, total, size = 22 }: Props) {
  const r = (size - 4) / 2
  const circumference = 2 * Math.PI * r
  const pct = total > 0 ? Math.min(answered / total, 1) : 0
  const offset = circumference * (1 - pct)

  return (
    <svg
      width={size}
      height={size}
      className="-rotate-90"
      aria-label={`${answered} von ${total} Aufgaben`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#1e293b"
        strokeWidth={2}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#2563EB"
        strokeWidth={2}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  )
}
```

- [ ] **Step 8: Run AlertPill tests**

```bash
npm test -- --run src/components/AlertPill.test.tsx
```

Expected: `Tests 3 passed (3)`.

- [ ] **Step 9: Commit**

```bash
git add src/components/DeskTile.tsx src/components/DeskTile.test.tsx \
        src/components/AlertPill.tsx src/components/AlertPill.test.tsx \
        src/components/SessionRing.tsx
git commit -m "feat: add DeskTile, AlertPill, and SessionRing components"
```

---

## Task 9: ClassroomGrid

**Files:**
- Create: `src/components/ClassroomGrid.tsx`
- Create: `src/components/ClassroomGrid.test.tsx`

The grid shows students at their assigned desk positions. Edit mode enables drag-and-drop using `@dnd-kit/core`. Position assignment helper: if a student has no entry in `deskPositions`, they are auto-assigned alphabetically by last name into the first available cell (row-major order).

- [ ] **Step 1: Write failing tests** in `src/components/ClassroomGrid.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ClassroomGrid } from './ClassroomGrid'
import type { StudentSummary, ClassDoc } from '../types'

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useDraggable: vi.fn(() => ({
    setNodeRef: vi.fn(),
    listeners: {},
    attributes: {},
    transform: null,
  })),
  useDroppable: vi.fn(() => ({
    setNodeRef: vi.fn(),
    isOver: false,
  })),
  DragOverlay: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

const makeStudent = (uid: string, name: string, status: StudentSummary['status'] = 'offline'): StudentSummary => ({
  uid,
  displayName: name,
  email: '',
  lastActive: null,
  accuracy7d: 0,
  streak: 0,
  totalXp: 0,
  status,
  currentTopic: null,
  sessionProgress: null,
})

const mockClass: ClassDoc = {
  id: 'cls-1',
  name: '11a',
  teacherId: 't-1',
  schoolId: 'mvl',
  studentIds: ['s1', 's2'],
  gridConfig: { rows: 3, cols: 4 },
  deskPositions: { s1: { col: 0, row: 0 }, s2: { col: 1, row: 0 } },
  createdAt: '',
  updatedAt: '',
}

describe('ClassroomGrid', () => {
  it('renders one tile per student', () => {
    const students = [makeStudent('s1', 'Anna Müller'), makeStudent('s2', 'Ben Schmidt')]
    render(
      <ClassroomGrid
        students={students}
        classDoc={mockClass}
        editMode={false}
      />
    )
    expect(screen.getAllByTestId('desk-tile')).toHaveLength(2)
  })

  it('shows student names on tiles', () => {
    const students = [makeStudent('s1', 'Anna Müller'), makeStudent('s2', 'Ben Schmidt')]
    render(
      <ClassroomGrid
        students={students}
        classDoc={mockClass}
        editMode={false}
      />
    )
    expect(screen.getByText('Anna Müller')).toBeInTheDocument()
    expect(screen.getByText('Ben Schmidt')).toBeInTheDocument()
  })

  it('auto-assigns positions alphabetically when deskPositions is empty', () => {
    const classWithNoPositions: ClassDoc = { ...mockClass, deskPositions: {} }
    const students = [makeStudent('s2', 'Schmidt Ben'), makeStudent('s1', 'Müller Anna')]
    render(
      <ClassroomGrid
        students={students}
        classDoc={classWithNoPositions}
        editMode={false}
      />
    )
    // Both tiles should render (positions were auto-assigned)
    expect(screen.getAllByTestId('desk-tile')).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- --run src/components/ClassroomGrid.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Write `src/components/ClassroomGrid.tsx`**

```typescript
import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { DeskTile } from './DeskTile'
import type { StudentSummary, ClassDoc } from '../types'

// Auto-assign positions alphabetically by last name for students with no position.
export function assignMissingPositions(
  students: StudentSummary[],
  gridConfig: { rows: number; cols: number },
  existing: Record<string, { col: number; row: number }>
): Record<string, { col: number; row: number }> {
  const unassigned = students.filter((s) => !existing[s.uid])
  if (unassigned.length === 0) return existing

  const sorted = [...unassigned].sort((a, b) => {
    const aLast = a.displayName.split(' ').at(-1) ?? a.displayName
    const bLast = b.displayName.split(' ').at(-1) ?? b.displayName
    return aLast.localeCompare(bLast, 'de')
  })

  const occupied = new Set(Object.values(existing).map((p) => `${p.col}-${p.row}`))
  const result = { ...existing }
  let idx = 0

  outer: for (let row = 0; row < gridConfig.rows; row++) {
    for (let col = 0; col < gridConfig.cols; col++) {
      if (idx >= sorted.length) break outer
      const key = `${col}-${row}`
      if (!occupied.has(key)) {
        result[sorted[idx].uid] = { col, row }
        occupied.add(key)
        idx++
      }
    }
  }

  return result
}

interface DroppableCellProps {
  cellId: string
  editMode: boolean
  children?: React.ReactNode
}

function DroppableCell({ cellId, editMode, children }: DroppableCellProps) {
  const { setNodeRef, isOver } = useDroppable({ id: cellId })
  return (
    <div
      ref={setNodeRef}
      className={`w-[108px] h-[66px] rounded-[8px] transition-colors ${
        editMode && isOver
          ? 'border-2 border-dashed border-blue-400 bg-blue-900/20'
          : ''
      }`}
    >
      {children}
    </div>
  )
}

interface DraggableTileProps {
  student: StudentSummary
  editMode: boolean
  onClick?: () => void
  beamerName?: string
  extraContent?: React.ReactNode
}

function DraggableTile({ student, editMode, onClick, beamerName, extraContent }: DraggableTileProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: student.uid,
  })
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(editMode ? { ...listeners, ...attributes } : {})}
      className={isDragging ? 'opacity-50' : ''}
    >
      <DeskTile
        student={student}
        onClick={!editMode ? onClick : undefined}
        beamerName={beamerName}
        extraContent={extraContent}
      />
    </div>
  )
}

interface Props {
  students: StudentSummary[]
  classDoc: ClassDoc
  editMode: boolean
  onDeskPositionsChange?: (positions: Record<string, { col: number; row: number }>) => void
  onStudentClick?: (uid: string) => void
  beamerMode?: boolean
  showSessionRings?: boolean
}

export function ClassroomGrid({
  students,
  classDoc,
  editMode,
  onDeskPositionsChange,
  onStudentClick,
  beamerMode,
  showSessionRings,
}: Props) {
  const [activeDragId, setActiveDragId] = useState<string | null>(null)

  const positions = assignMissingPositions(students, classDoc.gridConfig, classDoc.deskPositions)
  const { rows, cols } = classDoc.gridConfig

  // Sort students by desk position for beamer numbering (row-major)
  const sortedForBeamer = [...students].sort((a, b) => {
    const pa = positions[a.uid] ?? { row: 99, col: 99 }
    const pb = positions[b.uid] ?? { row: 99, col: 99 }
    return pa.row !== pb.row ? pa.row - pb.row : pa.col - pb.col
  })

  function getBeamerName(uid: string): string | undefined {
    if (!beamerMode) return undefined
    const idx = sortedForBeamer.findIndex((s) => s.uid === uid)
    return `Schüler ${idx + 1}`
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null)
    const { active, over } = event
    if (!over) return

    const draggedUid = active.id as string
    const [targetColStr, targetRowStr] = (over.id as string).split('-')
    const targetCol = Number(targetColStr)
    const targetRow = Number(targetRowStr)

    const newPositions = { ...positions }
    const draggedFrom = newPositions[draggedUid]

    const occupant = Object.entries(newPositions).find(
      ([uid, pos]) => pos.col === targetCol && pos.row === targetRow && uid !== draggedUid
    )

    if (occupant) {
      newPositions[occupant[0]] = draggedFrom
    }
    newPositions[draggedUid] = { col: targetCol, row: targetRow }

    onDeskPositionsChange?.(newPositions)
  }

  const studentByUid = new Map(students.map((s) => [s.uid, s]))
  const activeDragStudent = activeDragId ? studentByUid.get(activeDragId) : null

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {/* Room frame */}
      <div className="bg-[#101828] rounded-xl border border-slate-800 p-6 relative">
        {/* Tafel */}
        <div className="w-2/3 mx-auto h-8 bg-[#2563EB]/20 border border-[#2563EB]/40 rounded mb-8 flex items-center justify-center">
          <span className="text-blue-400 text-xs tracking-widest uppercase">Tafel</span>
        </div>

        {editMode && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-blue-900/30 border border-blue-700/50 text-blue-300 text-xs px-3 py-1 rounded-full">
            Bearbeitungsmodus — Schüler verschieben
          </div>
        )}

        {/* Grid */}
        <div
          className="grid gap-4 mx-auto w-fit"
          style={{
            gridTemplateColumns: `repeat(${cols}, 108px)`,
            gridTemplateRows: `repeat(${rows}, 66px)`,
          }}
        >
          {Array.from({ length: rows }, (_, row) =>
            Array.from({ length: cols }, (_, col) => {
              const cellId = `${col}-${row}`
              const student = students.find((s) => {
                const pos = positions[s.uid]
                return pos?.col === col && pos?.row === row
              })

              return (
                <DroppableCell key={cellId} cellId={cellId} editMode={editMode}>
                  {student && (
                    <DraggableTile
                      student={student}
                      editMode={editMode}
                      onClick={() => onStudentClick?.(student.uid)}
                      beamerName={getBeamerName(student.uid)}
                      extraContent={
                        showSessionRings && student.sessionProgress ? (
                          // SessionRing is imported dynamically to avoid circular dep
                          <SessionRingWrapper progress={student.sessionProgress} />
                        ) : undefined
                      }
                    />
                  )}
                </DroppableCell>
              )
            })
          )}
        </div>
      </div>

      <DragOverlay>
        {activeDragStudent && (
          <DeskTile
            student={activeDragStudent}
            beamerName={getBeamerName(activeDragStudent.uid)}
          />
        )}
      </DragOverlay>
    </DndContext>
  )
}

// Small wrapper to avoid importing SessionRing at the top level until needed
import { SessionRing } from './SessionRing'

function SessionRingWrapper({ progress }: { progress: { answered: number; total: number } }) {
  return <SessionRing answered={progress.answered} total={progress.total} size={18} />
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- --run src/components/ClassroomGrid.test.tsx
```

Expected: `Tests 3 passed (3)`.

- [ ] **Step 5: Commit**

```bash
git add src/components/ClassroomGrid.tsx src/components/ClassroomGrid.test.tsx
git commit -m "feat: add ClassroomGrid with drag-and-drop and auto-position assignment"
```

---

## Task 10: Klassenraum Page

**Files:**
- Modify: `src/pages/Klassenraum.tsx`
- Create: `src/pages/Klassenraum.test.tsx`

- [ ] **Step 1: Write failing tests** in `src/pages/Klassenraum.test.tsx`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { StudentSummary, ClassDoc } from '../types'

const mockStudents: StudentSummary[] = [
  {
    uid: 's1',
    displayName: 'Anna Müller',
    email: '',
    lastActive: new Date().toISOString(),
    accuracy7d: 85,
    streak: 3,
    totalXp: 900,
    status: 'active',
    currentTopic: 'Ableitungen',
    sessionProgress: null,
  },
  {
    uid: 's2',
    displayName: 'Ben Schmidt',
    email: '',
    lastActive: null,
    accuracy7d: 30,
    streak: 0,
    totalXp: 200,
    status: 'struggling',
    currentTopic: 'Ableitungen',
    sessionProgress: null,
  },
]

const mockClass: ClassDoc = {
  id: 'cls-1',
  name: '11a',
  teacherId: 't-1',
  schoolId: 'mvl',
  studentIds: ['s1', 's2'],
  gridConfig: { rows: 3, cols: 4 },
  deskPositions: { s1: { col: 0, row: 0 }, s2: { col: 1, row: 0 } },
  createdAt: '',
  updatedAt: '',
}

vi.mock('../api/hooks', () => ({
  useStudents: vi.fn().mockReturnValue({ data: mockStudents, isLoading: false }),
  useClasses: vi.fn().mockReturnValue({ data: [mockClass] }),
}))

vi.mock('../api/mutations', () => ({
  useUpdateClass: vi.fn(() => ({ mutateAsync: vi.fn().mockResolvedValue(mockClass), isPending: false })),
}))

vi.mock('../store', () => ({
  useStore: vi.fn((selector: (s: object) => unknown) =>
    selector({
      selectedClassId: 'cls-1',
      editMode: false,
      activePanelStudentId: null,
      setEditMode: vi.fn(),
      setActivePanelStudentId: vi.fn(),
    })
  ),
}))

vi.mock('../components/ClassroomGrid', () => ({
  ClassroomGrid: ({ students, onStudentClick }: {
    students: StudentSummary[]
    onStudentClick?: (uid: string) => void
  }) => (
    <div>
      {students.map((s) => (
        <button key={s.uid} onClick={() => onStudentClick?.(s.uid)}>
          {s.displayName}
        </button>
      ))}
    </div>
  ),
}))

vi.mock('../components/StudentPanel', () => ({
  StudentPanel: ({ studentId }: { studentId: string }) => (
    <div data-testid="student-panel">{studentId}</div>
  ),
}))

import { Klassenraum } from './Klassenraum'

describe('Klassenraum', () => {
  it('shows the alert pill when a student is struggling', () => {
    render(<Klassenraum />)
    expect(screen.getByText(/kämpfen/)).toBeInTheDocument()
  })

  it('shows the Bearbeiten button', () => {
    render(<Klassenraum />)
    expect(screen.getByRole('button', { name: /bearbeiten/i })).toBeInTheDocument()
  })

  it('renders student names in grid', () => {
    render(<Klassenraum />)
    expect(screen.getByText('Anna Müller')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- --run src/pages/Klassenraum.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Write `src/pages/Klassenraum.tsx`**

```typescript
import { useState } from 'react'
import { useStore } from '../store'
import { useStudents, useClasses } from '../api/hooks'
import { useUpdateClass } from '../api/mutations'
import { ClassroomGrid } from '../components/ClassroomGrid'
import { AlertPill } from '../components/AlertPill'
import { StudentPanel } from '../components/StudentPanel'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function Klassenraum() {
  const selectedClassId = useStore((s) => s.selectedClassId)
  const editMode = useStore((s) => s.editMode)
  const setEditMode = useStore((s) => s.setEditMode)
  const activePanelStudentId = useStore((s) => s.activePanelStudentId)
  const setActivePanelStudentId = useStore((s) => s.setActivePanelStudentId)

  const { data: students = [] } = useStudents(selectedClassId, 30_000)
  const { data: classes = [] } = useClasses(selectedClassId ? [selectedClassId] : [])
  const classDoc = classes[0]
  const updateClass = useUpdateClass(selectedClassId ?? '')

  const [configOpen, setConfigOpen] = useState(false)
  const [configRows, setConfigRows] = useState(classDoc?.gridConfig.rows ?? 4)
  const [configCols, setConfigCols] = useState(classDoc?.gridConfig.cols ?? 5)

  async function handleSaveDeskPositions(positions: Record<string, { col: number; row: number }>) {
    await updateClass.mutateAsync({ deskPositions: positions })
  }

  async function handleApplyConfig() {
    if (!classDoc) return
    // Re-assign all students alphabetically from top-left
    const sorted = [...students].sort((a, b) => {
      const aLast = a.displayName.split(' ').at(-1) ?? a.displayName
      const bLast = b.displayName.split(' ').at(-1) ?? b.displayName
      return aLast.localeCompare(bLast, 'de')
    })
    const newPositions: Record<string, { col: number; row: number }> = {}
    let idx = 0
    outer: for (let row = 0; row < configRows; row++) {
      for (let col = 0; col < configCols; col++) {
        if (idx >= sorted.length) break outer
        newPositions[sorted[idx].uid] = { col, row }
        idx++
      }
    }
    await updateClass.mutateAsync({
      gridConfig: { rows: configRows, cols: configCols },
      deskPositions: newPositions,
    })
    setConfigOpen(false)
  }

  if (!classDoc) return <div className="p-8 text-slate-400">Keine Klasse ausgewählt</div>

  return (
    <div className="p-6 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold text-white flex-1">Klassenraum – {classDoc.name}</h1>
        <AlertPill students={students} />
        <Button variant="outline" size="sm" onClick={() => setConfigOpen(true)}>
          Konfigurieren
        </Button>
        <Button
          variant={editMode ? 'default' : 'outline'}
          size="sm"
          onClick={() => setEditMode(!editMode)}
        >
          {editMode ? '✓ Fertig' : '✎ Bearbeiten'}
        </Button>
      </div>

      {/* Grid */}
      <ClassroomGrid
        students={students}
        classDoc={classDoc}
        editMode={editMode}
        onDeskPositionsChange={handleSaveDeskPositions}
        onStudentClick={(uid) => setActivePanelStudentId(uid)}
      />

      {/* Student detail panel */}
      {activePanelStudentId && (
        <StudentPanel
          studentId={activePanelStudentId}
          onClose={() => setActivePanelStudentId(null)}
        />
      )}

      {/* Configure grid modal */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Raumkonfiguration</DialogTitle>
          </DialogHeader>
          <div className="flex gap-4 py-4">
            <div className="flex flex-col gap-1.5 flex-1">
              <Label htmlFor="confRows">Reihen</Label>
              <Input
                id="confRows"
                type="number"
                min={1}
                max={8}
                value={configRows}
                onChange={(e) => setConfigRows(Number(e.target.value))}
              />
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <Label htmlFor="confCols">Spalten</Label>
              <Input
                id="confCols"
                type="number"
                min={1}
                max={8}
                value={configCols}
                onChange={(e) => setConfigCols(Number(e.target.value))}
              />
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Schüler werden alphabetisch neu angeordnet.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleApplyConfig}>Übernehmen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- --run src/pages/Klassenraum.test.tsx
```

Expected: `Tests 3 passed (3)`.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Klassenraum.tsx src/pages/Klassenraum.test.tsx
git commit -m "feat: implement Klassenraum page with edit mode and grid config"
```

---

## Task 11: Live Monitor Page

**Files:**
- Modify: `src/pages/LiveMonitor.tsx`
- Create: `src/pages/LiveMonitor.test.tsx`

- [ ] **Step 1: Write failing tests** in `src/pages/LiveMonitor.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { StudentSummary, ClassDoc } from '../types'

const mockStudents: StudentSummary[] = [
  {
    uid: 's1',
    displayName: 'Anna Müller',
    email: '',
    lastActive: new Date().toISOString(),
    accuracy7d: 75,
    streak: 2,
    totalXp: 500,
    status: 'active',
    currentTopic: null,
    sessionProgress: { answered: 3, total: 10 },
  },
]

const mockClass: ClassDoc = {
  id: 'cls-1',
  name: '11a',
  teacherId: 't-1',
  schoolId: 'mvl',
  studentIds: ['s1'],
  gridConfig: { rows: 3, cols: 4 },
  deskPositions: { s1: { col: 0, row: 0 } },
  createdAt: '',
  updatedAt: '',
}

vi.mock('../api/hooks', () => ({
  useStudents: vi.fn().mockReturnValue({ data: mockStudents, isLoading: false }),
  useClasses: vi.fn().mockReturnValue({ data: [mockClass] }),
}))

vi.mock('../store', () => ({
  useStore: vi.fn((selector: (s: object) => unknown) =>
    selector({
      selectedClassId: 'cls-1',
      beamerMode: false,
      setBeamerMode: vi.fn(),
    })
  ),
}))

vi.mock('../components/ClassroomGrid', () => ({
  ClassroomGrid: ({ students, beamerMode }: { students: StudentSummary[]; beamerMode?: boolean }) => (
    <div>
      {students.map((s) => (
        <span key={s.uid}>{beamerMode ? 'Schüler 1' : s.displayName}</span>
      ))}
    </div>
  ),
}))

import { LiveMonitor } from './LiveMonitor'

describe('LiveMonitor', () => {
  it('shows student names in normal mode', () => {
    render(<LiveMonitor />)
    expect(screen.getByText('Anna Müller')).toBeInTheDocument()
  })

  it('shows Beamer-Modus toggle button', () => {
    render(<LiveMonitor />)
    expect(screen.getByRole('button', { name: /beamer/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- --run src/pages/LiveMonitor.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Write `src/pages/LiveMonitor.tsx`**

```typescript
import { useStore } from '../store'
import { useStudents, useClasses } from '../api/hooks'
import { ClassroomGrid } from '../components/ClassroomGrid'
import { AlertPill } from '../components/AlertPill'
import { Button } from '@/components/ui/button'

export function LiveMonitor() {
  const selectedClassId = useStore((s) => s.selectedClassId)
  const beamerMode = useStore((s) => s.beamerMode)
  const setBeamerMode = useStore((s) => s.setBeamerMode)

  // Poll every 5 seconds
  const { data: students = [], isLoading } = useStudents(selectedClassId, 5_000)
  const { data: classes = [] } = useClasses(selectedClassId ? [selectedClassId] : [])
  const classDoc = classes[0]

  if (!classDoc) return <div className="p-8 text-slate-400">Keine Klasse ausgewählt</div>

  return (
    <div className="p-6 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold text-white flex-1">
          Live Monitor – {classDoc.name}
        </h1>
        {isLoading && (
          <span className="text-xs text-slate-500 animate-pulse">Aktualisierung…</span>
        )}
        <AlertPill students={students} />
        <Button
          variant={beamerMode ? 'default' : 'outline'}
          size="sm"
          onClick={() => setBeamerMode(!beamerMode)}
        >
          📽 Beamer-Modus {beamerMode ? 'aus' : 'an'}
        </Button>
      </div>

      {beamerMode && (
        <div className="bg-blue-950/30 border border-blue-800/40 rounded-lg px-4 py-2 text-blue-300 text-sm">
          Beamer-Modus aktiv — Namen werden pseudonymisiert, Genauigkeit ausgeblendet
        </div>
      )}

      <ClassroomGrid
        students={students}
        classDoc={classDoc}
        editMode={false}
        beamerMode={beamerMode}
        showSessionRings={!beamerMode}
      />
    </div>
  )
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- --run src/pages/LiveMonitor.test.tsx
```

Expected: `Tests 2 passed (2)`.

- [ ] **Step 5: Commit**

```bash
git add src/pages/LiveMonitor.tsx src/pages/LiveMonitor.test.tsx
git commit -m "feat: implement Live Monitor with 5s polling and beamer mode"
```

---

## Task 12: Analytik Page

**Files:**
- Modify: `src/pages/Analytik.tsx`
- Create: `src/pages/Analytik.test.tsx`

- [ ] **Step 1: Write failing tests** in `src/pages/Analytik.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { AnalyticsResponse } from '../types'

const mockAnalytics: AnalyticsResponse = {
  summary: {
    questionsToday: 42,
    questionsThisWeek: 210,
    classAverageAccuracy: 73,
    avgDailyStreak: 4,
    activeStudentsToday: 18,
  },
  topics: [
    {
      leitidee: 'Analysis',
      thema: 'Ableitungen',
      unterthema: 'Potenzregel',
      correct: 30,
      incorrect: 10,
      accuracyPct: 75,
      isWissensluecke: false,
    },
    {
      leitidee: 'Analysis',
      thema: 'Ableitungen',
      unterthema: 'Kettenregel',
      correct: 5,
      incorrect: 15,
      accuracyPct: 25,
      isWissensluecke: true,
    },
  ],
}

vi.mock('../api/hooks', () => ({
  useAnalytics: vi.fn().mockReturnValue({ data: mockAnalytics, isLoading: false }),
}))

vi.mock('../store', () => ({
  useStore: vi.fn((selector: (s: object) => unknown) =>
    selector({ selectedClassId: 'cls-1' })
  ),
}))

import { Analytik } from './Analytik'

describe('Analytik', () => {
  it('shows questions answered today', () => {
    render(<Analytik />)
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('shows class average accuracy', () => {
    render(<Analytik />)
    expect(screen.getByText('73 %')).toBeInTheDocument()
  })

  it('labels Wissenslücke topics', () => {
    render(<Analytik />)
    expect(screen.getByText(/Wissenslücke/)).toBeInTheDocument()
  })

  it('shows topic names in the chart', () => {
    render(<Analytik />)
    expect(screen.getByText(/Potenzregel/)).toBeInTheDocument()
    expect(screen.getByText(/Kettenregel/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- --run src/pages/Analytik.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Write `src/pages/Analytik.tsx`**

```typescript
import { useStore } from '../store'
import { useAnalytics } from '../api/hooks'
import type { TopicAccuracy, AnalyticsSummary } from '../types'

export function Analytik() {
  const selectedClassId = useStore((s) => s.selectedClassId)
  const { data, isLoading } = useAnalytics(selectedClassId)

  if (isLoading || !data) {
    return <div className="p-8 text-slate-400">Laden…</div>
  }

  return (
    <div className="p-6 flex flex-col gap-8">
      <h1 className="text-xl font-semibold text-white">Analytik</h1>

      <SummaryCards summary={data.summary} />

      <section>
        <h2 className="text-lg font-medium text-white mb-4">Themen-Analyse</h2>
        <TopicChart topics={data.topics} />
      </section>
    </div>
  )
}

function SummaryCards({ summary }: { summary: AnalyticsSummary }) {
  const cards = [
    { label: 'Fragen heute', value: String(summary.questionsToday) },
    { label: 'Fragen diese Woche', value: String(summary.questionsThisWeek) },
    { label: 'Ø Klassengenauigkeit', value: `${summary.classAverageAccuracy} %` },
    { label: 'Ø Streak', value: `${summary.avgDailyStreak} Tage` },
    { label: 'Aktive Schüler heute', value: String(summary.activeStudentsToday) },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map(({ label, value }) => (
        <div
          key={label}
          className="bg-[#101828] rounded-xl border border-slate-800 p-4 flex flex-col gap-1"
        >
          <p className="text-slate-400 text-xs">{label}</p>
          <p className="text-white text-2xl font-bold">{value}</p>
        </div>
      ))}
    </div>
  )
}

function TopicChart({ topics }: { topics: TopicAccuracy[] }) {
  if (topics.length === 0) {
    return <p className="text-slate-500 text-sm">Noch keine Daten</p>
  }

  const maxTotal = Math.max(...topics.map((t) => t.correct + t.incorrect))

  return (
    <div className="flex flex-col gap-3">
      {topics.map((t) => {
        const total = t.correct + t.incorrect
        const correctPct = total > 0 ? (t.correct / total) * 100 : 0
        const incorrectPct = 100 - correctPct

        return (
          <div key={`${t.leitidee}-${t.thema}-${t.unterthema}`} className="flex items-center gap-4">
            {/* Label */}
            <div className="w-64 flex-none text-sm text-slate-300 truncate">
              <span className="text-slate-500 text-xs">{t.leitidee} › {t.thema} › </span>
              {t.unterthema}
            </div>

            {/* Bar */}
            <div
              className="flex-1 h-5 bg-slate-800 rounded overflow-hidden flex"
              style={{ maxWidth: `${(total / maxTotal) * 100}%` }}
            >
              <div
                className="h-full bg-green-500"
                style={{ width: `${correctPct}%` }}
              />
              <div
                className="h-full bg-red-500"
                style={{ width: `${incorrectPct}%` }}
              />
            </div>

            {/* Accuracy */}
            <span className="text-sm text-slate-300 w-12 text-right">{t.accuracyPct} %</span>

            {/* Wissenslücke badge */}
            {t.isWissensluecke && (
              <span className="text-xs bg-amber-900/40 border border-amber-700/50 text-amber-400 rounded-full px-2 py-0.5">
                Wissenslücke ⚠
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- --run src/pages/Analytik.test.tsx
```

Expected: `Tests 4 passed (4)`.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Analytik.tsx src/pages/Analytik.test.tsx
git commit -m "feat: implement Analytik page with summary cards and topic bar chart"
```

---

## Task 13: Student Detail Panel

**Files:**
- Modify: `src/components/StudentPanel.tsx`
- Create: `src/components/StudentPanel.test.tsx`

- [ ] **Step 1: Write failing tests** in `src/components/StudentPanel.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { StudentSummary, FeedResponse } from '../types'

const mockStudent: StudentSummary = {
  uid: 's1',
  displayName: 'Anna Müller',
  email: 'anna@mvl-gym.de',
  lastActive: new Date().toISOString(),
  accuracy7d: 80,
  streak: 5,
  totalXp: 1500,
  status: 'active',
  currentTopic: 'Ableitungen',
  sessionProgress: null,
}

const mockFeed: FeedResponse = {
  entries: [
    {
      userId: 's1',
      displayName: 'Anna Müller',
      questionText: 'Was ist die Ableitung von x²?',
      studentAnswer: '2x',
      isCorrect: true,
      feedback: 'Richtig!',
      hintsUsed: 0,
      timeSpentSeconds: 15,
      timestamp: Date.now() - 60_000,
      leitidee: 'Analysis',
      thema: 'Ableitungen',
      unterthema: 'Potenzregel',
    },
  ],
}

vi.mock('../api/hooks', () => ({
  useStudents: vi.fn((classId: string | null) => ({
    data: classId ? [mockStudent] : [],
  })),
  useClassFeed: vi.fn().mockReturnValue({ data: mockFeed, isLoading: false }),
  useAiAssessment: vi.fn().mockReturnValue({
    data: { assessment: 'Anna zeigt gute Kenntnisse in Analysis.', generatedAt: '' },
    isLoading: false,
  }),
}))

vi.mock('../store', () => ({
  useStore: vi.fn((selector: (s: object) => unknown) =>
    selector({ selectedClassId: 'cls-1' })
  ),
}))

vi.mock('../api/mutations', () => ({
  useResetPassword: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}))

import { StudentPanel } from './StudentPanel'

describe('StudentPanel', () => {
  it('shows student name in header', () => {
    render(<StudentPanel studentId="s1" onClose={vi.fn()} />)
    expect(screen.getByText('Anna Müller')).toBeInTheDocument()
  })

  it('shows AI assessment text', async () => {
    render(<StudentPanel studentId="s1" onClose={vi.fn()} />)
    await waitFor(() =>
      expect(screen.getByText(/Anna zeigt gute Kenntnisse/)).toBeInTheDocument()
    )
  })

  it('shows the live feed entry', () => {
    render(<StudentPanel studentId="s1" onClose={vi.fn()} />)
    expect(screen.getByText(/Was ist die Ableitung von x²/)).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn()
    render(<StudentPanel studentId="s1" onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: /schließen|×|close/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- --run src/components/StudentPanel.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Write `src/components/StudentPanel.tsx`**

```typescript
import { useStudents, useClassFeed, useAiAssessment } from '../api/hooks'
import { useResetPassword } from '../api/mutations'
import { useStore } from '../store'
import { Button } from '@/components/ui/button'

interface Props {
  studentId: string
  onClose: () => void
}

export function StudentPanel({ studentId, onClose }: Props) {
  const selectedClassId = useStore((s) => s.selectedClassId)
  const { data: students = [] } = useStudents(selectedClassId)
  const student = students.find((s) => s.uid === studentId)

  const { data: feedData, isLoading: feedLoading } = useClassFeed(selectedClassId)
  const { data: assessmentData, isLoading: assessmentLoading } = useAiAssessment(studentId, true)
  const resetPassword = useResetPassword()

  const studentFeed = feedData?.entries.filter((e) => e.userId === studentId).slice(0, 20) ?? []

  return (
    // Sliding panel from right
    <div className="fixed inset-y-0 right-0 w-[480px] bg-[#101828] border-l border-slate-800 shadow-2xl z-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-6 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-semibold text-white">
            {student?.displayName ?? studentId}
          </h2>
          <div className="flex gap-4 mt-1 text-sm text-slate-400">
            {student?.lastActive && (
              <span>Zuletzt aktiv: {new Date(student.lastActive).toLocaleDateString('de')}</span>
            )}
            {student && <span>Streak: {student.streak} Tage</span>}
            {student && <span>XP: {student.totalXp}</span>}
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Schließen"
          className="text-slate-400 hover:text-white text-2xl leading-none"
        >
          ×
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
        {/* AI Assessment */}
        <section>
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
            KI-Einschätzung
          </h3>
          {assessmentLoading ? (
            <div className="h-20 bg-slate-800 rounded-lg animate-pulse" />
          ) : (
            <p className="text-slate-300 text-sm leading-relaxed bg-slate-900/50 rounded-lg p-4 border border-slate-800">
              {assessmentData?.assessment ?? 'Keine Einschätzung verfügbar'}
            </p>
          )}
        </section>

        {/* Live Feed */}
        <section>
          <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
            Letzte Aufgaben
          </h3>
          {feedLoading ? (
            <div className="h-32 bg-slate-800 rounded-lg animate-pulse" />
          ) : studentFeed.length === 0 ? (
            <p className="text-slate-500 text-sm">Keine Aufgaben vorhanden</p>
          ) : (
            <div className="flex flex-col gap-2">
              {studentFeed.map((entry, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg border text-sm ${
                    entry.isCorrect
                      ? 'border-green-900/50 bg-green-950/20'
                      : 'border-red-900/50 bg-red-950/20'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className={entry.isCorrect ? 'text-green-500' : 'text-red-500'}>
                      {entry.isCorrect ? '✓' : '✗'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-300 truncate">{entry.questionText}</p>
                      <p className="text-slate-500 text-xs mt-0.5">
                        Antwort: „{entry.studentAnswer}"
                      </p>
                      {entry.hintsUsed > 0 && (
                        <p className="text-amber-500/70 text-xs">{entry.hintsUsed} Hinweis(e)</p>
                      )}
                      <p className="text-slate-600 text-xs mt-1 line-clamp-2">{entry.feedback}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800">
        <Button
          variant="outline"
          size="sm"
          disabled={!student || resetPassword.isPending}
          onClick={() => student && resetPassword.mutate(student.email)}
          className="w-full"
        >
          Passwort zurücksetzen
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- --run src/components/StudentPanel.test.tsx
```

Expected: `Tests 4 passed (4)`.

- [ ] **Step 5: Commit**

```bash
git add src/components/StudentPanel.tsx src/components/StudentPanel.test.tsx
git commit -m "feat: add StudentPanel with AI assessment and live feed"
```

---

## Task 14: Schüler Roster Page

**Files:**
- Modify: `src/pages/Schueler.tsx`
- Create: `src/pages/Schueler.test.tsx`

- [ ] **Step 1: Write failing tests** in `src/pages/Schueler.test.tsx`

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { StudentSummary } from '../types'

const mockStudents: StudentSummary[] = [
  {
    uid: 's1',
    displayName: 'Anna Müller',
    email: 'anna@mvl-gym.de',
    lastActive: new Date().toISOString(),
    accuracy7d: 85,
    streak: 5,
    totalXp: 1200,
    status: 'active',
    currentTopic: null,
    sessionProgress: null,
  },
  {
    uid: 's2',
    displayName: 'Ben Schmidt',
    email: 'ben@mvl-gym.de',
    lastActive: null,
    accuracy7d: 40,
    streak: 0,
    totalXp: 300,
    status: 'offline',
    currentTopic: null,
    sessionProgress: null,
  },
]

vi.mock('../api/hooks', () => ({
  useStudents: vi.fn().mockReturnValue({ data: mockStudents, isLoading: false }),
  useClasses: vi.fn().mockReturnValue({ data: [{ id: 'cls-1', name: '11a' }] }),
}))

vi.mock('../api/mutations', () => ({
  useRemoveStudent: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}))

vi.mock('../store', () => ({
  useStore: vi.fn((selector: (s: object) => unknown) =>
    selector({
      selectedClassId: 'cls-1',
      activePanelStudentId: null,
      setActivePanelStudentId: vi.fn(),
    })
  ),
}))

vi.mock('../components/StudentPanel', () => ({
  StudentPanel: () => <div data-testid="student-panel" />,
}))

import { Schueler } from './Schueler'

describe('Schueler', () => {
  it('renders one table row per student', () => {
    render(<Schueler />)
    expect(screen.getByText('Anna Müller')).toBeInTheDocument()
    expect(screen.getByText('Ben Schmidt')).toBeInTheDocument()
  })

  it('shows accuracy percentage', () => {
    render(<Schueler />)
    expect(screen.getByText('85 %')).toBeInTheDocument()
    expect(screen.getByText('40 %')).toBeInTheDocument()
  })

  it('shows streak values', () => {
    render(<Schueler />)
    expect(screen.getByText('5 Tage')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- --run src/pages/Schueler.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Write `src/pages/Schueler.tsx`**

```typescript
import { useStore } from '../store'
import { useStudents, useClasses } from '../api/hooks'
import { useRemoveStudent } from '../api/mutations'
import { StudentPanel } from '../components/StudentPanel'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function Schueler() {
  const selectedClassId = useStore((s) => s.selectedClassId)
  const activePanelStudentId = useStore((s) => s.activePanelStudentId)
  const setActivePanelStudentId = useStore((s) => s.setActivePanelStudentId)

  const { data: students = [], isLoading } = useStudents(selectedClassId)
  const { data: classes = [] } = useClasses(selectedClassId ? [selectedClassId] : [])
  const classDoc = classes[0]
  const removeStudent = useRemoveStudent(selectedClassId ?? '')

  if (isLoading) return <div className="p-8 text-slate-400">Laden…</div>
  if (!classDoc) return <div className="p-8 text-slate-400">Keine Klasse ausgewählt</div>

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-xl font-semibold text-white flex-1">
          Schüler – {classDoc.name}
        </h1>
        <span className="text-slate-400 text-sm">{students.length} Schüler</span>
      </div>

      <div className="bg-[#101828] rounded-xl border border-slate-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800">
              <TableHead className="text-slate-400">Name</TableHead>
              <TableHead className="text-slate-400">Zuletzt aktiv</TableHead>
              <TableHead className="text-slate-400">Genauigkeit (7T)</TableHead>
              <TableHead className="text-slate-400">Streak</TableHead>
              <TableHead className="text-slate-400">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((s) => (
              <TableRow
                key={s.uid}
                className="border-slate-800 hover:bg-white/5 cursor-pointer"
                onClick={() => setActivePanelStudentId(s.uid)}
              >
                <TableCell className="text-white font-medium">{s.displayName}</TableCell>
                <TableCell className="text-slate-400 text-sm">
                  {s.lastActive
                    ? new Date(s.lastActive).toLocaleDateString('de')
                    : '—'}
                </TableCell>
                <TableCell className="text-slate-300">{s.accuracy7d} %</TableCell>
                <TableCell className="text-slate-300">{s.streak} Tage</TableCell>
                <TableCell>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-400 hover:text-white"
                      onClick={() => setActivePanelStudentId(s.uid)}
                    >
                      Details
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500/70 hover:text-red-400"
                      disabled={removeStudent.isPending}
                      onClick={() => removeStudent.mutate(s.uid)}
                    >
                      Entfernen
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {activePanelStudentId && (
        <StudentPanel
          studentId={activePanelStudentId}
          onClose={() => setActivePanelStudentId(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- --run src/pages/Schueler.test.tsx
```

Expected: `Tests 3 passed (3)`.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Schueler.tsx src/pages/Schueler.test.tsx
git commit -m "feat: implement Schüler roster with table and student panel integration"
```

---

## Task 15: Lernziele Page

**Files:**
- Modify: `src/pages/Lernziele.tsx`
- Create: `src/pages/Lernziele.test.tsx`

- [ ] **Step 1: Write failing tests** in `src/pages/Lernziele.test.tsx`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AnalyticsResponse } from '../types'

const mockAnalytics: AnalyticsResponse = {
  summary: {
    questionsToday: 10,
    questionsThisWeek: 50,
    classAverageAccuracy: 70,
    avgDailyStreak: 3,
    activeStudentsToday: 5,
  },
  topics: [
    {
      leitidee: 'Analysis',
      thema: 'Ableitungen',
      unterthema: 'Potenzregel',
      correct: 20,
      incorrect: 5,
      accuracyPct: 80,
      isWissensluecke: false,
    },
    {
      leitidee: 'Analysis',
      thema: 'Ableitungen',
      unterthema: 'Kettenregel',
      correct: 3,
      incorrect: 7,
      accuracyPct: 30,
      isWissensluecke: true,
    },
  ],
}

const mockSetGoal = vi.fn()

vi.mock('../api/hooks', () => ({
  useAnalytics: vi.fn().mockReturnValue({ data: mockAnalytics, isLoading: false }),
}))

vi.mock('../api/mutations', () => ({
  useSetGoal: vi.fn(() => ({
    mutateAsync: mockSetGoal.mockResolvedValue({}),
    isPending: false,
  })),
}))

vi.mock('../store', () => ({
  useStore: vi.fn((selector: (s: object) => unknown) =>
    selector({ selectedClassId: 'cls-1' })
  ),
}))

import { Lernziele } from './Lernziele'

describe('Lernziele', () => {
  beforeEach(() => mockSetGoal.mockClear())

  it('shows topic unterthemen from analytics', () => {
    render(<Lernziele />)
    expect(screen.getByText('Potenzregel')).toBeInTheDocument()
    expect(screen.getByText('Kettenregel')).toBeInTheDocument()
  })

  it('saves goal with selected topics when Speichern is clicked', async () => {
    render(<Lernziele />)
    await userEvent.click(screen.getByRole('checkbox', { name: /Potenzregel/ }))
    await userEvent.click(screen.getByRole('button', { name: /speichern/i }))
    await waitFor(() =>
      expect(mockSetGoal).toHaveBeenCalledWith(
        expect.objectContaining({
          topics: expect.arrayContaining([
            expect.objectContaining({ unterthema: 'Potenzregel' }),
          ]),
        })
      )
    )
  })

  it('shows validation error when no topics selected', async () => {
    render(<Lernziele />)
    await userEvent.click(screen.getByRole('button', { name: /speichern/i }))
    expect(screen.getByText(/mindestens ein/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- --run src/pages/Lernziele.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Write `src/pages/Lernziele.tsx`**

```typescript
import { useState, useMemo } from 'react'
import { useStore } from '../store'
import { useAnalytics } from '../api/hooks'
import { useSetGoal } from '../api/mutations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface TopicKey {
  leitidee: string
  thema: string
  unterthema: string
}

export function Lernziele() {
  const selectedClassId = useStore((s) => s.selectedClassId)
  const { data: analytics, isLoading } = useAnalytics(selectedClassId)
  const setGoal = useSetGoal(selectedClassId ?? '')

  const [selectedTopics, setSelectedTopics] = useState<TopicKey[]>([])
  const [examDate, setExamDate] = useState('')
  const [search, setSearch] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const topics = analytics?.topics ?? []

  // Build tree: leitidee → thema → unterthema[]
  const tree = useMemo(() => {
    const result: Record<string, Record<string, TopicKey[]>> = {}
    for (const t of topics) {
      if (!result[t.leitidee]) result[t.leitidee] = {}
      if (!result[t.leitidee][t.thema]) result[t.leitidee][t.thema] = []
      result[t.leitidee][t.thema].push({
        leitidee: t.leitidee,
        thema: t.thema,
        unterthema: t.unterthema,
      })
    }
    return result
  }, [topics])

  function isSelected(tk: TopicKey) {
    return selectedTopics.some(
      (s) => s.leitidee === tk.leitidee && s.thema === tk.thema && s.unterthema === tk.unterthema
    )
  }

  function toggleTopic(tk: TopicKey) {
    setSelectedTopics((prev) =>
      isSelected(tk)
        ? prev.filter(
            (s) =>
              !(s.leitidee === tk.leitidee && s.thema === tk.thema && s.unterthema === tk.unterthema)
          )
        : [...prev, tk]
    )
  }

  async function handleSave() {
    setValidationError(null)
    setSuccess(false)
    if (selectedTopics.length === 0) {
      setValidationError('Bitte wähle mindestens ein Thema aus.')
      return
    }
    try {
      await setGoal.mutateAsync({
        topics: selectedTopics,
        examDate: examDate || null,
      })
      setSuccess(true)
    } catch (err: unknown) {
      setValidationError((err as Error).message)
    }
  }

  if (isLoading) return <div className="p-8 text-slate-400">Laden…</div>

  const leitideen = Object.keys(tree)

  return (
    <div className="p-6 flex flex-col gap-6 max-w-2xl">
      <h1 className="text-xl font-semibold text-white">Lernziele</h1>

      {/* Search */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="topicSearch">Themen durchsuchen</Label>
        <Input
          id="topicSearch"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Thema suchen…"
        />
      </div>

      {/* Topic tree */}
      <div className="flex flex-col gap-4 bg-[#101828] rounded-xl border border-slate-800 p-4">
        {leitideen.length === 0 ? (
          <p className="text-slate-500 text-sm">
            Noch keine Themen geübt — erst wenn Schüler gearbeitet haben, erscheinen hier Themen.
          </p>
        ) : (
          leitideen.map((leitidee) => (
            <div key={leitidee}>
              <p className="text-slate-300 font-medium mb-2">{leitidee}</p>
              {Object.entries(tree[leitidee]).map(([thema, unterthemen]) => {
                const filtered = unterthemen.filter((tk) =>
                  search.length === 0 ||
                  tk.unterthema.toLowerCase().includes(search.toLowerCase()) ||
                  tk.thema.toLowerCase().includes(search.toLowerCase())
                )
                if (filtered.length === 0) return null
                return (
                  <div key={thema} className="ml-4 mb-3">
                    <p className="text-slate-400 text-sm mb-1">{thema}</p>
                    <div className="ml-4 flex flex-col gap-1">
                      {filtered.map((tk) => {
                        const checkboxId = `topic-${tk.leitidee}-${tk.thema}-${tk.unterthema}`
                        return (
                          <div key={tk.unterthema} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={checkboxId}
                              aria-label={tk.unterthema}
                              checked={isSelected(tk)}
                              onChange={() => toggleTopic(tk)}
                              className="w-4 h-4 accent-blue-500"
                            />
                            <label
                              htmlFor={checkboxId}
                              className="text-slate-300 text-sm cursor-pointer"
                            >
                              {tk.unterthema}
                            </label>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>

      {/* Exam date */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="examDate">Prüfungsdatum (optional)</Label>
        <Input
          id="examDate"
          type="date"
          value={examDate}
          onChange={(e) => setExamDate(e.target.value)}
          className="w-48"
        />
      </div>

      {validationError && <p className="text-red-400 text-sm">{validationError}</p>}
      {success && (
        <p className="text-green-400 text-sm">Lernziel gespeichert ✓</p>
      )}

      <Button
        onClick={handleSave}
        disabled={setGoal.isPending}
        className="w-fit"
      >
        {setGoal.isPending ? 'Speichern…' : 'Speichern'}
      </Button>
    </div>
  )
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- --run src/pages/Lernziele.test.tsx
```

Expected: `Tests 3 passed (3)`.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Lernziele.tsx src/pages/Lernziele.test.tsx
git commit -m "feat: implement Lernziele page with topic picker and exam date"
```

---

## Task 16: Einstellungen Page

**Files:**
- Modify: `src/pages/Einstellungen.tsx`
- Create: `src/pages/Einstellungen.test.tsx`

- [ ] **Step 1: Write failing tests** in `src/pages/Einstellungen.test.tsx`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { TeacherDoc, ClassDoc } from '../types'

const mockTeacher: TeacherDoc = {
  uid: 'teacher-1',
  displayName: 'Frau Müller',
  email: 'mueller@mvl-gym.de',
  schoolId: 'mvl',
  classIds: ['cls-1'],
  theme: 'dark',
  createdAt: '2026-01-01T00:00:00Z',
}

const mockClass: ClassDoc = {
  id: 'cls-1',
  name: '11a',
  teacherId: 'teacher-1',
  schoolId: 'mvl',
  studentIds: [],
  gridConfig: { rows: 4, cols: 5 },
  deskPositions: {},
  createdAt: '',
  updatedAt: '',
}

const mockUpdateTeacher = vi.fn()
const mockInviteStudent = vi.fn()

vi.mock('../api/hooks', () => ({
  useTeacher: vi.fn().mockReturnValue({ data: mockTeacher }),
  useClasses: vi.fn().mockReturnValue({ data: [mockClass] }),
}))

vi.mock('../api/mutations', () => ({
  useUpdateTeacher: vi.fn(() => ({
    mutateAsync: mockUpdateTeacher.mockResolvedValue({ ...mockTeacher, displayName: 'Herr Müller' }),
    isPending: false,
  })),
  useInviteStudent: vi.fn(() => ({
    mutateAsync: mockInviteStudent.mockResolvedValue({ uid: 'new-stu', email: 'test@mvl-gym.de' }),
    isPending: false,
  })),
  useAddStudents: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  })),
  useCreateClass: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue(mockClass),
    isPending: false,
  })),
  useDeleteClass: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}))

vi.mock('../store', () => ({
  useStore: vi.fn((selector: (s: object) => unknown) =>
    selector({
      theme: 'dark',
      setTheme: vi.fn(),
      selectedClassId: 'cls-1',
    })
  ),
}))

import { Einstellungen } from './Einstellungen'

describe('Einstellungen', () => {
  beforeEach(() => {
    mockUpdateTeacher.mockClear()
    mockInviteStudent.mockClear()
  })

  it('shows the current display name', () => {
    render(<Einstellungen />)
    expect(screen.getByDisplayValue('Frau Müller')).toBeInTheDocument()
  })

  it('saves updated display name', async () => {
    render(<Einstellungen />)
    const input = screen.getByDisplayValue('Frau Müller')
    await userEvent.clear(input)
    await userEvent.type(input, 'Herr Müller')
    await userEvent.click(screen.getByRole('button', { name: /profil speichern/i }))
    await waitFor(() =>
      expect(mockUpdateTeacher).toHaveBeenCalledWith(
        expect.objectContaining({ displayName: 'Herr Müller' })
      )
    )
  })

  it('shows existing class in class list', () => {
    render(<Einstellungen />)
    expect(screen.getByText('11a')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- --run src/pages/Einstellungen.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Write `src/pages/Einstellungen.tsx`**

```typescript
import { useState } from 'react'
import { useTeacher, useClasses } from '../api/hooks'
import { useUpdateTeacher, useInviteStudent, useAddStudents, useCreateClass, useDeleteClass } from '../api/mutations'
import { useStore } from '../store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiFetch } from '../api/client'

export function Einstellungen() {
  const { data: teacher } = useTeacher()
  const theme = useStore((s) => s.theme)
  const setStoreTheme = useStore((s) => s.setTheme)

  const { data: classes = [] } = useClasses(teacher?.classIds ?? [])

  const updateTeacher = useUpdateTeacher()
  const createClass = useCreateClass()
  const deleteClass = useDeleteClass()
  const inviteStudent = useInviteStudent()

  const [displayName, setDisplayName] = useState(teacher?.displayName ?? '')
  const [profileSaved, setProfileSaved] = useState(false)

  // New class form
  const [newClassName, setNewClassName] = useState('')
  const [newClassRows, setNewClassRows] = useState(4)
  const [newClassCols, setNewClassCols] = useState(5)

  // Invite student form
  const [inviteEmails, setInviteEmails] = useState('')
  const [inviteClassId, setInviteClassId] = useState(teacher?.classIds[0] ?? '')
  const [inviteStatus, setInviteStatus] = useState<string | null>(null)

  async function handleSaveProfile() {
    setProfileSaved(false)
    await updateTeacher.mutateAsync({ displayName: displayName.trim(), theme })
    setProfileSaved(true)
  }

  async function handleThemeChange(t: 'dark' | 'light') {
    setStoreTheme(t)
    document.documentElement.classList.toggle('dark', t === 'dark')
    await updateTeacher.mutateAsync({ theme: t })
  }

  async function handleCreateClass() {
    if (!newClassName.trim()) return
    await createClass.mutateAsync({
      name: newClassName.trim(),
      gridConfig: { rows: newClassRows, cols: newClassCols },
    })
    setNewClassName('')
  }

  async function handleInvite() {
    setInviteStatus(null)
    const emails = inviteEmails.split('\n').map((e) => e.trim()).filter(Boolean)
    if (emails.length === 0 || !inviteClassId) return
    const uids: string[] = []
    for (const email of emails) {
      try {
        const result = await inviteStudent.mutateAsync({ email })
        uids.push(result.uid)
      } catch {
        // skip
      }
    }
    if (uids.length > 0) {
      await apiFetch(`/api/teacher/class/${inviteClassId}/students`, {
        method: 'POST',
        body: JSON.stringify({ studentIds: uids }),
      })
    }
    setInviteEmails('')
    setInviteStatus(`${uids.length} Schüler eingeladen.`)
  }

  return (
    <div className="p-6 flex flex-col gap-8 max-w-2xl">
      <h1 className="text-xl font-semibold text-white">Einstellungen</h1>

      {/* Profile */}
      <section className="bg-[#101828] rounded-xl border border-slate-800 p-6 flex flex-col gap-4">
        <h2 className="text-lg font-medium text-white">Profil</h2>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="profileName">Anzeigename</Label>
          <Input
            id="profileName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>
        {profileSaved && <p className="text-green-400 text-sm">Gespeichert ✓</p>}
        <Button
          onClick={handleSaveProfile}
          disabled={updateTeacher.isPending}
          className="w-fit"
        >
          Profil speichern
        </Button>
      </section>

      {/* Theme */}
      <section className="bg-[#101828] rounded-xl border border-slate-800 p-6 flex flex-col gap-4">
        <h2 className="text-lg font-medium text-white">Darstellung</h2>
        <div className="flex gap-3">
          {(['dark', 'light'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => handleThemeChange(t)}
              className={`flex-1 py-2 rounded-lg border text-sm transition-colors ${
                theme === t
                  ? 'border-blue-500 bg-blue-600/20 text-white'
                  : 'border-slate-700 text-slate-400 hover:border-slate-500'
              }`}
            >
              {t === 'dark' ? 'Dunkel' : 'Hell'}
            </button>
          ))}
        </div>
      </section>

      {/* Classes */}
      <section className="bg-[#101828] rounded-xl border border-slate-800 p-6 flex flex-col gap-4">
        <h2 className="text-lg font-medium text-white">Klassen verwalten</h2>
        <div className="flex flex-col gap-2">
          {classes.map((cls) => (
            <div
              key={cls.id}
              className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0"
            >
              <span className="text-slate-300">{cls.name}</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500/70 hover:text-red-400"
                onClick={() => deleteClass.mutate(cls.id)}
              >
                Löschen
              </Button>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-slate-800 flex flex-col gap-3">
          <p className="text-sm text-slate-400">Neue Klasse anlegen</p>
          <div className="flex gap-3">
            <Input
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              placeholder="Klassenname, z.B. 12b"
              className="flex-1"
            />
            <Input
              type="number"
              min={1}
              max={8}
              value={newClassRows}
              onChange={(e) => setNewClassRows(Number(e.target.value))}
              className="w-20"
              aria-label="Reihen"
            />
            <Input
              type="number"
              min={1}
              max={8}
              value={newClassCols}
              onChange={(e) => setNewClassCols(Number(e.target.value))}
              className="w-20"
              aria-label="Spalten"
            />
            <Button onClick={handleCreateClass} disabled={!newClassName.trim()}>
              Anlegen
            </Button>
          </div>
        </div>
      </section>

      {/* Invite students */}
      <section className="bg-[#101828] rounded-xl border border-slate-800 p-6 flex flex-col gap-4">
        <h2 className="text-lg font-medium text-white">Schüler einladen</h2>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="inviteClass">Klasse</Label>
          <select
            id="inviteClass"
            value={inviteClassId}
            onChange={(e) => setInviteClassId(e.target.value)}
            className="bg-[#0d1117] text-white border border-slate-700 rounded-lg px-3 py-2 text-sm"
          >
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="inviteEmails">E-Mail-Adressen (eine pro Zeile)</Label>
          <textarea
            id="inviteEmails"
            value={inviteEmails}
            onChange={(e) => setInviteEmails(e.target.value)}
            placeholder="anna@mvl-gym.de&#10;ben@mvl-gym.de"
            rows={4}
            className="w-full bg-[#0d1117] text-white border border-slate-700 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-blue-500"
          />
        </div>
        {inviteStatus && <p className="text-green-400 text-sm">{inviteStatus}</p>}
        <Button
          onClick={handleInvite}
          disabled={inviteStudent.isPending || !inviteEmails.trim()}
          className="w-fit"
        >
          Einladen
        </Button>
      </section>
    </div>
  )
}
```

- [ ] **Step 4: Run tests**

```bash
npm test -- --run src/pages/Einstellungen.test.tsx
```

Expected: `Tests 3 passed (3)`.

- [ ] **Step 5: Run the full test suite**

```bash
npm test -- --run
```

Expected: All test files pass. Count varies but no failures.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Einstellungen.tsx src/pages/Einstellungen.test.tsx
git commit -m "feat: implement Einstellungen page with profile, theme, and class management"
```

---

## Self-Review

### 1. Spec Coverage Check

| Spec section | Covered by task |
|---|---|
| §4 Auth — Firebase ID token, teacher claim | Task 5 (FirebaseAuthGuard + App.tsx) |
| §6 Navigation — sidebar, class selector | Task 6 |
| §7.1 Klassenraum — grid, edit mode, configure modal, alert pill | Tasks 8–10 |
| §7.2 Live Monitor — polling 5s, session ring, beamer mode | Tasks 8, 11 |
| §7.3 Analytik — summary cards, topic bar chart, Wissenslücke | Task 12 |
| §7.4 Schüler — roster table + student detail panel | Tasks 13–14 |
| §7.5 Lernziele — topic picker tree, exam date, save | Task 15 |
| §7.6 Einstellungen — profile, theme, class mgmt, invite | Task 16 |
| §7.7 Onboarding wizard — 3 steps, teacher + class creation | Task 7 |
| §9 Zustand store | Task 2 |
| §9 TanStack Query hooks with refetchInterval | Task 4 |
| DeskTile — 108×66, status colours, name, time | Task 8 |
| Session progress ring | Task 8 |
| Alert pill (≥1 struggling, currentTopic) | Task 8 |
| Drag-and-drop with snap + swap | Task 9 |
| Alphabetical initial sort | Task 9 (assignMissingPositions) |
| Beamer mode pseudonyms by desk position | Task 11 |
| AI assessment (POST + session cache) | Task 13 |
| Password reset button | Task 13 |
| Dark/light theme toggle | Tasks 2, 5, 7, 16 |
| POST /api/teacher/me backend fix | Task 0 |

All spec requirements are covered. ✓

### 2. Placeholder Scan

No "TBD", "TODO", or "implement later" found. All steps contain actual code. ✓

### 3. Type Consistency

- `StudentSummary.sessionProgress` — defined in Task 2, used in Tasks 8, 9, 11. ✓
- `ClassDoc.deskPositions` — defined in Task 2, used in Tasks 9, 10. ✓
- `useStudents(classId, refetchInterval)` — signature defined in Task 4, called with `5_000` in Task 11 and `30_000` in Task 10. ✓
- `assignMissingPositions` — defined and exported from `ClassroomGrid.tsx` in Task 9. Not called elsewhere (used internally). ✓
- `DeskTile` accepts optional `extraContent` prop — defined in Task 8, used in Task 9 for session ring. ✓
- `apiFetch` called directly in Tasks 7, 16 for operations that don't need a mutation hook. ✓
