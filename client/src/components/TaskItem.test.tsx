import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Task } from '../api/tasks'
import { TaskItem } from './TaskItem'

const task: Task = {
  id: 7,
  title: 'Walk dog',
  description: 'Evening',
  completed: false,
  createdAt: '2026-11-24T10:00:00.000Z',
  updatedAt: '2026-11-24T10:00:00.000Z',
}

function setup(overrides: Partial<Task> = {}) {
  const onUpdate = vi.fn().mockResolvedValue(true)
  const onDelete = vi.fn().mockResolvedValue(true)
  render(
    <ul>
      <TaskItem task={{ ...task, ...overrides }} onUpdate={onUpdate} onDelete={onDelete} />
    </ul>,
  )
  return { onUpdate, onDelete }
}

describe('TaskItem', () => {
  it('marks the task complete when the checkbox is clicked', async () => {
    const { onUpdate } = setup()
    await userEvent.click(screen.getByRole('checkbox'))
    expect(onUpdate).toHaveBeenCalledWith(7, { completed: true })
  })

  it('edits the title and clears the description', async () => {
    const { onUpdate } = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Edit "Walk dog"' }))

    const titleInput = screen.getByLabelText('Task title')
    await userEvent.clear(titleInput)
    await userEvent.type(titleInput, 'Walk cat')
    await userEvent.clear(screen.getByLabelText('Task description'))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onUpdate).toHaveBeenCalledWith(7, { title: 'Walk cat', description: null })
    expect(screen.queryByLabelText('Task title')).not.toBeInTheDocument() // back to view mode
  })

  it('cancel leaves the task unchanged', async () => {
    const { onUpdate } = setup()
    await userEvent.click(screen.getByRole('button', { name: 'Edit "Walk dog"' }))
    await userEvent.type(screen.getByLabelText('Task title'), ' later')
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onUpdate).not.toHaveBeenCalled()
    expect(screen.getByText('Walk dog')).toBeInTheDocument()
  })

  it('deletes only after the user confirms', async () => {
    const { onDelete } = setup()
    const confirmSpy = vi.spyOn(window, 'confirm')

    confirmSpy.mockReturnValueOnce(false)
    await userEvent.click(screen.getByRole('button', { name: 'Delete "Walk dog"' }))
    expect(onDelete).not.toHaveBeenCalled()

    confirmSpy.mockReturnValueOnce(true)
    await userEvent.click(screen.getByRole('button', { name: 'Delete "Walk dog"' }))
    expect(onDelete).toHaveBeenCalledWith(7)

    confirmSpy.mockRestore()
  })
})
