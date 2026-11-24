import { pool } from '../db/pool.js';
import type { CreateTaskInput, UpdateTaskInput } from './task.schema.js';

/** A row exactly as Postgres returns it (snake_case, Date objects). */
interface TaskRow {
  id: number;
  title: string;
  description: string | null;
  completed: boolean;
  created_at: Date;
  updated_at: Date;
}

/** A task as the API sends it (camelCase, ISO date strings). */
export interface Task {
  id: number;
  title: string;
  description: string | null;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

const COLUMNS = 'id, title, description, completed, created_at, updated_at';

/** Converts a database row into the API shape. */
function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    completed: row.completed,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/** All tasks, newest first. id breaks ties for tasks created in the same instant. */
export async function findAll(): Promise<Task[]> {
  const result = await pool.query<TaskRow>(
    `SELECT ${COLUMNS} FROM tasks ORDER BY created_at DESC, id DESC`,
  );
  return result.rows.map(toTask);
}

/** One task, or null if the id doesn't exist. */
export async function findById(id: number): Promise<Task | null> {
  const result = await pool.query<TaskRow>(`SELECT ${COLUMNS} FROM tasks WHERE id = $1`, [id]);
  return result.rows[0] ? toTask(result.rows[0]) : null;
}

/** Inserts a task and returns it as stored (with its new id and timestamps). */
export async function create(input: CreateTaskInput): Promise<Task> {
  const result = await pool.query<TaskRow>(
    `INSERT INTO tasks (title, description) VALUES ($1, $2) RETURNING ${COLUMNS}`,
    [input.title, input.description ?? null],
  );
  return toTask(result.rows[0]!);
}

/** Maps API field names to column names. Only these columns can ever be updated. */
const UPDATABLE_COLUMNS = {
  title: 'title',
  description: 'description',
  completed: 'completed',
} as const;

/**
 * Updates only the fields present in `changes`, so { completed: true } leaves the
 * title alone, while { description: null } clears the description.
 * Returns the updated task, or null if the id doesn't exist.
 */
export async function update(id: number, changes: UpdateTaskInput): Promise<Task | null> {
  const setClauses: string[] = [];
  const values: unknown[] = [];

  for (const [field, column] of Object.entries(UPDATABLE_COLUMNS)) {
    const value = changes[field as keyof UpdateTaskInput];
    if (value !== undefined) {
      values.push(value);
      setClauses.push(`${column} = $${values.length}`); // e.g. "title = $1"
    }
  }
  setClauses.push('updated_at = now()');
  values.push(id);

  const result = await pool.query<TaskRow>(
    `UPDATE tasks SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING ${COLUMNS}`,
    values,
  );
  return result.rows[0] ? toTask(result.rows[0]) : null;
}

/** Deletes a task. Returns true if a row was deleted, false if the id didn't exist. */
export async function remove(id: number): Promise<boolean> {
  const result = await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
  return (result.rowCount ?? 0) > 0;
}
