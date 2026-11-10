const JSON_BODY_LIMIT_BYTES = 10 * 1024;

// Used when CLIENT_ORIGIN is not set (Vite dev server).
const DEFAULT_CLIENT_ORIGIN = 'http://localhost:5173';

// `type` values set by Express's body parser on its errors.
const BODY_PARSER_ERRORS = {
  PARSE_FAILED: 'entity.parse.failed',
  TOO_LARGE: 'entity.too.large',
};

module.exports = { JSON_BODY_LIMIT_BYTES, DEFAULT_CLIENT_ORIGIN, BODY_PARSER_ERRORS };
