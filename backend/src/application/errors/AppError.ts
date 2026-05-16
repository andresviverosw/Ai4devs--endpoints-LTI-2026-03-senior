export class AppError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
    this.name = 'AppError';
    Object.setPrototypeOf(this, new.target.prototype);
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
