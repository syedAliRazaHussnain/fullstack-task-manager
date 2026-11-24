import type { RequestHandler } from 'express';
import { HttpError } from '../errors.js';

/** Runs only if no route matched. Hands a 404 to the error handler. */
export const notFound: RequestHandler = (req, _res, next) => {
  next(new HttpError(404, `Route not found: ${req.method} ${req.path}`));
};
