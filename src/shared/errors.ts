export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'DB_ERROR', details);
    this.name = 'DatabaseError';
  }
}

export class EngineError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'ENGINE_ERROR', details);
    this.name = 'EngineError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}
