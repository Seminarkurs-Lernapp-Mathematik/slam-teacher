import { useStore } from '../store'
import { useStudents, useClasses } from '../api/hooks'
import { useRemoveStudent, useResetPassword } from '../api/mutations'
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
  const { data: classes = [], isLoading: classesLoading } = useClasses(selectedClassId ? [selectedClassId] : [])
  const classDoc = classes[0]
  const removeStudent = useRemoveStudent(selectedClassId ?? '')
  const resetPassword = useResetPassword()

  if (!selectedClassId) return <div className="p-8 text-slate-400">Keine Klasse ausgewählt</div>
  if (isLoading || classesLoading) return <div className="p-8 text-slate-400">Laden…</div>
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
              <TableHead className="text-slate-400">Klasse</TableHead>
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
                <TableCell className="text-slate-400 text-sm">{classDoc.name}</TableCell>
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
                      className="text-slate-400 hover:text-white"
                      disabled={resetPassword.isPending}
                      onClick={() => resetPassword.mutate(s.email)}
                    >
                      Passwort
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
