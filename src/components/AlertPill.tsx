import type { StudentSummary } from '../types'

interface Props {
  students: StudentSummary[]
}

export function AlertPill({ students }: Props) {
  const struggling = students.filter((s) => s.status === 'struggling')
  if (struggling.length === 0) return null

  const topics = [...new Set(struggling.map((s) => s.currentTopic).filter(Boolean))]
  const topicText = topics[0] ?? 'unbekanntem Thema'

  return (
    <div className="flex items-center gap-2 bg-red-950 border border-red-800 text-red-400 text-sm rounded-full px-4 py-1">
      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-none" />
      <span>
        {struggling.length} Schüler kämpfen mit{' '}
        <strong className="text-red-300">{topicText}</strong>
      </span>
    </div>
  )
}
