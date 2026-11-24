import { useRef, useState, type FormEvent } from 'react'
import type { NewTask } from '../api/tasks'

interface TaskFormProps {
  onAdd: (input: NewTask) => Promise<boolean>
}

/** "Add a task" form. Clears itself only if the server accepted the task. */
export function TaskForm({ onAdd }: TaskFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault() // stop the browser's full-page form submit
    const trimmedTitle = title.trim()
    if (!trimmedTitle) {
      setValidationError('Title is required')
      return
    }

    setValidationError(null)
    setIsSubmitting(true)
    const ok = await onAdd({
      title: trimmedTitle,
      ...(description.trim() && { description: description.trim() }),
    })
    setIsSubmitting(false)
    if (ok) {
      setTitle('')
      setDescription('')
    }
    // The fields were disabled while saving (so nothing typed mid-save gets wiped);
    // wait one frame for React to re-enable them, then put the cursor back for the next task.
    requestAnimationFrame(() => titleRef.current?.focus())
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      {/* A disabled fieldset disables every input and button inside it in one go. */}
      <fieldset disabled={isSubmitting} className="space-y-3">
        <div>
          <label htmlFor="new-title" className="mb-1 block text-sm font-medium text-slate-700">
            Title
          </label>
          <input
            id="new-title"
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="e.g. Buy groceries"
            aria-invalid={validationError ? true : undefined}
            aria-describedby={validationError ? 'new-title-error' : undefined}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
          {validationError && (
            <p id="new-title-error" className="mt-1 text-sm text-red-600">
              {validationError}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="new-description" className="mb-1 block text-sm font-medium text-slate-700">
            Description <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            id="new-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={2000}
            rows={2}
            className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-60 sm:w-auto"
        >
          {isSubmitting ? 'Adding…' : 'Add task'}
        </button>
      </fieldset>
    </form>
  )
}
