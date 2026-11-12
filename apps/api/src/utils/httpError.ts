// Throw an HttpError from any handler to return a specific status with a safe,
// client-facing message. Anything else that is thrown becomes a 500.

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly errors?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const notFound = (what = 'Resource') => new HttpError(404, `${what} not found`);
export const conflict = (message: string) => new HttpError(409, message);
export const forbidden = (message = 'Forbidden') => new HttpError(403, message);
