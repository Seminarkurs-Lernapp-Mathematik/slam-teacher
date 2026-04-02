import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { TeacherDoc, ClassDoc } from '../types'

const { mockTeacher, mockClass, mockUpdateTeacher, mockInviteStudent } = vi.hoisted(() => {
  const mockUpdateTeacher = vi.fn()
  const mockInviteStudent = vi.fn()
  return {
    mockUpdateTeacher,
    mockInviteStudent,
    mockTeacher: {
      uid: 'teacher-1',
      displayName: 'Frau Müller',
      email: 'mueller@mvl-gym.de',
      schoolId: 'mvl',
      classIds: ['cls-1'],
      theme: 'dark',
      createdAt: '2026-01-01T00:00:00Z',
    } as TeacherDoc,
    mockClass: {
      id: 'cls-1',
      name: '11a',
      teacherId: 'teacher-1',
      schoolId: 'mvl',
      studentIds: [],
      gridConfig: { rows: 4, cols: 5 },
      deskPositions: {},
      createdAt: '',
      updatedAt: '',
    } as ClassDoc,
  }
})

vi.mock('../api/hooks', () => ({
  useTeacher: vi.fn().mockReturnValue({ data: mockTeacher }),
  useClasses: vi.fn().mockReturnValue({ data: [mockClass] }),
}))

vi.mock('../api/mutations', () => ({
  useUpdateTeacher: vi.fn(() => ({
    mutateAsync: mockUpdateTeacher.mockResolvedValue({ ...mockTeacher, displayName: 'Herr Müller' }),
    isPending: false,
  })),
  useInviteStudent: vi.fn(() => ({
    mutateAsync: mockInviteStudent.mockResolvedValue({ uid: 'new-stu', email: 'test@mvl-gym.de' }),
    isPending: false,
  })),
  useAddStudents: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  })),
  useCreateClass: vi.fn(() => ({
    mutateAsync: vi.fn().mockResolvedValue(mockClass),
    isPending: false,
  })),
  useDeleteClass: vi.fn(() => ({
    mutate: vi.fn(),
    isPending: false,
  })),
}))

vi.mock('../store', () => ({
  useStore: vi.fn((selector: (s: object) => unknown) =>
    selector({
      theme: 'dark',
      setTheme: vi.fn(),
      selectedClassId: 'cls-1',
    })
  ),
}))

// Suppress unused import lint
void (null as unknown as TeacherDoc)
void (null as unknown as ClassDoc)

import { Einstellungen } from './Einstellungen'

describe('Einstellungen', () => {
  beforeEach(() => {
    mockUpdateTeacher.mockClear()
    mockInviteStudent.mockClear()
  })

  it('shows the current display name', () => {
    render(<Einstellungen />)
    expect(screen.getByDisplayValue('Frau Müller')).toBeInTheDocument()
  })

  it('saves updated display name', async () => {
    render(<Einstellungen />)
    const input = screen.getByDisplayValue('Frau Müller')
    await userEvent.clear(input)
    await userEvent.type(input, 'Herr Müller')
    await userEvent.click(screen.getByRole('button', { name: /profil speichern/i }))
    await waitFor(() =>
      expect(mockUpdateTeacher).toHaveBeenCalledWith(
        expect.objectContaining({ displayName: 'Herr Müller' })
      )
    )
  })

  it('shows existing class in class list', () => {
    render(<Einstellungen />)
    expect(screen.getAllByText('11a').length).toBeGreaterThan(0)
  })
})
