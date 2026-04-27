import { lazy, Suspense, useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from './firebase'
import { useStore } from './store'
import { ApiError } from './api/client'
import { useTeacher } from './api/hooks'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'

// Lazy load heavy pages for code splitting
const Onboarding = lazy(() => import('./pages/Onboarding').then(m => ({ default: m.Onboarding })))
const Klassenraum = lazy(() => import('./pages/Klassenraum').then(m => ({ default: m.Klassenraum })))
const LiveMonitor = lazy(() => import('./pages/LiveMonitor').then(m => ({ default: m.LiveMonitor })))
const Analytik = lazy(() => import('./pages/Analytik').then(m => ({ default: m.Analytik })))
const Schueler = lazy(() => import('./pages/Schueler').then(m => ({ default: m.Schueler })))
const Lernziele = lazy(() => import('./pages/Lernziele').then(m => ({ default: m.Lernziele })))
const Einstellungen = lazy(() => import('./pages/Einstellungen').then(m => ({ default: m.Einstellungen })))

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
      <p className="text-slate-400">Laden…</p>
    </div>
  )
}

function AuthenticatedApp() {
  const { data: teacher, isLoading, isError, error } = useTeacher()
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
    return <LoadingFallback />
  }

  // 404 from /api/teacher/me means first login → onboarding
  // Other errors (500, network failure) show an error message instead
  if (isError) {
    if (error instanceof ApiError && error.status === 404) {
      return (
        <Suspense fallback={<LoadingFallback />}>
          <Onboarding />
        </Suspense>
      )
    }
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <p className="text-red-400">Fehler beim Laden. Bitte Seite neu laden.</p>
      </div>
    )
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
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
    </Suspense>
  )
}

function FirebaseAuthGuard() {
  const [user, setUser] = useState<User | null | 'loading'>('loading')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u))
    return unsub
  }, [])

  if (user === 'loading') {
    return <LoadingFallback />
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
