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
