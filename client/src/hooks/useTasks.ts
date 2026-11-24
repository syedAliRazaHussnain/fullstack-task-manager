import { useEffect, useState } from 'react'
import * as api from '../api/tasks'
import type { NewTask, Task, TaskChanges } from '../api/tasks'

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong'
}

/**
 * All task state and actions in one hook, so components only render.
 * Each action waits for the server, then updates local state from the
 * server's response, so the screen always matches the database.
 * Actions return true/false so a component knows whether to clear a form
 * or leave edit mode.
 */
export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    // `ignore` stops a slow, outdated response from overwriting newer state
    // (e.g. after an unmount, or React StrictMode's double run in development).
    let ignore = false
    api
      .listTasks()
      .then((list) => {
        if (ignore) return
        setTasks(list)
        setLoadFailed(false)
        setError(null)
      })
      .catch((err: unknown) => {
        if (ignore) return
        setLoadFailed(true)
        setError(toMessage(err))
      })
      .finally(() => {
        if (!ignore) setIsLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [reloadKey])

  function reload() {
    setIsLoading(true)
    setReloadKey((key) => key + 1)
  }

  async function addTask(input: NewTask): Promise<boolean> {
    try {
      const created = await api.createTask(input)
      setTasks((prev) => [created, ...prev]) // newest first, same as the API
      setError(null)
      return true
    } catch (err) {
      setError(toMessage(err))
      return false
    }
  }

  async function updateTask(id: number, changes: TaskChanges): Promise<boolean> {
    try {
      const updated = await api.updateTask(id, changes)
      setTasks((prev) => prev.map((task) => (task.id === id ? updated : task)))
      setError(null)
      return true
    } catch (err) {
      setError(toMessage(err))
      return false
    }
  }

  async function deleteTask(id: number): Promise<boolean> {
    try {
      await api.deleteTask(id)
      setTasks((prev) => prev.filter((task) => task.id !== id))
      setError(null)
      return true
    } catch (err) {
      setError(toMessage(err))
      return false
    }
  }

  return {
    tasks,
    isLoading,
    loadFailed,
    error,
    dismissError: () => setError(null),
    reload,
    addTask,
    updateTask,
    deleteTask,
  }
}
