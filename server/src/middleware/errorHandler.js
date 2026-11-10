const mongoose = require('mongoose');
const AppError = require('../utils/AppError');
const HTTP = require('../constants/http');
const { NODE_ENVS } = require('../constants/env');
const { LOG_LEVELS } = require('../constants/logger');
const { MESSAGES, VALIDATION_MESSAGES } = require('../constants/messages');
const { BODY_PARSER_ERRORS } = require('../constants/request');
const { DB_UNAVAILABLE_ERRORS } = require('../constants/db');
const { logger } = require('../utils/logger');

// 404 for unknown routes (JSON, not Express's default HTML)
const notFound = (req, res, next) => {
  next(new AppError(MESSAGES.ROUTE_NOT_FOUND(req.method, req.originalUrl), HTTP.NOT_FOUND));
};

// Maps any error to { status, message, errors? }.
const toErrorResponse = (err) => {
  if (err instanceof AppError) return { status: err.statusCode, message: err.message, errors: err.errors };
  if (err instanceof mongoose.Error.ValidationError) {
    return {
      status: HTTP.BAD_REQUEST,
      message: MESSAGES.VALIDATION_FAILED,
      errors: Object.values(err.errors).map((e) => ({ field: e.path, message: VALIDATION_MESSAGES.FIELD_INVALID })),
    };
  }
  if (err instanceof mongoose.Error.CastError) return { status: HTTP.BAD_REQUEST, message: MESSAGES.INVALID_VALUE(err.path) };
  if (err.type === BODY_PARSER_ERRORS.PARSE_FAILED) return { status: HTTP.BAD_REQUEST, message: MESSAGES.MALFORMED_JSON };
  if (err.type === BODY_PARSER_ERRORS.TOO_LARGE) return { status: HTTP.PAYLOAD_TOO_LARGE, message: MESSAGES.PAYLOAD_TOO_LARGE };
  if (DB_UNAVAILABLE_ERRORS.includes(err.name)) return { status: HTTP.SERVICE_UNAVAILABLE, message: MESSAGES.DB_UNAVAILABLE };
  return { status: err.statusCode || HTTP.INTERNAL_ERROR, message: err.message || MESSAGES.INTERNAL_ERROR };
};

// Single place where every error becomes a response: { success: false, message, errors? }.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const { status, message, errors } = toErrorResponse(err);
  const isProduction = process.env.NODE_ENV === NODE_ENVS.PRODUCTION;
  const isServerError = status >= HTTP.INTERNAL_ERROR;

  // Server faults are errors (with stack outside production); client errors are already
  // summarized (warn) by responseLogger, so they only get a short debug line.
  logger[isServerError ? LOG_LEVELS.ERROR : LOG_LEVELS.DEBUG](err.message, {
    requestId: req.id,
    status,
    name: err.name,
    ...(isServerError && !isProduction && { stack: err.stack }),
  });

  // Unexpected 500s never expose internal messages in production.
  const safeMessage = status === HTTP.INTERNAL_ERROR && isProduction ? MESSAGES.INTERNAL_ERROR : message;
  res.status(status).json({ success: false, message: safeMessage, ...(errors && { errors }) });
};

module.exports = { notFound, errorHandler };
