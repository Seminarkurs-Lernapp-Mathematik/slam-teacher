import { useStore } from '../store'
import { useAnalytics } from '../api/hooks'
import type { TopicAccuracy, AnalyticsSummary } from '../types'

export function Analytik() {
  const selectedClassId = useStore((s) => s.selectedClassId)
  const { data, isLoading } = useAnalytics(selectedClassId)

  if (isLoading || !data) {
    return <div className="p-8 text-slate-400">Laden…</div>
  }

  return (
    <div className="p-6 flex flex-col gap-8">
      <h1 className="text-xl font-semibold text-white">Analytik</h1>

      <SummaryCards summary={data.summary} />

      <section>
        <h2 className="text-lg font-medium text-white mb-4">Themen-Analyse</h2>
        <TopicChart topics={data.topics} />
      </section>
    </div>
  )
}

function SummaryCards({ summary }: { summary: AnalyticsSummary }) {
  const cards = [
    { label: 'Fragen heute', value: String(summary.questionsToday) },
    { label: 'Fragen diese Woche', value: String(summary.questionsThisWeek) },
    { label: 'Ø Klassengenauigkeit', value: `${summary.classAverageAccuracy} %` },
    { label: 'Ø Streak', value: `${summary.avgDailyStreak} Tage` },
    { label: 'Aktive Schüler heute', value: String(summary.activeStudentsToday) },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map(({ label, value }) => (
        <div
          key={label}
          className="bg-[#101828] rounded-xl border border-slate-800 p-4 flex flex-col gap-1"
        >
          <p className="text-slate-400 text-xs">{label}</p>
          <p className="text-white text-2xl font-bold">{value}</p>
        </div>
      ))}
    </div>
  )
}

function TopicChart({ topics }: { topics: TopicAccuracy[] }) {
  if (topics.length === 0) {
    return <p className="text-slate-500 text-sm">Noch keine Daten</p>
  }

  const maxTotal = Math.max(...topics.map((t) => t.correct + t.incorrect))

  return (
    <div className="flex flex-col gap-3">
      {topics.map((t) => {
        const total = t.correct + t.incorrect

        return (
          <div key={`${t.leitidee}|${t.thema}|${t.unterthema}`} className="flex items-center gap-4">
            {/* Label */}
            <div className="w-64 flex-none text-sm text-slate-300 truncate">
              <span className="text-slate-500 text-xs">{t.leitidee} › {t.thema} › </span>
              {t.unterthema}
            </div>

            {/* Bar track — fills remaining space */}
            <div className="flex-1 min-w-0 h-5 bg-slate-800 rounded overflow-hidden">
              {/* Volume-proportional fill */}
              <div className="h-full flex" style={{ width: `${(total / maxTotal) * 100}%` }}>
                <div className="h-full bg-green-500" style={{ width: `${t.accuracyPct}%` }} />
                <div className="h-full bg-red-500" style={{ width: `${100 - t.accuracyPct}%` }} />
              </div>
            </div>

            {/* Accuracy */}
            <span className="text-sm text-slate-300 w-12 text-right">{t.accuracyPct} %</span>

            {/* Wissenslücke badge */}
            {t.isWissensluecke && (
              <span className="text-xs bg-amber-900/40 border border-amber-700/50 text-amber-400 rounded-full px-2 py-0.5">
                Wissenslücke ⚠
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
