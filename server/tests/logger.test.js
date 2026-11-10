process.env.NODE_ENV = 'test';
const express = require('express');
const request = require('supertest');
const app = require('../src/app');
const Task = require('../src/models/Task');
const HTTP = require('../src/constants/http');
const { NODE_ENVS } = require('../src/constants/env');
const {
  LOG_LEVELS,
  SILENT_LEVEL,
  LOG_ENV_VARS,
  LOG_FORMATS,
  LOG_MESSAGES,
  REDACTED_VALUE,
  MAX_LOG_VALUE_LENGTH,
  TRUNCATION_SUFFIX,
  REQUEST_ID_HEADER,
  VALUE_TYPES,
} = require('../src/constants/logger');
const { logger, createLogger, resolveLevel, resolveFormat } = require('../src/utils/logger');
const { responseLogger } = require('../src/middleware/responseLogger');
const { errorHandler } = require('../src/middleware/errorHandler');

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// Logger whose output lands in an array instead of the console.
const captureLogger = (options) => {
  const lines = [];
  const log = createLogger({ format: LOG_FORMATS.JSON, write: (_level, line) => lines.push(line), ...options });
  return { log, lines, entries: () => lines.map((line) => JSON.parse(line)) };
};

// Spy on every logger method (no real output) and return the request-completed entries.
let spies;
beforeEach(() => {
  spies = Object.fromEntries(
    Object.values(LOG_LEVELS).map((level) => [level, jest.spyOn(logger, level).mockImplementation(() => {})])
  );
});
afterEach(() => jest.restoreAllMocks());

const responseLogs = () =>
  Object.entries(spies).flatMap(([level, spy]) =>
    spy.mock.calls
      .filter(([message]) => message === LOG_MESSAGES.REQUEST_COMPLETED)
      .map(([, meta]) => ({ level, meta }))
  );

// Small app exercising the real middleware with controlled response shapes.
const shapesApp = express();
shapesApp.use(responseLogger);
shapesApp.get('/object', (req, res) =>
  res.json({ success: true, message: 'ok', data: { id: 1, email: 'jane@example.com' } })
);
shapesApp.get('/array', (req, res) =>
  res.json({ success: true, message: 'ok', data: [{ id: 1, title: 'Secret plan' }, { id: 2, title: 'Other' }] })
);
shapesApp.get('/validation', async (req, res, next) => next(await new Task({}).validate().catch((err) => err)));
shapesApp.get('/boom', () => {
  throw new Error('boom');
});
shapesApp.use(errorHandler);

describe('resolveLevel', () => {
  it('uses LOG_LEVEL when valid (case-insensitive)', () => {
    expect(resolveLevel({ [LOG_ENV_VARS.LEVEL]: 'WARN', [LOG_ENV_VARS.NODE_ENV]: NODE_ENVS.PRODUCTION })).toBe(
      LOG_LEVELS.WARN
    );
  });

  it.each([
    [NODE_ENVS.DEVELOPMENT, LOG_LEVELS.DEBUG],
    [NODE_ENVS.PRODUCTION, LOG_LEVELS.INFO],
    [NODE_ENVS.TEST, SILENT_LEVEL],
    [undefined, LOG_LEVELS.DEBUG],
  ])('defaults by NODE_ENV=%s to %s', (nodeEnv, expected) => {
    expect(resolveLevel({ [LOG_ENV_VARS.NODE_ENV]: nodeEnv })).toBe(expected);
  });

  it('ignores an invalid LOG_LEVEL', () => {
    expect(resolveLevel({ [LOG_ENV_VARS.LEVEL]: 'verbose', [LOG_ENV_VARS.NODE_ENV]: NODE_ENVS.PRODUCTION })).toBe(
      LOG_LEVELS.INFO
    );
  });

  it('picks JSON format only in production', () => {
    expect(resolveFormat({ [LOG_ENV_VARS.NODE_ENV]: NODE_ENVS.PRODUCTION })).toBe(LOG_FORMATS.JSON);
    expect(resolveFormat({ [LOG_ENV_VARS.NODE_ENV]: NODE_ENVS.DEVELOPMENT })).toBe(LOG_FORMATS.PRETTY);
  });
});

describe('createLogger', () => {
  it('drops entries below the minimum level', () => {
    const { log, entries } = captureLogger({ level: LOG_LEVELS.WARN });
    Object.values(LOG_LEVELS).forEach((level) => log[level](`${level} message`));
    expect(entries().map((e) => e.level)).toEqual([LOG_LEVELS.ERROR, LOG_LEVELS.WARN]);
  });

  it('emits nothing when silent', () => {
    const { log, lines } = captureLogger({ level: SILENT_LEVEL });
    Object.values(LOG_LEVELS).forEach((level) => log[level]('x'));
    expect(lines).toHaveLength(0);
  });

  it('writes timestamp, level, message and metadata as one JSON line', () => {
    const { log, lines, entries } = captureLogger({ level: LOG_LEVELS.DEBUG });
    log.info('hello', { requestId: 'abc' });
    expect(lines[0]).not.toContain('\n');
    expect(entries()[0]).toEqual({
      timestamp: expect.any(String),
      level: LOG_LEVELS.INFO,
      message: 'hello',
      requestId: 'abc',
    });
  });

  it('writes a readable single line in pretty format', () => {
    const { log, lines } = captureLogger({ level: LOG_LEVELS.DEBUG, format: LOG_FORMATS.PRETTY });
    log.warn('careful', { stack: 'line1\nline2' });
    expect(lines[0]).toMatch(/^\S+ WARN {2}careful \{"stack":"line1\\nline2"\}$/);
  });

  it('redacts sensitive fields at any depth', () => {
    const { log, entries } = captureLogger({ level: LOG_LEVELS.DEBUG });
    log.info('auth', {
      user: 'jane',
      password: 'hunter2',
      headers: { Authorization: 'Bearer abc', Cookie: 'sid=1', 'x-ok': 'yes' },
      list: [{ accessToken: 't' }],
    });
    const entry = entries()[0];
    expect(entry.password).toBe(REDACTED_VALUE);
    expect(entry.headers).toEqual({ Authorization: REDACTED_VALUE, Cookie: REDACTED_VALUE, 'x-ok': 'yes' });
    expect(entry.list).toEqual([{ accessToken: REDACTED_VALUE }]);
    expect(entry.user).toBe('jane');
  });

  it('truncates values over the max size', () => {
    const { log, entries } = captureLogger({ level: LOG_LEVELS.DEBUG });
    log.info('big', { blob: 'a'.repeat(MAX_LOG_VALUE_LENGTH + 10) });
    expect(entries()[0].blob).toBe(`${'a'.repeat(MAX_LOG_VALUE_LENGTH)}${TRUNCATION_SUFFIX}`);
  });
});

describe('responseLogger', () => {
  it('summarizes an object response without its values', async () => {
    await request(shapesApp).get('/object');
    const [{ level, meta }] = responseLogs();
    expect(level).toBe(LOG_LEVELS.INFO);
    expect(meta).toMatchObject({ method: 'GET', url: '/object', status: HTTP.OK, durationMs: expect.any(Number) });
    expect(meta.response).toEqual({
      keys: ['success', 'message', 'data'],
      success: true,
      message: 'ok',
      data: { type: VALUE_TYPES.OBJECT, keys: ['id', 'email'] },
    });
    expect(JSON.stringify(meta)).not.toContain('jane@example.com');
  });

  it('summarizes an array response by length and item keys', async () => {
    await request(shapesApp).get('/array');
    const [{ meta }] = responseLogs();
    expect(meta.response.data).toEqual({ type: VALUE_TYPES.ARRAY, length: 2, itemKeys: ['id', 'title'] });
    expect(JSON.stringify(meta)).not.toContain('Secret plan');
  });

  it('summarizes an error response with its errors count and logs warn for 4xx', async () => {
    const res = await request(shapesApp).get('/validation');
    expect(res.status).toBe(HTTP.BAD_REQUEST);
    const [{ level, meta }] = responseLogs();
    expect(level).toBe(LOG_LEVELS.WARN);
    expect(meta.response).toEqual({
      keys: ['success', 'message', 'errors'],
      success: false,
      message: res.body.message,
      errorsCount: res.body.errors.length,
    });
  });

  it('logs error for 5xx, and errorHandler logs the stack with the request ID', async () => {
    const res = await request(shapesApp).get('/boom');
    expect(res.status).toBe(HTTP.INTERNAL_ERROR);
    const [{ level, meta }] = responseLogs();
    expect(level).toBe(LOG_LEVELS.ERROR);

    const handlerCall = spies.error.mock.calls.find(([message]) => message === 'boom');
    expect(handlerCall[1]).toMatchObject({
      requestId: meta.requestId,
      status: HTTP.INTERNAL_ERROR,
      stack: expect.stringContaining('Error: boom'),
    });
  });

  it('omits the stack from errorHandler logs in production', async () => {
    process.env.NODE_ENV = NODE_ENVS.PRODUCTION;
    try {
      const res = await request(shapesApp).get('/boom');
      expect(res.body.message).toBe('Internal server error');
    } finally {
      process.env.NODE_ENV = NODE_ENVS.TEST;
    }
    const handlerCall = spies.error.mock.calls.find(([message]) => message === 'boom');
    expect(handlerCall[1]).not.toHaveProperty('stack');
  });

  it('generates a request ID, returns it in the header and logs it', async () => {
    const res = await request(app).get('/api/health');
    const id = res.headers[REQUEST_ID_HEADER];
    expect(id).toMatch(UUID_PATTERN);
    expect(responseLogs()[0].meta.requestId).toBe(id);
  });

  it('reuses a safe incoming request ID and replaces an unsafe one', async () => {
    const kept = await request(app).get('/api/health').set(REQUEST_ID_HEADER, 'client-id_123');
    expect(kept.headers[REQUEST_ID_HEADER]).toBe('client-id_123');

    const replaced = await request(app).get('/api/health').set(REQUEST_ID_HEADER, 'bad id\twith spaces');
    expect(replaced.headers[REQUEST_ID_HEADER]).toMatch(UUID_PATTERN);
  });

  it('logs warn for 404 and malformed JSON on the real app', async () => {
    await request(app).get('/api/nope');
    await request(app).post('/api/tasks').set('Content-Type', 'application/json').send('{bad json');
    expect(responseLogs().map(({ level, meta }) => [level, meta.status])).toEqual([
      [LOG_LEVELS.WARN, HTTP.NOT_FOUND],
      [LOG_LEVELS.WARN, HTTP.BAD_REQUEST],
    ]);
  });
});
