export class SafeError extends Error {
  constructor(readonly code: string, message: string) { super(message); }
}
export function publicError(error: unknown): string {
  return error instanceof SafeError ? `${error.code}: ${error.message}` : 'INTERNAL_ERROR: Operation failed; no request or credential details are logged.';
}
