import { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'

export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR'
  ) {
    super(message)
    this.name = 'AppError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR')
    this.name = 'ValidationError'
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED')
    this.name = 'UnauthorizedError'
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN')
    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Not found') {
    super(message, 404, 'NOT_FOUND')
    this.name = 'NotFoundError'
  }
}

function isAppError(error: unknown): error is AppError {
  return (
    error instanceof Error &&
    'statusCode' in error &&
    'code' in error &&
    typeof (error as AppError).statusCode === 'number' &&
    typeof (error as AppError).code === 'string'
  )
}

export function errorHandler(error: Error, c: Context) {
  if (isAppError(error)) {
    // Only log 5xx errors
    if (error.statusCode >= 500) {
      console.error(error)
    }
    return c.json(
      {
        error: {
          code: error.code,
          message: error.message,
        },
      },
      error.statusCode as 400 | 401 | 403 | 404 | 500
    )
  }

  if (error instanceof HTTPException) {
    return c.json(
      {
        error: {
          code: 'HTTP_ERROR',
          message: error.message,
        },
      },
      error.status
    )
  }

  console.error('Unhandled error:', error)
  return c.json(
    {
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    },
    500
  )
}
