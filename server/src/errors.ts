/**
 * An error that already knows which HTTP status it should produce.
 * Throw it anywhere in a route; the error handler turns it into a JSON response.
 *
 *   throw new HttpError(404, 'Task 7 not found');
 */
export class HttpError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }
}
