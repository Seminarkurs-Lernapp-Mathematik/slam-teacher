import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AnalyticsResponse } from '../types'

const { mockAnalytics, mockSetGoal } = vi.hoisted(() => {
  const mockSetGoal = vi.fn()
  return {
    mockSetGoal,
    mockAnalytics: {
      summary: {
        questionsToday: 10,
        questionsThisWeek: 50,
        classAverageAccuracy: 70,
        avgDailyStreak: 3,
        activeStudentsToday: 5,
      },
      topics: [
        {
          leitidee: 'Analysis',
          thema: 'Ableitungen',
          unterthema: 'Potenzregel',
          correct: 20,
          incorrect: 5,
          accuracyPct: 80,
          isWissensluecke: false,
        },
        {
          leitidee: 'Analysis',
          thema: 'Ableitungen',
          unterthema: 'Kettenregel',
          correct: 3,
          incorrect: 7,
          accuracyPct: 30,
          isWissensluecke: true,
        },
      ],
    } as AnalyticsResponse,
  }
})

vi.mock('../api/hooks', () => ({
  useAnalytics: vi.fn().mockReturnValue({ data: mockAnalytics, isLoading: false }),
}))

vi.mock('../api/mutations', () => ({
  useSetGoal: vi.fn(() => ({
    mutateAsync: mockSetGoal.mockResolvedValue({}),
    isPending: false,
  })),
}))

vi.mock('../store', () => ({
  useStore: vi.fn((selector: (s: object) => unknown) =>
    selector({ selectedClassId: 'cls-1' })
  ),
}))

// Suppress unused import lint
void (null as unknown as AnalyticsResponse)

import { Lernziele } from './Lernziele'

describe('Lernziele', () => {
  beforeEach(() => mockSetGoal.mockClear())

  it('shows topic unterthemen from analytics', () => {
    render(<Lernziele />)
    expect(screen.getByText('Potenzregel')).toBeInTheDocument()
    expect(screen.getByText('Kettenregel')).toBeInTheDocument()
  })

  it('saves goal with selected topics when Speichern is clicked', async () => {
    render(<Lernziele />)
    await userEvent.click(screen.getByRole('checkbox', { name: /Potenzregel/ }))
    await userEvent.click(screen.getByRole('button', { name: /speichern/i }))
    await waitFor(() =>
      expect(mockSetGoal).toHaveBeenCalledWith(
        expect.objectContaining({
          topics: expect.arrayContaining([
            expect.objectContaining({ unterthema: 'Potenzregel' }),
          ]),
        })
      )
    )
  })

  it('shows validation error when no topics selected', async () => {
    render(<Lernziele />)
    await userEvent.click(screen.getByRole('button', { name: /speichern/i }))
    expect(screen.getByText(/mindestens ein/i)).toBeInTheDocument()
  })
})
