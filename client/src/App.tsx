import { TaskForm } from './components/TaskForm'
import { TaskList } from './components/TaskList'
import { useTasks } from './hooks/useTasks'

export default function App() {
  const { tasks, isLoading, loadFailed, error, dismissError, reload, addTask, updateTask, deleteTask } =
    useTasks()
  const doneCount = tasks.filter((task) => task.completed).length

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-2xl space-y-6 px-4 py-8 sm:py-12">
        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Task Manager</h1>
          {!isLoading && !loadFailed && (
            <p className="text-sm text-slate-500">
              {doneCount} of {tasks.length} done
            </p>
          )}
        </header>

        <TaskForm onAdd={addTask} />

        {error && (
          <div
            role="alert"
            className="flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <span>{error}</span>
            {loadFailed ? (
              <button type="button" onClick={reload} className="shrink-0 font-medium underline">
                Retry
              </button>
            ) : (
              <button type="button" onClick={dismissError} aria-label="Dismiss error" className="shrink-0">
                ✕
              </button>
            )}
          </div>
        )}

        {isLoading ? (
          <p className="text-center text-slate-500">
            Loading tasks… (the free API host may take up to a minute to wake up)
          </p>
        ) : (
          !loadFailed && <TaskList tasks={tasks} onUpdate={updateTask} onDelete={deleteTask} />
        )}
      </main>
    </div>
  )
}
