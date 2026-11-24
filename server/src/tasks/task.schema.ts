import { z } from 'zod';

/** Largest value a Postgres INTEGER column can hold. */
const MAX_INT = 2_147_483_647;

/** Route param `:id`: digits only, then turned into a number. "abc", "1.5", "-3" -> 400 */
export const TaskIdParams = z.object({
  id: z
    .string()
    .regex(/^\d+$/, 'id must be a positive whole number')
    .transform(Number)
    .pipe(z.number().int().positive('id must be a positive whole number').max(MAX_INT, 'id is too large')),
});

const title = z
  .string()
  .trim()
  .min(1, 'Title is required')
  .max(200, 'Title must be 200 characters or fewer');

/** null or "" both mean "no description" and are stored as NULL. */
const description = z
  .string()
  .trim()
  .max(2000, 'Description must be 2000 characters or fewer')
  .nullable()
  .transform((value) => (value === '' ? null : value));

/** POST /api/tasks body. strictObject rejects unknown keys like "id" or "createdAt". */
export const CreateTaskBody = z.strictObject({
  title,
  description: description.optional(),
});

/** PATCH /api/tasks/:id body. Every field optional, but at least one is required. */
export const UpdateTaskBody = z
  .strictObject({
    title: title.optional(),
    description: description.optional(),
    completed: z.boolean().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Provide at least one of: title, description, completed',
  });

export type CreateTaskInput = z.infer<typeof CreateTaskBody>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskBody>;
