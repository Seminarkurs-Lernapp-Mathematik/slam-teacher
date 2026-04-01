# Learn Smart Teacher Dashboard — Design Spec
**Date:** 2026-03-31  
**Repos in scope:** `slam-teacher` (new React app), `slam-backend` (new endpoints)  
**Status:** Approved for implementation

---

## 1. Overview

The Teacher Dashboard transforms Learn Smart from a student-only app into a full school product. It is a **desktop-first React web application** that gives teachers control, deep insights, and transparency into the AI's behaviour — building trust and enabling them to guide their students' learning paths.

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Framework | React 18 + TypeScript |
| Build tool | Vite |
| Styling | Tailwind CSS |
| Components | shadcn/ui |
| Server state | TanStack Query (React Query v5) |
| UI state | Zustand |
| Routing | React Router v6 |
| Auth | Firebase Auth JS SDK (ID token → backend) |
| Data | All reads/writes via `slam-backend` REST API |
| Real-time | Polling (TanStack Query `refetchInterval`) |

---

## 3. Visual Design

- **Dark mode default**, light mode available — user chooses during onboarding, toggleable in settings
- **Primary accent:** Royal Blue `#2563EB`
- **Background:** `#101828` (room), `#0d1117` (page)
- **Status colours:** Green `#22c55e` (active), Amber `#f59e0b` (idle), Red `#ef4444` (struggling), Slate (offline)
- **Typography:** System font stack (`-apple-system`, `BlinkMacSystemFont`, `Segoe UI`)
- **Radius:** 8–12px on tiles and cards; friendlier than sharp corners
- **Language:** German throughout (UI labels, messages, AI output)

---

## 4. Authentication

- Teachers log in with their `@mvl-gym.de` Firebase account
- Firebase Custom Claim `{ role: "teacher" }` must be set on their user (via Firebase Console or Admin SDK script)
- On every API call the frontend sends the Firebase **ID token** in `Authorization: Bearer <token>`
- The backend verifies the token and checks the `role: "teacher"` claim before processing any `/api/teacher/*` request
- On first login (no `teachers/{uid}` Firestore doc exists), the onboarding wizard runs

---

## 5. Data Model

### Firestore: `classes/{nanoid}`
```ts
{
  id: string;           // nanoid — globally unique, safe for multi-tenancy
  name: string;         // human label e.g. "11a"
  teacherId: string;    // Firebase UID
  schoolId: string;     // stubbed as "mvl" for now; multi-tenancy hook
  studentIds: string[]; // Firebase UIDs of enrolled students
  gridConfig: {
    rows: number;       // 1–8
    cols: number;       // 1–8
  };
  deskPositions: {
    [userId: string]: { col: number; row: number };
  };
  createdAt: string;    // ISO 8601
  updatedAt: string;
}
```

### Firestore: `classGoals/{classId}`
```ts
{
  classId: string;
  teacherId: string;
  topics: Array<{
    leitidee: string;
    thema: string;
    unterthema: string;
  }>;
  examDate: string | null;  // ISO 8601 date
  setAt: string;
}
```

### Firestore: `teachers/{uid}`
```ts
{
  uid: string;          // Firebase UID
  displayName: string;
  email: string;
  schoolId: string;     // "mvl" initially
  classIds: string[];   // nanoid class IDs this teacher owns
  theme: 'dark' | 'light';
  createdAt: string;
}
```
Absence of this document triggers the onboarding wizard on first login.

Students already live at `users/{userId}` with subcollections `questionHistory`, `topicProgress`, `learningSessions` — no changes to the student data model.

---

## 6. Navigation

**Wide sidebar** (icon + label always visible) with a **class selector dropdown** at the top.

| Route | Label | Icon |
|---|---|---|
| `/` | Klassenraum | 🏫 |
| `/monitor` | Live Monitor | 📡 |
| `/analytik` | Analytik | 📊 |
| `/schueler` | Schüler | 👤 |
| `/lernziele` | Lernziele | 🎯 |
| `/einstellungen` | Einstellungen | ⚙ |

---

## 7. Screens

### 7.1 Klassenraum (Dashboard Home)

**Concept:** Top-down 2D classroom view. Each enrolled student is represented by a rectangular desk tile placed on a grid inside a "room" frame.

**Room layout:**
- Top wall: **Tafel** (board, blue accent)
- Generous walkway margins on all four sides
- Student tiles centered within the room
- No teacher desk element

**Desk tile** (108×66px):
- Student name
- Status label + coloured dot (Aktiv / Idle / Kämpft / Offline)
- Time since last activity

**Status colours on tile:**
- Aktiv → green border + glow
- Kämpft → red border + pulsing dot
- Idle → amber border
- Offline → muted/dimmed tile

**Alert pill** in page header: "N Schüler kämpfen mit `<Thema>`" — shown when ≥ 1 student has accuracy < 50% for > 15 min.

**Edit mode:**
- "✎ Bearbeiten" button in header activates drag mode
- Tiles snap to grid; a dashed blue ghost shows snap target
- Dropping on an occupied slot swaps the two students
- Edit mode banner shown inside the room while active

**Configure button:** Opens modal to set rows × columns. On apply, students are re-arranged alphabetically from the top-left slot. Existing manual positions are reset.

**Initial sort:** Alphabetical by last name when a student is first added to a class.

**Clicking a tile** opens the Student Detail Panel (see §7.4).

---

### 7.2 Live Monitor

Same spatial classroom grid as §7.1 plus:
- TanStack Query polls `/api/teacher/class/:classId/students` every **5 seconds**
- Each tile additionally shows a **session progress ring** (questions answered / total in current session)
- Real-time accuracy counter updates in place without re-mounting tiles

**Beamer-Modus toggle** (prominent button in header):
- Replaces all student names with `Schüler 1`, `Schüler 2`, … (sorted by current desk position)
- Hides accuracy numbers
- Pseudonyms are deterministic per session (same student always gets same number within a session)
- Toggle state stored in Zustand (`beamerMode: boolean`)

---

### 7.3 Analytik

Two sections on one page:

**Klassen-Übersicht (summary cards):**
- Questions answered today / this week
- Class average accuracy (%)
- Average daily streak across students
- Number of active students today

**Themen-Analyse (topic breakdown):**
- Horizontal bar chart, one bar per topic
- Each bar split into correct (green) vs. incorrect (red) answers
- Topics with class accuracy < 60% automatically labelled **"Wissenslücke ⚠"**
- Aggregated from all students' `questionHistory` via backend endpoint

---

### 7.4 Schüler (Roster + Student Detail)

**Roster view:** Table with columns: Name, Class, Last active, Accuracy (7-day), Streak, Actions.  
Actions per row: View detail, Reset password, Move to class, Remove.

**Student Detail Panel:** Slides in from the right (does not navigate away). Contains:

1. **Header** — name, class, last active, streak, total XP
2. **AI Assessment** — "Was denkt die KI über diesen Schüler?" prose paragraph, generated on-demand by calling `POST /api/teacher/student/:userId/ai-assessment`. Shows a loading skeleton while generating. Cached per session (don't regenerate on panel close/reopen within same browser session).
3. **Live Feed Log** — last 20 question attempts, each showing:
   - Question text (truncated)
   - Student's answer
   - ✓ / ✗ with AI feedback text
   - Hints used, time spent
4. **Topic accuracy mini-chart** — bar per topic
5. **"Passwort zurücksetzen"** button at bottom — calls `POST /api/teacher/student/reset-password`

---

### 7.5 Lernziele

Form per class:
- **Topic picker** — searchable tree: leitidee → thema → unterthema (populated from `GET /api/teacher/class/:classId/analytics` — uses the `topics` array already returned; only shows topics students have actually practiced for the selected class)
- **Prüfungsdatum** — date picker
- **Speichern** calls `POST /api/teacher/class/:classId/goal` which writes to `classGoals/{classId}`

The **student app** reads `classGoals/{classId}` on startup (student knows their `classId`) and overrides their personal learning plan priority accordingly. The backend already supports priority-based topic ordering in `manageLearningPlan`. *(Student app integration is out of scope for this dashboard build — stubbed as a Firestore write that the app will later consume.)*

---

### 7.6 Einstellungen

- **Profil:** Display name
- **Darstellung:** Light / Dark mode toggle
- **Klassen verwalten:** List of teacher's classes; rename, delete, create new
- **Schüler einladen:** Enter `@mvl-gym.de` email → backend calls Firebase Admin to create user + send password setup email
- **Passwort zurücksetzen (bulk):** Select students → reset all

---

### 7.7 Onboarding Wizard (first login)

Three-step wizard shown when `teachers/{uid}` doc does not exist:

1. **Willkommen** — Enter display name; choose Light / Dark mode
2. **Klasse erstellen** — Enter class name (e.g. "11a"); set rows × columns grid
3. **Schüler hinzufügen** — Enter or paste `@mvl-gym.de` email addresses (one per line); backend creates accounts and sends setup emails

On completion: `teachers/{uid}` doc created, `classes/{nanoid}` doc created, Zustand hydrated.

---

## 8. New Backend Endpoints (`slam-backend`)

All endpoints under `/api/teacher/`. All require `Authorization: Bearer <firebase-id-token>` with `role: "teacher"` claim.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/teacher/class/:classId/students` | Roster + latest stats for all students in class |
| `GET` | `/api/teacher/class/:classId/analytics` | Topic-level aggregated accuracy across all students |
| `GET` | `/api/teacher/class/:classId/feed` | Last N question results across all students (live feed) |
| `POST` | `/api/teacher/student/:userId/ai-assessment` | Generate AI prose assessment via Claude |
| `POST` | `/api/teacher/class/:classId/goal` | Write classGoal to Firestore |
| `PATCH` | `/api/teacher/class/:classId` | Update class config (name, gridConfig, deskPositions) |
| `POST` | `/api/teacher/class` | Create new class |
| `DELETE` | `/api/teacher/class/:classId` | Delete class |
| `POST` | `/api/teacher/class/:classId/students` | Add student(s) to class |
| `DELETE` | `/api/teacher/class/:classId/students/:userId` | Remove student from class |
| `POST` | `/api/teacher/student/invite` | Create Firebase user + send password setup email |
| `POST` | `/api/teacher/student/reset-password` | Send Firebase password reset email |
| `GET` | `/api/teacher/me` | Get teacher profile + list of class IDs |
| `PUT` | `/api/teacher/me` | Update teacher profile (name, theme) |

**Middleware:** A single `requireTeacher` Hono middleware validates the Firebase ID token and custom claim. Applied to all `/api/teacher/*` routes.

### AI Assessment prompt (Claude)
Reads the student's last 50 `questionHistory` entries from Firestore, then calls Claude with:
> "Du bist ein erfahrener Mathematiklehrer. Analysiere folgende Lernhistorie eines Schülers und erstelle eine kurze Einschätzung (3–4 Sätze) mit: Stärken, wiederkehrenden Flüchtigkeitsfehlern, und einer konkreten Empfehlung für die Lehrkraft."

Response is plain German prose, max ~200 words.

---

## 9. State Management

**Zustand store:**
```ts
{
  selectedClassId: string | null;
  beamerMode: boolean;
  theme: 'dark' | 'light';
  activePanelStudentId: string | null;  // drives student detail panel
  editMode: boolean;                    // classroom edit mode
}
```

**TanStack Query:**
- `useStudents(classId)` — polls every 5s on Live Monitor, 30s on Klassenraum
- `useAnalytics(classId)` — 60s stale time
- `useStudentFeed(userId)` — per-student, fetched on panel open
- `useAiAssessment(userId)` — fetched on panel open, cached in query cache

---

## 10. Key UX Decisions

| Decision | Rationale |
|---|---|
| Sliding panel instead of page nav for student detail | Keeps classroom/roster context visible; teacher stays oriented |
| Polling not WebSockets | Cloudflare Workers + Hono; no persistent connections needed for 5s UX requirement |
| nanoid for class IDs | Globally unique; safe for future multi-school / SaaS expansion |
| Firebase Custom Claims for auth | No separate user store needed; leverages existing Firebase setup |
| classGoals as Firestore write | Student app integration is a future step; dashboard just writes the doc |
| Beamer pseudonyms by desk position | Deterministic and intuitive — teacher knows "Schüler 3 = front-left" |

---

## 11. Out of Scope (this iteration)

- Student app changes to read `classGoals` (separate PR)
- Multi-school / `schoolId` enforcement (field stubbed, not enforced)
- Push notifications to teachers
- Parent portal
- Grading / formal assessment export
