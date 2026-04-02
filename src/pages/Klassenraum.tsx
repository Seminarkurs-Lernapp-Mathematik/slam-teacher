import { useState, useEffect } from 'react'
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
  const { data: classes = [], isLoading: classesLoading } = useClasses(selectedClassId ? [selectedClassId] : [])
  const classDoc = classes[0]
  const updateClass = useUpdateClass(selectedClassId ?? '')

  const [configOpen, setConfigOpen] = useState(false)
  const [configRows, setConfigRows] = useState(4)
  const [configCols, setConfigCols] = useState(5)

  useEffect(() => {
    if (classDoc) {
      setConfigRows(classDoc.gridConfig.rows)
      setConfigCols(classDoc.gridConfig.cols)
    }
  }, [classDoc])

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

  if (!selectedClassId) return <div className="p-8 text-slate-400">Keine Klasse ausgewählt</div>
  if (classesLoading) return <div className="p-8 text-slate-400">Laden…</div>
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
