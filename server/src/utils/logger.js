// Zero-dependency structured logger: JSON lines in production, readable single lines elsewhere.
const {
  LOG_LEVELS,
  LEVEL_PRIORITY,
  LOG_ENV_VARS,
  DEFAULT_LEVELS,
  LOG_FORMATS,
  REDACTED_FIELDS,
  REDACTED_VALUE,
  MAX_LOG_VALUE_LENGTH,
  TRUNCATION_SUFFIX,
  LEVEL_LABEL_WIDTH,
} = require('../constants/logger');
const { NODE_ENVS } = require('../constants/env');

const resolveLevel = (env = process.env) => {
  const requested = env[LOG_ENV_VARS.LEVEL]?.trim().toLowerCase();
  if (requested && Object.hasOwn(LEVEL_PRIORITY, requested)) return requested;
  return DEFAULT_LEVELS[env[LOG_ENV_VARS.NODE_ENV]] ?? DEFAULT_LEVELS[NODE_ENVS.DEVELOPMENT];
};

const resolveFormat = (env = process.env) =>
  env[LOG_ENV_VARS.NODE_ENV] === NODE_ENVS.PRODUCTION ? LOG_FORMATS.JSON : LOG_FORMATS.PRETTY;

const isSensitiveKey = (key) => {
  const lower = key.toLowerCase();
  return REDACTED_FIELDS.some((field) => lower.includes(field));
};

const truncate = (str) =>
  str.length > MAX_LOG_VALUE_LENGTH ? `${str.slice(0, MAX_LOG_VALUE_LENGTH)}${TRUNCATION_SUFFIX}` : str;

// Deep copy of metadata with sensitive keys redacted and long strings truncated.
const sanitize = (value) => {
  if (typeof value === 'string') return truncate(value);
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, isSensitiveKey(key) ? REDACTED_VALUE : sanitize(val)])
    );
  }
  return value;
};

const FORMATTERS = {
  [LOG_FORMATS.JSON]: (entry) => JSON.stringify(entry),
  [LOG_FORMATS.PRETTY]: ({ timestamp, level, message, ...meta }) => {
    const parts = [timestamp, level.toUpperCase().padEnd(LEVEL_LABEL_WIDTH), message];
    if (Object.keys(meta).length) parts.push(JSON.stringify(meta));
    return parts.join(' ');
  },
};

const writeToStream = (level, line) => {
  const isProblem = LEVEL_PRIORITY[level] <= LEVEL_PRIORITY[LOG_LEVELS.WARN];
  (isProblem ? process.stderr : process.stdout).write(`${line}\n`);
};

const createLogger = ({ level = resolveLevel(), format = resolveFormat(), write = writeToStream } = {}) => {
  const threshold = LEVEL_PRIORITY[level];
  const formatLine = FORMATTERS[format];

  const log = (entryLevel, message, meta = {}) => {
    if (LEVEL_PRIORITY[entryLevel] > threshold) return;
    const entry = { timestamp: new Date().toISOString(), level: entryLevel, message: truncate(String(message)) };
    write(entryLevel, formatLine({ ...entry, ...sanitize(meta) }));
  };

  return Object.fromEntries(
    Object.values(LOG_LEVELS).map((entryLevel) => [entryLevel, (message, meta) => log(entryLevel, message, meta)])
  );
};

const logger = createLogger();

module.exports = { logger, createLogger, resolveLevel, resolveFormat };
