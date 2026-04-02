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
  const { data: students = [], isFetching } = useStudents(selectedClassId, 5_000)
  const { data: classes = [] } = useClasses(selectedClassId ? [selectedClassId] : [])
  const classDoc = classes[0]

  if (!selectedClassId) return <div className="p-8 text-slate-400">Keine Klasse ausgewählt</div>
  if (!classDoc) return <div className="p-8 text-slate-400">Laden…</div>

  return (
    <div className="p-6 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold text-white flex-1">
          Live Monitor – {classDoc.name}
        </h1>
        {isFetching && (
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
