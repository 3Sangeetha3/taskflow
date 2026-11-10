const { NODE_ENVS } = require('./env');

const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
};

const SILENT_LEVEL = 'silent';

// Lower number = more severe. A logger at level X emits every level whose priority <= X.
const LEVEL_PRIORITY = {
  [SILENT_LEVEL]: -1,
  [LOG_LEVELS.ERROR]: 0,
  [LOG_LEVELS.WARN]: 1,
  [LOG_LEVELS.INFO]: 2,
  [LOG_LEVELS.DEBUG]: 3,
};

const LOG_ENV_VARS = {
  LEVEL: 'LOG_LEVEL',
  NODE_ENV: 'NODE_ENV',
};

// Used when LOG_LEVEL is unset or invalid. Unknown NODE_ENV falls back to development.
const DEFAULT_LEVELS = {
  [NODE_ENVS.DEVELOPMENT]: LOG_LEVELS.DEBUG,
  [NODE_ENVS.PRODUCTION]: LOG_LEVELS.INFO,
  [NODE_ENVS.TEST]: SILENT_LEVEL,
};

const LOG_FORMATS = {
  JSON: 'json',
  PRETTY: 'pretty',
};

// Matched case-insensitively as substrings, so `accessToken` and `set-cookie` are covered too.
const REDACTED_FIELDS = ['password', 'token', 'authorization', 'cookie'];
const REDACTED_VALUE = '[REDACTED]';

// Max characters kept for any single logged string (message, URL, stack, ...).
const MAX_LOG_VALUE_LENGTH = 2048;
const TRUNCATION_SUFFIX = '...[truncated]';

const LEVEL_LABEL_WIDTH = 5;
const DURATION_DECIMALS = 2;

const REQUEST_ID_HEADER = 'x-request-id';
// Client-supplied IDs are reused only if they look safe; otherwise a UUID is generated.
const REQUEST_ID_PATTERN = /^[\w-]{1,128}$/;

const VALUE_TYPES = {
  ARRAY: 'array',
  NULL: 'null',
  OBJECT: 'object',
};

const LOG_MESSAGES = {
  REQUEST_COMPLETED: 'request completed',
  SERVER_LISTENING: 'API listening',
  SERVER_START_FAILED: 'Failed to start server',
  DB_CONNECTED: 'MongoDB connected',
  MONGO_URI_MISSING: 'MONGO_URI is not defined',
};

module.exports = {
  LOG_LEVELS,
  SILENT_LEVEL,
  LEVEL_PRIORITY,
  LOG_ENV_VARS,
  DEFAULT_LEVELS,
  LOG_FORMATS,
  REDACTED_FIELDS,
  REDACTED_VALUE,
  MAX_LOG_VALUE_LENGTH,
  TRUNCATION_SUFFIX,
  LEVEL_LABEL_WIDTH,
  DURATION_DECIMALS,
  REQUEST_ID_HEADER,
  REQUEST_ID_PATTERN,
  VALUE_TYPES,
  LOG_MESSAGES,
};
