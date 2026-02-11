import { describe, it, expect } from 'vitest'
import {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
} from './error-handler'

describe('AppError', () => {
  it('デフォルトのstatusCodeとcodeを持つ', () => {
    const error = new AppError('test error')
    expect(error.message).toBe('test error')
    expect(error.statusCode).toBe(500)
    expect(error.code).toBe('INTERNAL_ERROR')
    expect(error.name).toBe('AppError')
  })

  it('カスタムのstatusCodeとcodeを指定できる', () => {
    const error = new AppError('custom', 422, 'CUSTOM_ERROR')
    expect(error.statusCode).toBe(422)
    expect(error.code).toBe('CUSTOM_ERROR')
  })

  it('Errorのインスタンスである', () => {
    const error = new AppError('test')
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(AppError)
  })
})

describe('ValidationError', () => {
  it('statusCode 400, code VALIDATION_ERROR', () => {
    const error = new ValidationError('入力が不正です')
    expect(error.message).toBe('入力が不正です')
    expect(error.statusCode).toBe(400)
    expect(error.code).toBe('VALIDATION_ERROR')
    expect(error.name).toBe('ValidationError')
  })

  it('AppErrorのインスタンスである', () => {
    const error = new ValidationError('test')
    expect(error).toBeInstanceOf(AppError)
  })
})

describe('UnauthorizedError', () => {
  it('statusCode 401, code UNAUTHORIZED', () => {
    const error = new UnauthorizedError()
    expect(error.message).toBe('Unauthorized')
    expect(error.statusCode).toBe(401)
    expect(error.code).toBe('UNAUTHORIZED')
    expect(error.name).toBe('UnauthorizedError')
  })

  it('カスタムメッセージを指定できる', () => {
    const error = new UnauthorizedError('トークンが無効です')
    expect(error.message).toBe('トークンが無効です')
  })
})

describe('ForbiddenError', () => {
  it('statusCode 403, code FORBIDDEN', () => {
    const error = new ForbiddenError()
    expect(error.message).toBe('Forbidden')
    expect(error.statusCode).toBe(403)
    expect(error.code).toBe('FORBIDDEN')
    expect(error.name).toBe('ForbiddenError')
  })
})

describe('NotFoundError', () => {
  it('statusCode 404, code NOT_FOUND', () => {
    const error = new NotFoundError()
    expect(error.message).toBe('Not found')
    expect(error.statusCode).toBe(404)
    expect(error.code).toBe('NOT_FOUND')
    expect(error.name).toBe('NotFoundError')
  })

  it('カスタムメッセージを指定できる', () => {
    const error = new NotFoundError('セッションが見つかりません')
    expect(error.message).toBe('セッションが見つかりません')
  })
})
