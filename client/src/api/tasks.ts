/** Same shape the API returns. */
export interface Task {
  id: number
  title: string
  description: string | null
  completed: boolean
  createdAt: string
  updatedAt: string
}

export interface NewTask {
  title: string
  description?: string
}

/** PATCH body: send only what changed. */
export interface TaskChanges {
  title?: string
  description?: string | null
  completed?: boolean
}

const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000').replace(/\/$/, '')

/** An error with the HTTP status (0 = the server couldn't be reached at all). */
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/**
 * One place for every API call: builds the URL, sends JSON, and turns
 * error responses ({ error: { message, details } }) into an ApiError.
 */
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      // Only send Content-Type when there is a body; plain GETs stay "simple" CORS requests.
      headers: init.body ? { 'Content-Type': 'application/json' } : undefined,
    })
  } catch {
    throw new ApiError(0, 'Could not reach the server. Check your connection and try again.')
  }

  if (response.status === 204) return undefined as T // DELETE: success, no body

  const body = await response.json().catch(() => null)
  if (!response.ok) {
    const message =
      body?.error?.details?.[0]?.message ?? // most specific: the first validation problem
      body?.error?.message ??
      `Request failed with status ${response.status}`
    throw new ApiError(response.status, message)
  }
  return body as T
}

export function listTasks(): Promise<Task[]> {
  return request<Task[]>('/api/tasks')
}

export function createTask(input: NewTask): Promise<Task> {
  return request<Task>('/api/tasks', { method: 'POST', body: JSON.stringify(input) })
}

export function updateTask(id: number, changes: TaskChanges): Promise<Task> {
  return request<Task>(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(changes) })
}

export function deleteTask(id: number): Promise<void> {
  return request<void>(`/api/tasks/${id}`, { method: 'DELETE' })
}
