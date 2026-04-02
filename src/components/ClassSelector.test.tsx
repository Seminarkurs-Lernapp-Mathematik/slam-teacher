import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

vi.mock('../api/hooks', () => ({
  useTeacher: vi.fn().mockReturnValue({
    data: {
      uid: 'teacher-1',
      displayName: 'Frau Müller',
      email: 'mueller@mvl-gym.de',
      schoolId: 'mvl',
      classIds: ['cls-1', 'cls-2'],
      theme: 'dark',
      createdAt: '2026-01-01T00:00:00Z',
    },
  }),
  useClasses: vi.fn().mockReturnValue({
    data: [
      { id: 'cls-1', name: '11a', teacherId: 't-1', schoolId: 'mvl', studentIds: [], gridConfig: { rows: 4, cols: 5 }, deskPositions: {}, createdAt: '', updatedAt: '' },
      { id: 'cls-2', name: '11b', teacherId: 't-1', schoolId: 'mvl', studentIds: [], gridConfig: { rows: 4, cols: 5 }, deskPositions: {}, createdAt: '', updatedAt: '' },
    ],
  }),
}))

vi.mock('../store', () => ({
  useStore: vi.fn((selector: (s: object) => unknown) =>
    selector({
      selectedClassId: 'cls-1',
      setSelectedClassId: vi.fn(),
    })
  ),
}))

import { ClassSelector } from './ClassSelector'

describe('ClassSelector', () => {
  it('shows the currently selected class name', () => {
    render(<ClassSelector />)
    const select = screen.getByRole('combobox')
    expect((select as HTMLSelectElement).value).toBe('cls-1')
  })

  it('lists all teacher classes as options', () => {
    render(<ClassSelector />)
    expect(screen.getByRole('option', { name: '11a' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '11b' })).toBeInTheDocument()
  })
})
