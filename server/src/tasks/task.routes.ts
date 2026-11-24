import { Router } from 'express';
import { HttpError } from '../errors.js';
import * as taskRepository from './task.repository.js';
import { CreateTaskBody, TaskIdParams, UpdateTaskBody } from './task.schema.js';

/**
 * HTTP layer only: read the request, validate it, call the repository, send a status.
 * .parse() throws a ZodError on bad input; Express 5 forwards anything thrown
 * (even from async handlers) to the error handler, which answers 400.
 */
export const taskRouter = Router();

function taskNotFound(id: number): HttpError {
  return new HttpError(404, `Task ${id} not found`);
}

// GET /api/tasks -> 200 Task[]
taskRouter.get('/', async (_req, res) => {
  res.json(await taskRepository.findAll());
});

// GET /api/tasks/:id -> 200 Task | 404
taskRouter.get('/:id', async (req, res) => {
  const { id } = TaskIdParams.parse(req.params);
  const task = await taskRepository.findById(id);
  if (!task) throw taskNotFound(id);
  res.json(task);
});

// POST /api/tasks -> 201 Task
taskRouter.post('/', async (req, res) => {
  const input = CreateTaskBody.parse(req.body);
  const task = await taskRepository.create(input);
  res.status(201).json(task);
});

// PATCH /api/tasks/:id -> 200 Task | 404
taskRouter.patch('/:id', async (req, res) => {
  const { id } = TaskIdParams.parse(req.params);
  const changes = UpdateTaskBody.parse(req.body);
  const task = await taskRepository.update(id, changes);
  if (!task) throw taskNotFound(id);
  res.json(task);
});

// DELETE /api/tasks/:id -> 204 (no body) | 404
taskRouter.delete('/:id', async (req, res) => {
  const { id } = TaskIdParams.parse(req.params);
  const deleted = await taskRepository.remove(id);
  if (!deleted) throw taskNotFound(id);
  res.status(204).end();
});
