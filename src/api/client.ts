import { auth } from '../firebase'

const API_URL = import.meta.env.VITE_API_URL as string

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

interface ErrorResponse {
  error?: string;
}

export async function apiFetch<T = unknown>(path: string, options?: RequestInit): Promise<T> {
  const user = auth.currentUser
  if (!user) throw new ApiError('Not authenticated', 401)

  const token = await user.getIdToken()

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options?.headers ?? {}),
    },
  })

  if (res.status === 204) return undefined as T

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as ErrorResponse
    throw new ApiError(body.error ?? `HTTP ${res.status}`, res.status)
  }

  return res.json() as Promise<T>
}
