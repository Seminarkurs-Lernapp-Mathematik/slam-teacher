import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { DeskTile } from './DeskTile'
import { SessionRing } from './SessionRing'
import type { StudentSummary, ClassDoc } from '../types'

export function assignMissingPositions(
  students: StudentSummary[],
  gridConfig: { rows: number; cols: number },
  existing: Record<string, { col: number; row: number }>
): Record<string, { col: number; row: number }> {
  const unassigned = students.filter((s) => !existing[s.uid])
  if (unassigned.length === 0) return existing

  const sorted = [...unassigned].sort((a, b) => {
    const aLast = a.displayName.split(' ').at(-1) ?? a.displayName
    const bLast = b.displayName.split(' ').at(-1) ?? b.displayName
    return aLast.localeCompare(bLast, 'de')
  })

  const occupied = new Set(Object.values(existing).map((p) => `${p.col}-${p.row}`))
  const result = { ...existing }
  let idx = 0

  outer: for (let row = 0; row < gridConfig.rows; row++) {
    for (let col = 0; col < gridConfig.cols; col++) {
      if (idx >= sorted.length) break outer
      const key = `${col}-${row}`
      if (!occupied.has(key)) {
        result[sorted[idx].uid] = { col, row }
        occupied.add(key)
        idx++
      }
    }
  }

  return result
}

interface DroppableCellProps {
  cellId: string
  editMode: boolean
  children?: React.ReactNode
}

function DroppableCell({ cellId, editMode, children }: DroppableCellProps) {
  const { setNodeRef, isOver } = useDroppable({ id: cellId })
  return (
    <div
      ref={setNodeRef}
      className={`w-[108px] h-[66px] rounded-[8px] transition-colors ${
        editMode && isOver ? 'border-2 border-dashed border-blue-400 bg-blue-900/20' : ''
      }`}
    >
      {children}
    </div>
  )
}

interface DraggableTileProps {
  student: StudentSummary
  editMode: boolean
  onClick?: () => void
  beamerName?: string
  extraContent?: React.ReactNode
}

function DraggableTile({ student, editMode, onClick, beamerName, extraContent }: DraggableTileProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: student.uid,
  })
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(editMode ? { ...listeners, ...attributes } : {})}
      className={isDragging ? 'opacity-50' : ''}
    >
      <DeskTile
        student={student}
        onClick={!editMode ? onClick : undefined}
        beamerName={beamerName}
        extraContent={extraContent}
      />
    </div>
  )
}

interface Props {
  students: StudentSummary[]
  classDoc: ClassDoc
  editMode: boolean
  onDeskPositionsChange?: (positions: Record<string, { col: number; row: number }>) => void
  onStudentClick?: (uid: string) => void
  beamerMode?: boolean
  showSessionRings?: boolean
}

export function ClassroomGrid({
  students,
  classDoc,
  editMode,
  onDeskPositionsChange,
  onStudentClick,
  beamerMode,
  showSessionRings,
}: Props) {
  const [activeDragId, setActiveDragId] = useState<string | null>(null)

  const positions = assignMissingPositions(students, classDoc.gridConfig, classDoc.deskPositions)
  const { rows, cols } = classDoc.gridConfig

  const sortedForBeamer = [...students].sort((a, b) => {
    const pa = positions[a.uid] ?? { row: 99, col: 99 }
    const pb = positions[b.uid] ?? { row: 99, col: 99 }
    return pa.row !== pb.row ? pa.row - pb.row : pa.col - pb.col
  })

  function getBeamerName(uid: string): string | undefined {
    if (!beamerMode) return undefined
    const idx = sortedForBeamer.findIndex((s) => s.uid === uid)
    return `Schüler ${idx + 1}`
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(event.active.id as string)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null)
    const { active, over } = event
    if (!over) return

    const draggedUid = active.id as string
    const [targetColStr, targetRowStr] = (over.id as string).split('|')
    const targetCol = Number(targetColStr)
    const targetRow = Number(targetRowStr)

    const newPositions = { ...positions }
    const draggedFrom = newPositions[draggedUid]

    const occupant = Object.entries(newPositions).find(
      ([uid, pos]) => pos.col === targetCol && pos.row === targetRow && uid !== draggedUid
    )

    if (occupant) {
      newPositions[occupant[0]] = draggedFrom
    }
    newPositions[draggedUid] = { col: targetCol, row: targetRow }

    onDeskPositionsChange?.(newPositions)
  }

  const studentByUid = new Map(students.map((s) => [s.uid, s]))
  const activeDragStudent = activeDragId ? studentByUid.get(activeDragId) : null

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="bg-[#101828] rounded-xl border border-slate-800 p-6 relative">
        {/* Tafel */}
        <div className="w-2/3 mx-auto h-8 bg-[#2563EB]/20 border border-[#2563EB]/40 rounded mb-8 flex items-center justify-center">
          <span className="text-blue-400 text-xs tracking-widest uppercase">Tafel</span>
        </div>

        {editMode && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-blue-900/30 border border-blue-700/50 text-blue-300 text-xs px-3 py-1 rounded-full">
            Bearbeitungsmodus — Schüler verschieben
          </div>
        )}

        <div
          className="grid gap-4 mx-auto w-fit"
          style={{
            gridTemplateColumns: `repeat(${cols}, 108px)`,
            gridTemplateRows: `repeat(${rows}, 66px)`,
          }}
        >
          {Array.from({ length: rows }, (_, row) =>
            Array.from({ length: cols }, (_, col) => {
              const cellId = `${col}|${row}`
              const student = students.find((s) => {
                const pos = positions[s.uid]
                return pos?.col === col && pos?.row === row
              })

              return (
                <DroppableCell key={cellId} cellId={cellId} editMode={editMode}>
                  {student && (
                    <DraggableTile
                      student={student}
                      editMode={editMode}
                      onClick={() => onStudentClick?.(student.uid)}
                      beamerName={getBeamerName(student.uid)}
                      extraContent={
                        showSessionRings && student.sessionProgress
                          ? <SessionRing answered={student.sessionProgress.answered} total={student.sessionProgress.total} size={18} />
                          : undefined
                      }
                    />
                  )}
                </DroppableCell>
              )
            })
          )}
        </div>
      </div>

      <DragOverlay>
        {activeDragStudent && (
          <DeskTile
            student={activeDragStudent}
            beamerName={getBeamerName(activeDragStudent.uid)}
          />
        )}
      </DragOverlay>
    </DndContext>
  )
}
