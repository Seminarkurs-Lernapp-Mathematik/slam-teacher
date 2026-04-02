import { useTeacher, useClasses } from '../api/hooks'
import { useStore } from '../store'

export function ClassSelector() {
  const { data: teacher } = useTeacher()
  const { data: classes } = useClasses(teacher?.classIds ?? [])
  const selectedClassId = useStore((s) => s.selectedClassId)
  const setSelectedClassId = useStore((s) => s.setSelectedClassId)

  if (!classes || classes.length === 0) return null

  return (
    <select
      role="combobox"
      value={selectedClassId ?? ''}
      onChange={(e) => setSelectedClassId(e.target.value)}
      className="w-full bg-[#0d1117] text-white border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
    >
      {classes.map((cls) => (
        <option key={cls.id} value={cls.id}>
          {cls.name}
        </option>
      ))}
    </select>
  )
}
