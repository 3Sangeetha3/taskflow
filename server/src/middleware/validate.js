const AppError = require('../utils/AppError');
const HTTP = require('../constants/http');
const { MESSAGES, VALIDATION_MESSAGES } = require('../constants/messages');

const UNRECOGNIZED_KEYS = 'unrecognized_keys'; // Zod issue code for fields not in a strict schema

// Zod issues → [{ field, message }] with dotted paths; root-level issues use the source name ("body").
const formatZodError = (error, source) =>
  error.issues.flatMap((issue) =>
    issue.code === UNRECOGNIZED_KEYS
      ? issue.keys.map((key) => ({ field: [...issue.path, key].join('.'), message: VALIDATION_MESSAGES.UNKNOWN_FIELD }))
      : [{ field: issue.path.join('.') || source, message: issue.message }]
  );

// validate({ body, query, params }): parses each source and stores the output in req.validated.
// Never reassigns req.query (read-only getter in Express 5).
const validate = (schemas) => (req, res, next) => {
  const validated = { ...req.validated };
  const errors = [];
  Object.entries(schemas).forEach(([source, schema]) => {
    const result = schema.safeParse(req[source]);
    if (result.success) validated[source] = result.data;
    else errors.push(...formatZodError(result.error, source));
  });
  if (errors.length) return next(new AppError(MESSAGES.VALIDATION_FAILED, HTTP.BAD_REQUEST, errors));
  req.validated = validated;
  return next();
};

module.exports = { validate, formatZodError };
