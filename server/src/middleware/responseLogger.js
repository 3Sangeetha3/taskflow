const { randomUUID } = require('node:crypto');
const { performance } = require('node:perf_hooks');
const HTTP = require('../constants/http');
const {
  LOG_LEVELS,
  LOG_MESSAGES,
  REQUEST_ID_HEADER,
  REQUEST_ID_PATTERN,
  DURATION_DECIMALS,
  VALUE_TYPES,
} = require('../constants/logger');
const { logger } = require('../utils/logger');

const typeOf = (value) => {
  if (value === null) return VALUE_TYPES.NULL;
  if (Array.isArray(value)) return VALUE_TYPES.ARRAY;
  return typeof value;
};

const isObject = (value) => typeOf(value) === VALUE_TYPES.OBJECT;

const describeData = (data) => {
  const type = typeOf(data);
  if (type === VALUE_TYPES.ARRAY) {
    return { type, length: data.length, ...(isObject(data[0]) && { itemKeys: Object.keys(data[0]) }) };
  }
  if (type === VALUE_TYPES.OBJECT) return { type, keys: Object.keys(data) };
  return { type };
};

// Shape of a response body, never its values (only `success` and `message` are copied).
const summarizeBody = (body) => {
  if (body === undefined) return undefined;
  if (!isObject(body)) return { type: typeOf(body) };
  return {
    keys: Object.keys(body),
    ...('success' in body && { success: body.success }),
    ...('message' in body && { message: body.message }),
    ...(Array.isArray(body.errors) && { errorsCount: body.errors.length }),
    ...('data' in body && { data: describeData(body.data) }),
  };
};

const levelForStatus = (status) => {
  if (status >= HTTP.INTERNAL_ERROR) return LOG_LEVELS.ERROR;
  if (status >= HTTP.BAD_REQUEST) return LOG_LEVELS.WARN;
  return LOG_LEVELS.INFO;
};

const resolveRequestId = (incoming) => (REQUEST_ID_PATTERN.test(incoming ?? '') ? incoming : randomUUID());

// Register first: assigns req.id, echoes it in the response header, and logs one line per response.
const responseLogger = (req, res, next) => {
  const start = performance.now();
  req.id = resolveRequestId(req.get(REQUEST_ID_HEADER));
  res.setHeader(REQUEST_ID_HEADER, req.id);

  let body;
  const originalJson = res.json.bind(res);
  res.json = (payload) => {
    body = payload;
    return originalJson(payload);
  };

  res.on('finish', () => {
    logger[levelForStatus(res.statusCode)](LOG_MESSAGES.REQUEST_COMPLETED, {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      durationMs: Number((performance.now() - start).toFixed(DURATION_DECIMALS)),
      response: summarizeBody(body),
    });
  });

  next();
};

module.exports = { responseLogger, summarizeBody };
