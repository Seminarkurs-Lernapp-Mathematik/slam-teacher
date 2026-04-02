import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import type { StudentSummary } from '../types'
import { AlertPill } from './AlertPill'

function makeStudent(status: StudentSummary['status'], topic: string | null = null): StudentSummary {
  return {
    uid: Math.random().toString(),
    displayName: 'Test',
    email: '',
    lastActive: null,
    accuracy7d: 50,
    streak: 0,
    totalXp: 0,
    status,
    currentTopic: topic,
    sessionProgress: null,
  }
}

describe('AlertPill', () => {
  it('renders nothing when no students are struggling', () => {
    const { container } = render(<AlertPill students={[makeStudent('active')]} />)
    expect(container.firstChild).toBeNull()
  })

  it('shows count of struggling students', () => {
    const students = [
      makeStudent('struggling', 'Ableitungen'),
      makeStudent('struggling', 'Ableitungen'),
      makeStudent('active'),
    ]
    render(<AlertPill students={students} />)
    expect(screen.getByText(/2 Schüler kämpfen/)).toBeInTheDocument()
  })

  it('includes topic name in message', () => {
    render(<AlertPill students={[makeStudent('struggling', 'Potenzregel')]} />)
    expect(screen.getByText(/Potenzregel/)).toBeInTheDocument()
  })
})
