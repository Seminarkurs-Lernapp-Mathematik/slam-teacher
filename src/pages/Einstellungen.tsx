import { useState, useEffect } from 'react'
import { useTeacher, useClasses } from '../api/hooks'
import { useUpdateTeacher, useInviteStudent, useCreateClass, useDeleteClass } from '../api/mutations'
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

  const [displayName, setDisplayName] = useState('')
  const [profileSaved, setProfileSaved] = useState(false)

  // New class form
  const [newClassName, setNewClassName] = useState('')
  const [newClassRows, setNewClassRows] = useState(4)
  const [newClassCols, setNewClassCols] = useState(5)

  // Invite student form
  const [inviteEmails, setInviteEmails] = useState('')
  const [inviteClassId, setInviteClassId] = useState('')
  const [inviteStatus, setInviteStatus] = useState<string | null>(null)

  // Sync async-loaded teacher data into controlled inputs
  useEffect(() => {
    if (teacher) {
      setDisplayName(teacher.displayName)
      setInviteClassId((prev) => prev || (teacher.classIds[0] ?? ''))
    }
  }, [teacher])

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
