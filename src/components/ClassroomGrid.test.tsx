import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import type { StudentSummary, ClassDoc } from '../types'

// Mock @dnd-kit/core to avoid complex DnD setup in unit tests
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useDraggable: vi.fn(() => ({
    setNodeRef: vi.fn(),
    listeners: {},
    attributes: {},
    transform: null,
    isDragging: false,
  })),
  useDroppable: vi.fn(() => ({
    setNodeRef: vi.fn(),
    isOver: false,
  })),
  DragOverlay: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

vi.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Translate: {
      toString: vi.fn(() => ''),
    },
  },
}))

function makeStudent(uid: string, name: string, status: StudentSummary['status'] = 'offline'): StudentSummary {
  return {
    uid,
    displayName: name,
    email: '',
    lastActive: null,
    accuracy7d: 0,
    streak: 0,
    totalXp: 0,
    status,
    currentTopic: null,
    sessionProgress: null,
  }
}

const mockClass: ClassDoc = {
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

import { ClassroomGrid, assignMissingPositions } from './ClassroomGrid'

describe('ClassroomGrid', () => {
  it('renders one tile per student', () => {
    const students = [makeStudent('s1', 'Anna Müller'), makeStudent('s2', 'Ben Schmidt')]
    render(
      <ClassroomGrid
        students={students}
        classDoc={mockClass}
        editMode={false}
      />
    )
    expect(screen.getAllByTestId('desk-tile')).toHaveLength(2)
  })

  it('shows student names on tiles', () => {
    const students = [makeStudent('s1', 'Anna Müller'), makeStudent('s2', 'Ben Schmidt')]
    render(
      <ClassroomGrid
        students={students}
        classDoc={mockClass}
        editMode={false}
      />
    )
    expect(screen.getByText('Anna Müller')).toBeInTheDocument()
    expect(screen.getByText('Ben Schmidt')).toBeInTheDocument()
  })

  it('auto-assigns positions alphabetically when deskPositions is empty', () => {
    const classWithNoPositions: ClassDoc = { ...mockClass, deskPositions: {} }
    const students = [makeStudent('s2', 'Schmidt Ben'), makeStudent('s1', 'Müller Anna')]
    render(
      <ClassroomGrid
        students={students}
        classDoc={classWithNoPositions}
        editMode={false}
      />
    )
    expect(screen.getAllByTestId('desk-tile')).toHaveLength(2)
  })
})

describe('assignMissingPositions', () => {
  it('returns existing positions unchanged when all students have positions', () => {
    const students = [makeStudent('s1', 'Anna'), makeStudent('s2', 'Ben')]
    const existing = { s1: { col: 0, row: 0 }, s2: { col: 1, row: 0 } }
    const result = assignMissingPositions(students, { rows: 3, cols: 4 }, existing)
    expect(result).toEqual(existing)
  })

  it('assigns unpositioned students alphabetically by last name', () => {
    const students = [makeStudent('s1', 'Zander Fritz'), makeStudent('s2', 'Müller Anna')]
    const result = assignMissingPositions(students, { rows: 3, cols: 4 }, {})
    // Müller should be at col:0,row:0 (M < Z alphabetically)
    expect(result['s2']).toEqual({ col: 0, row: 0 })
    expect(result['s1']).toEqual({ col: 1, row: 0 })
  })
})
