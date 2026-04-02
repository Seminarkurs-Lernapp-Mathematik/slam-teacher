import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { StudentSummary } from '../types'

const { mockStudents } = vi.hoisted(() => ({
  mockStudents: [
    {
      uid: 's1',
      displayName: 'Anna Müller',
      email: 'anna@mvl-gym.de',
      lastActive: new Date().toISOString(),
      accuracy7d: 85,
      streak: 5,
      totalXp: 1200,
      status: 'active' as const,
      currentTopic: null,
      sessionProgress: null,
    },
    {
      uid: 's2',
      displayName: 'Ben Schmidt',
      email: 'ben@mvl-gym.de',
      lastActive: null,
      accuracy7d: 40,
      streak: 0,
      totalXp: 300,
      status: 'offline' as const,
      currentTopic: null,
      sessionProgress: null,
    },
  ] as StudentSummary[],
}))

vi.mock('../api/hooks', () => ({
  useStudents: vi.fn().mockReturnValue({ data: mockStudents, isLoading: false }),
  useClasses: vi.fn().mockReturnValue({ data: [{ id: 'cls-1', name: '11a', teacherId: 't-1', schoolId: 'mvl', studentIds: ['s1', 's2'], gridConfig: { rows: 3, cols: 4 }, deskPositions: {}, createdAt: '', updatedAt: '' }] }),
}))

vi.mock('../api/mutations', () => ({
  useRemoveStudent: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}))

vi.mock('../store', () => ({
  useStore: vi.fn((selector: (s: object) => unknown) =>
    selector({
      selectedClassId: 'cls-1',
      activePanelStudentId: null,
      setActivePanelStudentId: vi.fn(),
    })
  ),
}))

vi.mock('../components/StudentPanel', () => ({
  StudentPanel: () => <div data-testid="student-panel" />,
}))

// Suppress unused import lint
void (null as unknown as StudentSummary)

import { Schueler } from './Schueler'

describe('Schueler', () => {
  it('renders one table row per student', () => {
    render(<Schueler />)
    expect(screen.getByText('Anna Müller')).toBeInTheDocument()
    expect(screen.getByText('Ben Schmidt')).toBeInTheDocument()
  })

  it('shows accuracy percentage', () => {
    render(<Schueler />)
    expect(screen.getByText('85 %')).toBeInTheDocument()
    expect(screen.getByText('40 %')).toBeInTheDocument()
  })

  it('shows streak values', () => {
    render(<Schueler />)
    expect(screen.getByText('5 Tage')).toBeInTheDocument()
  })
})
