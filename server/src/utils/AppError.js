// Operational error with an HTTP status and optional field errors ([{ field, message }]).
class AppError extends Error {
  constructor(message, statusCode, errors) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
  }
}

module.exports = AppError;
