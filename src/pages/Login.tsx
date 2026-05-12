import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../firebase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function Login() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const normalizedEmail = String(formData.get('email') ?? '').trim()
    const password = String(formData.get('password') ?? '')
    try {
      await signInWithEmailAndPassword(auth, normalizedEmail, password)
    } catch (err: any) {
      let errorMessage = 'Anmeldung fehlgeschlagen'
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        errorMessage = 'E-Mail oder Passwort ist falsch.'
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Zu viele Fehlversuche. Bitte später erneut versuchen.'
      } else if (err.message) {
        errorMessage = err.message
      }
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-full max-w-sm p-8 bg-card rounded-2xl border border-border shadow-lg">
        <h1 className="text-2xl font-bold text-card-foreground mb-6">Learn Smart</h1>
        <p className="text-muted-foreground mb-6 text-sm">Anmeldung für Lehrkräfte</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="name@mvl-gym.de"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Passwort</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
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
