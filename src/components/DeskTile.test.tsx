import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import type { StudentSummary } from '../types'
import { DeskTile } from './DeskTile'

const baseStudent: StudentSummary = {
  uid: 'stu-1',
  displayName: 'Anna Müller',
  email: 'anna@mvl-gym.de',
  lastActive: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  accuracy7d: 80,
  streak: 5,
  totalXp: 1200,
  status: 'active',
  currentTopic: 'Ableitungen',
  sessionProgress: null,
}

describe('DeskTile', () => {
  it('renders student name', () => {
    render(<DeskTile student={baseStudent} />)
    expect(screen.getByText('Anna Müller')).toBeInTheDocument()
  })

  it('shows "Aktiv" label for active status', () => {
    render(<DeskTile student={baseStudent} />)
    expect(screen.getByText('Aktiv')).toBeInTheDocument()
  })

  it('shows "Kämpft" label for struggling status', () => {
    render(<DeskTile student={{ ...baseStudent, status: 'struggling' }} />)
    expect(screen.getByText('Kämpft')).toBeInTheDocument()
  })

  it('shows "Offline" label for offline status', () => {
    render(<DeskTile student={{ ...baseStudent, status: 'offline' }} />)
    expect(screen.getByText('Offline')).toBeInTheDocument()
  })

  it('uses beamerName when provided', () => {
    render(<DeskTile student={baseStudent} beamerName="Schüler 3" />)
    expect(screen.getByText('Schüler 3')).toBeInTheDocument()
    expect(screen.queryByText('Anna Müller')).not.toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const onClick = vi.fn()
    render(<DeskTile student={baseStudent} onClick={onClick} />)
    await userEvent.click(screen.getByTestId('desk-tile'))
    expect(onClick).toHaveBeenCalledOnce()
  })
})
