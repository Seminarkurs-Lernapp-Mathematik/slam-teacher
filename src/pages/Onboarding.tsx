import { useState } from 'react'
import { auth } from '../firebase'
import { useStore } from '../store'
import { useCreateTeacher, useCreateClass, useInviteStudent } from '../api/mutations'
import { apiFetch } from '../api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Theme = 'dark' | 'light'

export function Onboarding() {
  const [step, setStep] = useState(1)
  const [displayName, setDisplayName] = useState('')
  const [theme, setThemeState] = useState<Theme>('dark')
  const [classNameValue, setClassNameValue] = useState('')
  const [rows, setRows] = useState(4)
  const [cols, setCols] = useState(5)
  const [emailsRaw, setEmailsRaw] = useState('')
  const [error, setError] = useState<string | null>(null)

  const setStoreTheme = useStore((s) => s.setTheme)
  const setSelectedClassId = useStore((s) => s.setSelectedClassId)

  const createTeacher = useCreateTeacher()
  const createClass = useCreateClass()
  const inviteStudent = useInviteStudent()

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
        name: classNameValue.trim(),
        gridConfig: { rows, cols },
      })

      const emails = emailsRaw
        .split('\n')
        .map((e) => e.trim())
        .filter((e) => e.length > 0)

      if (emails.length > 0) {
        const invitedUids: string[] = []
        for (const email of emails) {
          try {
            const result = await inviteStudent.mutateAsync({ email })
            invitedUids.push(result.uid)
          } catch {
            // skip failed invites
          }
        }
        if (invitedUids.length > 0) {
          await apiFetch(`/api/teacher/class/${cls.id}/students`, {
            method: 'POST',
            body: JSON.stringify({ studentIds: invitedUids }),
          })
        }
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
        {/* Progress bar */}
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
            onNext={() => { if (displayName.trim()) setStep(2) }}
          />
        )}
        {step === 2 && (
          <Step2
            classNameValue={classNameValue}
            rows={rows}
            cols={cols}
            onClassNameChange={setClassNameValue}
            onRowsChange={setRows}
            onColsChange={setCols}
            onNext={() => { if (classNameValue.trim()) setStep(3) }}
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
  displayName: string; theme: Theme
  onDisplayNameChange: (v: string) => void; onThemeChange: (v: Theme) => void
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
  classNameValue, rows, cols, onClassNameChange, onRowsChange, onColsChange, onNext,
}: {
  classNameValue: string; rows: number; cols: number
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
          value={classNameValue}
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
      <Button onClick={onNext} disabled={!classNameValue.trim()}>Weiter</Button>
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
          placeholder={"anna.mueller@mvl-gym.de\nben.schmidt@mvl-gym.de"}
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
