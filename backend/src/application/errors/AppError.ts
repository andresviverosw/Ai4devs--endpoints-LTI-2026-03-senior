export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /** HTTP status alias (mirrors common `err.status` naming). */
  get status(): number {
    return this.statusCode;
  }

  toJSON(): { name: string; message: string; details?: unknown } {
    const base = { name: this.name, message: this.message };
    return this.details !== undefined ? { ...base, details: this.details } : base;
  }
}

/** Works when TS target is ES5 (subclass instanceof Error can fail otherwise). */
export function isAppError(error: unknown): error is AppError {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as AppError).name === 'AppError' &&
    typeof (error as AppError).statusCode === 'number' &&
    typeof (error as AppError).message === 'string'
  );
}
