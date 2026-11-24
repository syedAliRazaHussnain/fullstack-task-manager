import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TaskForm } from './TaskForm'

describe('TaskForm', () => {
  it('shows an error and does not submit when the title is blank', async () => {
    const onAdd = vi.fn()
    render(<TaskForm onAdd={onAdd} />)

    await userEvent.type(screen.getByLabelText('Title'), '   ')
    await userEvent.click(screen.getByRole('button', { name: 'Add task' }))

    expect(screen.getByText('Title is required')).toBeInTheDocument()
    expect(onAdd).not.toHaveBeenCalled()
  })

  it('sends trimmed values and clears the form when the server accepts', async () => {
    const onAdd = vi.fn().mockResolvedValue(true)
    render(<TaskForm onAdd={onAdd} />)

    await userEvent.type(screen.getByLabelText('Title'), '  Buy milk  ')
    await userEvent.type(screen.getByLabelText(/Description/), ' 2 litres ')
    await userEvent.click(screen.getByRole('button', { name: 'Add task' }))

    expect(onAdd).toHaveBeenCalledWith({ title: 'Buy milk', description: '2 litres' })
    expect(screen.getByLabelText('Title')).toHaveValue('')
  })

  it('keeps what the user typed when the server rejects', async () => {
    const onAdd = vi.fn().mockResolvedValue(false)
    render(<TaskForm onAdd={onAdd} />)

    await userEvent.type(screen.getByLabelText('Title'), 'Keep me')
    await userEvent.click(screen.getByRole('button', { name: 'Add task' }))

    expect(onAdd).toHaveBeenCalledWith({ title: 'Keep me' })
    expect(screen.getByLabelText('Title')).toHaveValue('Keep me')
  })
})
