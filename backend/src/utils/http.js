export class HttpError extends Error {
  constructor(status, message, code) { super(message); this.status = status; this.code = code }
}

export const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)

export function parseId(value, label = 'id') {
  const id = Number(value)
  if (!Number.isSafeInteger(id) || id < 1) throw new HttpError(400, `${label} must be a positive integer.`, 'INVALID_ID')
  return id
}

export function errorHandler(error, _req, res, _next) {
  const status = error.status || (error.code === '23505' ? 409 : error.code === '23503' ? 400 : 500)
  const message = status >= 500 ? 'An unexpected server error occurred.' : error.message
  res.status(status).json({ error: { code: error.code || 'INTERNAL_ERROR', message } })
}
