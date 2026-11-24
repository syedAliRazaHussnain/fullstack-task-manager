import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, createTask, deleteTask } from './tasks'

function mockFetch(status: number, body?: unknown) {
  const response = new Response(body === undefined ? null : JSON.stringify(body), { status })
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(response)
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('api client', () => {
  it('POSTs JSON and returns the created task', async () => {
    const created = { id: 1, title: 'A' }
    const fetchSpy = mockFetch(201, created)

    await expect(createTask({ title: 'A' })).resolves.toEqual(created)
    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:4000/api/tasks',
      expect.objectContaining({ method: 'POST', body: '{"title":"A"}' }),
    )
  })

  it('returns undefined for 204 No Content', async () => {
    mockFetch(204)
    await expect(deleteTask(1)).resolves.toBeUndefined()
  })

  it('surfaces the first validation message from a 400', async () => {
    mockFetch(400, {
      error: { message: 'Validation failed', details: [{ field: 'title', message: 'Title is required' }] },
    })
    await expect(createTask({ title: '' })).rejects.toThrow('Title is required')
  })

  it('throws ApiError with status 0 when the server is unreachable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))
    const error = await createTask({ title: 'A' }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).status).toBe(0)
  })
})
