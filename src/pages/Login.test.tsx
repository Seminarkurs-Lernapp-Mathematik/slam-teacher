import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { mockSignInWithEmailAndPassword } = vi.hoisted(() => ({
  mockSignInWithEmailAndPassword: vi.fn(),
}))

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: mockSignInWithEmailAndPassword,
}))

vi.mock('../firebase', () => ({
  auth: {},
}))

import { Login } from './Login'

describe('Login', () => {
  beforeEach(() => {
    mockSignInWithEmailAndPassword.mockReset()
    mockSignInWithEmailAndPassword.mockResolvedValue({ user: { uid: 'teacher-1' } })
  })

  it('trims the email before submitting to Firebase', async () => {
    render(<Login />)

    await userEvent.type(screen.getByLabelText('E-Mail'), '  teacher@mvl-gym.de  ')
    await userEvent.type(screen.getByLabelText('Passwort'), 'secret')
    await userEvent.click(screen.getByRole('button', { name: /anmelden/i }))

    await waitFor(() =>
      expect(mockSignInWithEmailAndPassword).toHaveBeenCalledWith(
        {},
        'teacher@mvl-gym.de',
        'secret'
      )
    )
  })
})
