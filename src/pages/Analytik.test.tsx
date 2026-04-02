import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { AnalyticsResponse } from '../types'
import * as hooksModule from '../api/hooks'

const { mockAnalytics } = vi.hoisted(() => ({
  mockAnalytics: {
    summary: {
      questionsToday: 42,
      questionsThisWeek: 210,
      classAverageAccuracy: 73,
      avgDailyStreak: 4,
      activeStudentsToday: 18,
    },
    topics: [
      {
        leitidee: 'Analysis',
        thema: 'Ableitungen',
        unterthema: 'Potenzregel',
        correct: 30,
        incorrect: 10,
        accuracyPct: 75,
        isWissensluecke: false,
      },
      {
        leitidee: 'Analysis',
        thema: 'Ableitungen',
        unterthema: 'Kettenregel',
        correct: 5,
        incorrect: 15,
        accuracyPct: 25,
        isWissensluecke: true,
      },
    ],
  } as AnalyticsResponse,
}))

vi.mock('../api/hooks', () => ({
  useAnalytics: vi.fn().mockReturnValue({ data: mockAnalytics, isLoading: false }),
}))

vi.mock('../store', () => ({
  useStore: vi.fn((selector: (s: object) => unknown) =>
    selector({ selectedClassId: 'cls-1' })
  ),
}))

// Suppress unused import lint — type used for mock shape above
void (null as unknown as AnalyticsResponse)

import { Analytik } from './Analytik'

describe('Analytik', () => {
  it('shows questions answered today', () => {
    render(<Analytik />)
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('shows class average accuracy', () => {
    render(<Analytik />)
    expect(screen.getByText('73 %')).toBeInTheDocument()
  })

  it('labels Wissenslücke topics', () => {
    render(<Analytik />)
    expect(screen.getByText(/Wissenslücke/)).toBeInTheDocument()
  })

  it('shows topic names in the chart', () => {
    render(<Analytik />)
    expect(screen.getByText(/Potenzregel/)).toBeInTheDocument()
    expect(screen.getByText(/Kettenregel/)).toBeInTheDocument()
  })

  it('shows loading state', () => {
    const spy = vi.spyOn(hooksModule, 'useAnalytics').mockReturnValue({ data: undefined, isLoading: true } as ReturnType<typeof hooksModule.useAnalytics>)
    render(<Analytik />)
    expect(screen.getByText('Laden…')).toBeInTheDocument()
    spy.mockRestore()
  })

  it('shows empty topics message', () => {
    const spy = vi.spyOn(hooksModule, 'useAnalytics').mockReturnValue({
      data: { summary: mockAnalytics.summary, topics: [] },
      isLoading: false,
    } as ReturnType<typeof hooksModule.useAnalytics>)
    render(<Analytik />)
    expect(screen.getByText('Noch keine Daten')).toBeInTheDocument()
    spy.mockRestore()
  })
})
