import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../errors.js';

/** Errors thrown by express.json() carry a `type` like 'entity.parse.failed'. */
function isBodyParserError(err: unknown): err is { type: string; status: number } {
  return (
    typeof err === 'object' &&
    err !== null &&
    'type' in err &&
    typeof (err as { type: unknown }).type === 'string' &&
    'status' in err
  );
}

/**
 * The single place where errors become HTTP responses.
 * Express knows this is an error handler because it takes 4 arguments.
 * Every error response has the same shape: { error: { message, details? } }
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // 1. Errors we threw on purpose (404 etc.)
  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: { message: err.message, ...(err.details !== undefined && { details: err.details }) },
    });
    return;
  }

  // 2. Validation failures from zod -> 400 with a list of what's wrong
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        message: 'Validation failed',
        details: err.issues.map((issue) => ({
          field: issue.path.join('.') || null,
          message: issue.message,
        })),
      },
    });
    return;
  }

  // 3. Bad request bodies caught by express.json()
  if (isBodyParserError(err)) {
    if (err.type === 'entity.parse.failed') {
      res.status(400).json({ error: { message: 'Request body is not valid JSON' } });
      return;
    }
    if (err.type === 'entity.too.large') {
      res.status(413).json({ error: { message: 'Request body is too large' } });
      return;
    }
  }

  // 4. Anything else is a bug or an outage: log the details, return a generic message.
  console.error(err);
  res.status(500).json({ error: { message: 'Internal server error' } });
};
