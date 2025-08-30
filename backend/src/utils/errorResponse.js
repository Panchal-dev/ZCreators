// Custom Error class for consistent error handling
export class ErrorResponse extends Error {
  constructor(message, statusCode) {
    super(message)
    this.statusCode = statusCode
    this.name = 'ErrorResponse'

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor)
  }
}
