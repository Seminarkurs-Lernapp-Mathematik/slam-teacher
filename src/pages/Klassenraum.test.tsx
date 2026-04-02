import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { StudentSummary, ClassDoc } from '../types'

const { mockStudents, mockClass } = vi.hoisted(() => {
  const mockStudents = [
    {
      uid: 's1',
      displayName: 'Anna Müller',
      email: '',
      lastActive: new Date().toISOString(),
      accuracy7d: 85,
      streak: 3,
      totalXp: 900,
      status: 'active' as const,
      currentTopic: 'Ableitungen',
      sessionProgress: null,
    },
    {
      uid: 's2',
      displayName: 'Ben Schmidt',
      email: '',
      lastActive: null,
      accuracy7d: 30,
      streak: 0,
      totalXp: 200,
      status: 'struggling' as const,
      currentTopic: 'Ableitungen',
      sessionProgress: null,
    },
  ]

  const mockClass = {
    id: 'cls-1',
    name: '11a',
    teacherId: 't-1',
    schoolId: 'mvl',
    studentIds: ['s1', 's2'],
    gridConfig: { rows: 3, cols: 4 },
    deskPositions: { s1: { col: 0, row: 0 }, s2: { col: 1, row: 0 } },
    createdAt: '',
    updatedAt: '',
  }

  return { mockStudents, mockClass }
})

vi.mock('../api/hooks', () => ({
  useStudents: vi.fn().mockReturnValue({ data: mockStudents, isLoading: false }),
  useClasses: vi.fn().mockReturnValue({ data: [mockClass] }),
}))

vi.mock('../api/mutations', () => ({
  useUpdateClass: vi.fn(() => ({ mutateAsync: vi.fn().mockResolvedValue(mockClass), isPending: false })),
}))

vi.mock('../store', () => ({
  useStore: vi.fn((selector: (s: object) => unknown) =>
    selector({
      selectedClassId: 'cls-1',
      editMode: false,
      activePanelStudentId: null,
      setEditMode: vi.fn(),
      setActivePanelStudentId: vi.fn(),
    })
  ),
}))

vi.mock('../components/ClassroomGrid', () => ({
  ClassroomGrid: ({ students, onStudentClick }: {
    students: StudentSummary[]
    onStudentClick?: (uid: string) => void
  }) => (
    <div>
      {students.map((s) => (
        <button key={s.uid} onClick={() => onStudentClick?.(s.uid)}>
          {s.displayName}
        </button>
      ))}
    </div>
  ),
}))

vi.mock('../components/StudentPanel', () => ({
  StudentPanel: ({ studentId }: { studentId: string }) => (
    <div data-testid="student-panel">{studentId}</div>
  ),
}))

// Suppress unused import lint — types used for mock shape above
void (null as unknown as StudentSummary)
void (null as unknown as ClassDoc)

import { Klassenraum } from './Klassenraum'

describe('Klassenraum', () => {
  it('shows the alert pill when a student is struggling', () => {
    render(<Klassenraum />)
    expect(screen.getByText(/kämpfen/)).toBeInTheDocument()
  })

  it('shows the Bearbeiten button', () => {
    render(<Klassenraum />)
    expect(screen.getByRole('button', { name: /bearbeiten/i })).toBeInTheDocument()
  })

  it('renders student names in grid', () => {
    render(<Klassenraum />)
    expect(screen.getByText('Anna Müller')).toBeInTheDocument()
  })
})
