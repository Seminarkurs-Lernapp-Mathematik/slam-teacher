import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { StudentSummary, ClassDoc } from '../types'

const { mockStudents, mockClass } = vi.hoisted(() => ({
  mockStudents: [
    {
      uid: 's1',
      displayName: 'Anna Müller',
      email: '',
      lastActive: new Date().toISOString(),
      accuracy7d: 75,
      streak: 2,
      totalXp: 500,
      status: 'active' as const,
      currentTopic: null,
      sessionProgress: { answered: 3, total: 10 },
    },
  ] as StudentSummary[],
  mockClass: {
    id: 'cls-1',
    name: '11a',
    teacherId: 't-1',
    schoolId: 'mvl',
    studentIds: ['s1'],
    gridConfig: { rows: 3, cols: 4 },
    deskPositions: { s1: { col: 0, row: 0 } },
    createdAt: '',
    updatedAt: '',
  } as ClassDoc,
}))

vi.mock('../api/hooks', () => ({
  useStudents: vi.fn().mockReturnValue({ data: mockStudents, isLoading: false }),
  useClasses: vi.fn().mockReturnValue({ data: [mockClass] }),
}))

vi.mock('../store', () => ({
  useStore: vi.fn((selector: (s: object) => unknown) =>
    selector({
      selectedClassId: 'cls-1',
      beamerMode: false,
      setBeamerMode: vi.fn(),
    })
  ),
}))

vi.mock('../components/ClassroomGrid', () => ({
  ClassroomGrid: ({ students, beamerMode }: { students: StudentSummary[]; beamerMode?: boolean }) => (
    <div>
      {students.map((s) => (
        <span key={s.uid}>{beamerMode ? 'Schüler 1' : s.displayName}</span>
      ))}
    </div>
  ),
}))

// Suppress unused import lint — types used for mock shape above
void (null as unknown as StudentSummary)
void (null as unknown as ClassDoc)

import { LiveMonitor } from './LiveMonitor'
import * as storeModule from '../store'

describe('LiveMonitor', () => {
  it('shows student names in normal mode', () => {
    render(<LiveMonitor />)
    expect(screen.getByText('Anna Müller')).toBeInTheDocument()
  })

  it('shows Beamer-Modus toggle button', () => {
    render(<LiveMonitor />)
    expect(screen.getByRole('button', { name: /beamer/i })).toBeInTheDocument()
  })

  it('hides real names and shows pseudonyms in beamer mode', () => {
    const spy = vi.spyOn(storeModule, 'useStore').mockImplementation((selector: (s: object) => unknown) =>
      selector({
        selectedClassId: 'cls-1',
        beamerMode: true,
        setBeamerMode: vi.fn(),
      })
    )
    render(<LiveMonitor />)
    expect(screen.getByText('Schüler 1')).toBeInTheDocument()
    expect(screen.queryByText('Anna Müller')).not.toBeInTheDocument()
    spy.mockRestore()
  })
})
