import { useState, type FormEvent } from 'react'
import type { Task, TaskChanges } from '../api/tasks'

interface TaskItemProps {
  task: Task
  onUpdate: (id: number, changes: TaskChanges) => Promise<boolean>
  onDelete: (id: number) => Promise<boolean>
}

/** One task: view mode (checkbox, text, Edit/Delete) or edit mode (inputs, Save/Cancel). */
export function TaskItem({ task, onUpdate, onDelete }: TaskItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState(task.title)
  const [draftDescription, setDraftDescription] = useState(task.description ?? '')
  const [isBusy, setIsBusy] = useState(false)

  /** Runs a server action while disabling the buttons, so double-clicks can't send twice. */
  async function runBusy(action: () => Promise<boolean>): Promise<boolean> {
    setIsBusy(true)
    const ok = await action()
    setIsBusy(false)
    return ok
  }

  function startEditing() {
    setDraftTitle(task.title)
    setDraftDescription(task.description ?? '')
    setIsEditing(true)
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = draftTitle.trim()
    if (!title) return // Save is disabled anyway when the title is blank
    const ok = await runBusy(() =>
      onUpdate(task.id, { title, description: draftDescription.trim() || null }),
    )
    if (ok) setIsEditing(false)
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${task.title}"?`)) return
    await runBusy(() => onDelete(task.id))
  }

  if (isEditing) {
    return (
      <li className="rounded-xl border border-indigo-200 bg-white p-4 shadow-sm">
        <form
          onSubmit={handleSave}
          onKeyDown={(e) => e.key === 'Escape' && setIsEditing(false)}
          className="space-y-2"
        >
          <input
            aria-label="Task title"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            maxLength={200}
            autoFocus
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
          <textarea
            aria-label="Task description"
            value={draftDescription}
            onChange={(e) => setDraftDescription(e.target.value)}
            maxLength={2000}
            rows={2}
            className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isBusy || !draftTitle.trim()}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              disabled={isBusy}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </li>
    )
  }

  return (
    <li className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => runBusy(() => onUpdate(task.id, { completed: !task.completed }))}
        disabled={isBusy}
        aria-label={`Mark "${task.title}" as ${task.completed ? 'not complete' : 'complete'}`}
        className="mt-1 size-5 shrink-0 cursor-pointer accent-indigo-600"
      />
      <div className="min-w-0 flex-1">
        <p
          className={`break-words font-medium ${task.completed ? 'text-slate-400 line-through' : 'text-slate-900'}`}
        >
          {task.title}
        </p>
        {task.description && (
          <p className="mt-1 whitespace-pre-line break-words text-sm text-slate-500">
            {task.description}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
        <button
          type="button"
          onClick={startEditing}
          disabled={isBusy}
          aria-label={`Edit "${task.title}"`}
          className="rounded-lg px-2 py-1 text-sm text-slate-600 hover:bg-slate-100"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isBusy}
          aria-label={`Delete "${task.title}"`}
          className="rounded-lg px-2 py-1 text-sm text-red-600 hover:bg-red-50"
        >
          Delete
        </button>
      </div>
    </li>
  )
}
