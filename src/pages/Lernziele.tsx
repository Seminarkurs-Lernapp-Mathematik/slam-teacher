import { useState, useMemo } from 'react'
import { useStore } from '../store'
import { useAnalytics } from '../api/hooks'
import { useSetGoal } from '../api/mutations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface TopicKey {
  leitidee: string
  thema: string
  unterthema: string
}

export function Lernziele() {
  const selectedClassId = useStore((s) => s.selectedClassId)
  const { data: analytics, isLoading } = useAnalytics(selectedClassId)
  const setGoal = useSetGoal(selectedClassId ?? '')

  const [selectedTopics, setSelectedTopics] = useState<TopicKey[]>([])
  const [examDate, setExamDate] = useState('')
  const [search, setSearch] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Build tree: leitidee → thema → unterthema[]
  const tree = useMemo(() => {
    const result: Record<string, Record<string, TopicKey[]>> = {}
    for (const t of analytics?.topics ?? []) {
      if (!result[t.leitidee]) result[t.leitidee] = {}
      if (!result[t.leitidee][t.thema]) result[t.leitidee][t.thema] = []
      result[t.leitidee][t.thema].push({
        leitidee: t.leitidee,
        thema: t.thema,
        unterthema: t.unterthema,
      })
    }
    return result
  }, [analytics])

  function isSelected(tk: TopicKey) {
    return selectedTopics.some(
      (s) => s.leitidee === tk.leitidee && s.thema === tk.thema && s.unterthema === tk.unterthema
    )
  }

  function toggleTopic(tk: TopicKey) {
    setSelectedTopics((prev) => {
      const alreadySelected = prev.some(
        (s) => s.leitidee === tk.leitidee && s.thema === tk.thema && s.unterthema === tk.unterthema
      )
      return alreadySelected
        ? prev.filter(
            (s) =>
              !(s.leitidee === tk.leitidee && s.thema === tk.thema && s.unterthema === tk.unterthema)
          )
        : [...prev, tk]
    })
  }

  async function handleSave() {
    setValidationError(null)
    setSuccess(false)
    if (selectedTopics.length === 0) {
      setValidationError('Bitte wähle mindestens ein Thema aus.')
      return
    }
    try {
      await setGoal.mutateAsync({
        topics: selectedTopics,
        examDate: examDate || null,
      })
      setSuccess(true)
    } catch (err: unknown) {
      setValidationError((err as Error).message)
    }
  }

  if (isLoading) return <div className="p-8 text-slate-400">Laden…</div>

  const leitideen = Object.keys(tree)

  return (
    <div className="p-6 flex flex-col gap-6 max-w-2xl">
      <h1 className="text-xl font-semibold text-white">Lernziele</h1>

      {/* Search */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="topicSearch">Themen durchsuchen</Label>
        <Input
          id="topicSearch"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Thema suchen…"
        />
      </div>

      {/* Topic tree */}
      <div className="flex flex-col gap-4 bg-[#101828] rounded-xl border border-slate-800 p-4">
        {leitideen.length === 0 ? (
          <p className="text-slate-500 text-sm">
            Noch keine Themen geübt — erst wenn Schüler gearbeitet haben, erscheinen hier Themen.
          </p>
        ) : (
          leitideen.map((leitidee) => {
            const themata = Object.entries(tree[leitidee])
              .map(([thema, unterthemen]) => ({
                thema,
                filtered: unterthemen.filter((tk) =>
                  search.length === 0 ||
                  tk.unterthema.toLowerCase().includes(search.toLowerCase()) ||
                  tk.thema.toLowerCase().includes(search.toLowerCase())
                ),
              }))
              .filter(({ filtered }) => filtered.length > 0)
            if (themata.length === 0) return null
            return (
            <div key={leitidee}>
              <p className="text-slate-300 font-medium mb-2">{leitidee}</p>
              {themata.map(({ thema, filtered }) => {
                return (
                  <div key={thema} className="ml-4 mb-3">
                    <p className="text-slate-400 text-sm mb-1">{thema}</p>
                    <div className="ml-4 flex flex-col gap-1">
                      {filtered.map((tk) => {
                        const checkboxId = `topic-${tk.leitidee}-${tk.thema}-${tk.unterthema}`
                        return (
                          <div key={checkboxId} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={checkboxId}
                              aria-label={tk.unterthema}
                              checked={isSelected(tk)}
                              onChange={() => toggleTopic(tk)}
                              className="w-4 h-4 accent-blue-500"
                            />
                            <label
                              htmlFor={checkboxId}
                              className="text-slate-300 text-sm cursor-pointer"
                            >
                              {tk.unterthema}
                            </label>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
            )
          })
        )}
      </div>

      {/* Exam date */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="examDate">Prüfungsdatum (optional)</Label>
        <Input
          id="examDate"
          type="date"
          value={examDate}
          onChange={(e) => setExamDate(e.target.value)}
          className="w-48"
        />
      </div>

      {validationError && <p className="text-red-400 text-sm">{validationError}</p>}
      {success && (
        <p className="text-green-400 text-sm">Lernziel gespeichert ✓</p>
      )}

      <Button
        onClick={handleSave}
        disabled={setGoal.isPending}
        className="w-fit"
      >
        {setGoal.isPending ? 'Speichern…' : 'Speichern'}
      </Button>
    </div>
  )
}
