import type { Task, TaskChanges } from '../api/tasks'
import { TaskItem } from './TaskItem'

interface TaskListProps {
  tasks: Task[]
  onUpdate: (id: number, changes: TaskChanges) => Promise<boolean>
  onDelete: (id: number) => Promise<boolean>
}

export function TaskList({ tasks, onUpdate, onDelete }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
        No tasks yet. Add your first one above.
      </p>
    )
  }

  return (
    <ul className="space-y-2">
      {tasks.map((task) => (
        // key = the database id, so React keeps each item's edit state attached to the right task
        <TaskItem key={task.id} task={task} onUpdate={onUpdate} onDelete={onDelete} />
      ))}
    </ul>
  )
}
