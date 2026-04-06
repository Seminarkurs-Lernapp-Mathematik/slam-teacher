import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('apiFetch', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('sends Bearer token in Authorization header', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    )
    vi.stubGlobal('fetch', fetchSpy)

    const { apiFetch } = await import('./client')
    await apiFetch('/api/test')

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:8787/api/test',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer mock-token',
        }),
      })
    )
  })

  it('throws with error message when response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 })
    ))

    const { apiFetch, ApiError } = await import('./client')
    await expect(apiFetch('/api/restricted')).rejects.toMatchObject({
      message: 'Forbidden',
      status: 403,
    })
    await expect(apiFetch('/api/restricted')).rejects.toBeInstanceOf(ApiError)
  })

  it('returns undefined for 204 No Content responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(null, { status: 204 })
    ))

    const { apiFetch } = await import('./client')
    const result = await apiFetch('/api/deleted')
    expect(result).toBeUndefined()
  })
})
