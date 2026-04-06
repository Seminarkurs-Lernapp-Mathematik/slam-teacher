import { useEffect, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from './firebase'
import { useStore } from './store'
import { ApiError } from './api/client'
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
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <p className="text-slate-400">Laden…</p>
      </div>
    )
  }

  // 404 from /api/teacher/me means first login → onboarding
  // Other errors (500, network failure) show an error message instead
  if (isError) {
    if (error instanceof ApiError && error.status === 404) {
      return <Onboarding />
    }
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <p className="text-red-400">Fehler beim Laden. Bitte Seite neu laden.</p>
      </div>
    )
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
