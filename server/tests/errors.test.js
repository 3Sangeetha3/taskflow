process.env.NODE_ENV = 'test';
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const db = require('./setup');
const Task = require('../src/models/Task');
const HTTP = require('../src/constants/http');
const { NODE_ENVS } = require('../src/constants/env');
const { MESSAGES } = require('../src/constants/messages');
const { JSON_BODY_LIMIT_BYTES } = require('../src/constants/request');
const { TASKS_URL, validTask, stringOfLength, postTask } = require('./factories');

const DB_DOWN_MAX_MS = 1000;
const ERROR_KEYS = ['success', 'message', 'errors'];

const expectErrorShape = (res) => {
  expect(res.headers['content-type']).toMatch(/application\/json/);
  expect(res.body.success).toBe(false);
  expect(typeof res.body.message).toBe('string');
  Object.keys(res.body).forEach((key) => expect(ERROR_KEYS).toContain(key));
};

const sendMalformedJson = () =>
  request(app).post(TASKS_URL).set('Content-Type', 'application/json').send('{"title": "oops"');

beforeAll(db.connect, db.DB_HOOK_TIMEOUT_MS);
afterEach(db.clear);
afterAll(db.disconnect, db.DB_HOOK_TIMEOUT_MS);

describe('D. errors and resilience', () => {
  it('malformed JSON → 400 JSON error', async () => {
    const res = await sendMalformedJson();
    expect(res.status).toBe(HTTP.BAD_REQUEST);
    expect(res.body).toEqual({ success: false, message: MESSAGES.MALFORMED_JSON });
  });

  it('body over the size limit → 413', async () => {
    const res = await postTask({ description: stringOfLength(JSON_BODY_LIMIT_BYTES + 1) });
    expect(res.status).toBe(HTTP.PAYLOAD_TOO_LARGE);
    expect(res.body).toEqual({ success: false, message: MESSAGES.PAYLOAD_TOO_LARGE });
  });

  it('unknown route → 404 JSON', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(HTTP.NOT_FOUND);
    expect(res.body).toEqual({ success: false, message: MESSAGES.ROUTE_NOT_FOUND('GET', '/api/nope') });
  });

  it('database unavailable → 503 fast (bufferCommands: false)', async () => {
    await mongoose.disconnect();
    try {
      const started = Date.now();
      const res = await request(app).get(TASKS_URL);
      expect(Date.now() - started).toBeLessThan(DB_DOWN_MAX_MS);
      expect(res.status).toBe(HTTP.SERVICE_UNAVAILABLE);
      expect(res.body).toEqual({ success: false, message: MESSAGES.DB_UNAVAILABLE });
    } finally {
      await db.reconnect();
    }
    expect((await request(app).get(TASKS_URL)).status).toBe(HTTP.OK);
  });

  describe('in production', () => {
    beforeEach(() => {
      process.env.NODE_ENV = NODE_ENVS.PRODUCTION;
    });
    afterEach(() => {
      process.env.NODE_ENV = NODE_ENVS.TEST;
      jest.restoreAllMocks();
    });

    const expectNoInternals = (res) => {
      const text = JSON.stringify(res.body);
      expect(text).not.toMatch(/stack/i);
      expect(text).not.toMatch(/mongo/i);
      expect(text).not.toMatch(/\bat .+\.js:\d+/); // no stack frames
    };

    it('unexpected errors become a generic 500 without stack or Mongoose internals', async () => {
      jest.spyOn(Task, 'find').mockImplementation(() => {
        throw new mongoose.Error('MongooseError: secret internal detail');
      });
      const res = await request(app).get(TASKS_URL);
      expect(res.status).toBe(HTTP.INTERNAL_ERROR);
      expect(res.body).toEqual({ success: false, message: MESSAGES.INTERNAL_ERROR });
      expectNoInternals(res);
    });

    it.each([
      ['malformed JSON', sendMalformedJson],
      ['invalid id', () => request(app).get(`${TASKS_URL}/abc`)],
      ['validation error', () => postTask({ title: 1, foo: 2 })],
      ['missing task', () => request(app).get(`${TASKS_URL}/${new mongoose.Types.ObjectId()}`)],
    ])('%s response has no internals', async (_name, send) => {
      const res = await send();
      expectErrorShape(res);
      expectNoInternals(res);
    });

    it('db unavailable response has no internals', async () => {
      await mongoose.disconnect();
      try {
        const res = await request(app).get(TASKS_URL);
        expect(res.status).toBe(HTTP.SERVICE_UNAVAILABLE);
        expectNoInternals(res);
      } finally {
        await db.reconnect();
      }
    });
  });

  it.each([
    ['400 validation', () => postTask({ title: '' })],
    ['400 malformed JSON', sendMalformedJson],
    ['400 invalid id', () => request(app).delete(`${TASKS_URL}/nope`)],
    ['404 missing task', () => request(app).get(`${TASKS_URL}/${new mongoose.Types.ObjectId()}`)],
    ['404 unknown route', () => request(app).get('/api/unknown')],
    ['413 too large', () => postTask({ description: stringOfLength(JSON_BODY_LIMIT_BYTES + 1) })],
  ])('error shape is { success:false, message, errors? } for %s', async (_name, send) => {
    expectErrorShape(await send());
  });

  it('validation errors carry an errors array of { field, message }', async () => {
    const res = await postTask(validTask({ title: '', foo: 1 }));
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        { field: 'title', message: expect.any(String) },
        { field: 'foo', message: expect.any(String) },
      ])
    );
  });
});
