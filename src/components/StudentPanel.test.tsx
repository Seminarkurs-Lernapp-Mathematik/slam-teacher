import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { StudentSummary, FeedResponse } from '../types'

const { mockStudent, mockFeed } = vi.hoisted(() => ({
  mockStudent: {
    uid: 's1',
    displayName: 'Anna Müller',
    email: 'anna@mvl-gym.de',
    lastActive: new Date().toISOString(),
    accuracy7d: 80,
    streak: 5,
    totalXp: 1500,
    status: 'active' as const,
    currentTopic: 'Ableitungen',
    sessionProgress: null,
  } as StudentSummary,
  mockFeed: {
    entries: [
      {
        userId: 's1',
        displayName: 'Anna Müller',
        questionText: 'Was ist die Ableitung von x²?',
        studentAnswer: '2x',
        isCorrect: true,
        feedback: 'Richtig!',
        hintsUsed: 0,
        timeSpentSeconds: 15,
        timestamp: Date.now() - 60_000,
        leitidee: 'Analysis',
        thema: 'Ableitungen',
        unterthema: 'Potenzregel',
      },
    ],
  } as FeedResponse,
}))

vi.mock('../api/hooks', () => ({
  useStudents: vi.fn((classId: string | null) => ({
    data: classId ? [mockStudent] : [],
  })),
  useClassFeed: vi.fn().mockReturnValue({ data: mockFeed, isLoading: false }),
  useAiAssessment: vi.fn().mockReturnValue({
    data: { assessment: 'Anna zeigt gute Kenntnisse in Analysis.', generatedAt: '' },
    isLoading: false,
  }),
}))

vi.mock('../store', () => ({
  useStore: vi.fn((selector: (s: object) => unknown) =>
    selector({ selectedClassId: 'cls-1' })
  ),
}))

vi.mock('../api/mutations', () => ({
  useResetPassword: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}))

// Suppress unused import lint — types used for mock shape above
void (null as unknown as StudentSummary)
void (null as unknown as FeedResponse)

import { StudentPanel } from './StudentPanel'

describe('StudentPanel', () => {
  it('shows student name in header', () => {
    render(<StudentPanel studentId="s1" onClose={vi.fn()} />)
    expect(screen.getByText('Anna Müller')).toBeInTheDocument()
  })

  it('shows AI assessment text', async () => {
    render(<StudentPanel studentId="s1" onClose={vi.fn()} />)
    await waitFor(() =>
      expect(screen.getByText(/Anna zeigt gute Kenntnisse/)).toBeInTheDocument()
    )
  })

  it('shows the live feed entry', () => {
    render(<StudentPanel studentId="s1" onClose={vi.fn()} />)
    expect(screen.getByText(/Was ist die Ableitung von x²/)).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn()
    render(<StudentPanel studentId="s1" onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: /schließen|×|close/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
