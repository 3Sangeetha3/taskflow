// API contract: envelopes, exact messages, task shape, CORS and idempotency.
process.env.NODE_ENV = 'test';
const ALLOWED_ORIGIN = 'http://allowed.example';
process.env.CLIENT_ORIGIN = ALLOWED_ORIGIN; // must be set before the app is loaded

const request = require('supertest');
const app = require('../src/app');
const db = require('./setup');
const HTTP = require('../src/constants/http');
const { MESSAGES } = require('../src/constants/messages');
const { STATUSES, TASK_PUBLIC_FIELDS } = require('../src/constants/task');
const { TASKS_URL, validTask, missingId, postTask } = require('./factories');

const [, , COMPLETED] = STATUSES;
const TASK_KEYS = ['id', ...TASK_PUBLIC_FIELDS].sort();
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const taskUrl = (id) => `${TASKS_URL}/${id}`;

const expectTaskShape = (task) => {
  expect(Object.keys(task).sort()).toEqual(TASK_KEYS);
  expect(task.createdAt).toMatch(ISO_DATETIME);
  expect(task.updatedAt).toMatch(ISO_DATETIME);
  if (task.dueDate !== null) expect(task.dueDate).toMatch(ISO_DATETIME);
};

const expectNoMongoInternals = (res) => {
  expect(res.text).not.toContain('"_id"');
  expect(res.text).not.toContain('"__v"');
};

beforeAll(db.connect, db.DB_HOOK_TIMEOUT_MS);
afterEach(db.clear);
afterAll(db.disconnect, db.DB_HOOK_TIMEOUT_MS);

describe('success envelope, messages and task shape for all 6 endpoints', () => {
  let id;
  beforeEach(async () => {
    ({ id } = (await postTask({ description: 'd', dueDate: '2026-11-15' })).body.data);
  });

  it.each([
    ['POST /api/tasks', () => postTask(), HTTP.CREATED, MESSAGES.TASK_CREATED],
    ['GET /api/tasks/:id', () => request(app).get(taskUrl(id)), HTTP.OK, MESSAGES.TASK_FETCHED],
    ['PUT /api/tasks/:id', () => request(app).put(taskUrl(id)).send(validTask()), HTTP.OK, MESSAGES.TASK_UPDATED],
    [
      'PATCH /api/tasks/:id/status',
      () => request(app).patch(`${taskUrl(id)}/status`).send({ status: COMPLETED }),
      HTTP.OK,
      MESSAGES.TASK_STATUS_UPDATED,
    ],
  ])('%s → exact envelope, message and Task shape', async (_name, send, status, message) => {
    const res = await send();
    expect(res.status).toBe(status);
    expect(Object.keys(res.body).sort()).toEqual(['data', 'message', 'success']);
    expect(res.body).toMatchObject({ success: true, message });
    expectTaskShape(res.body.data);
    expectNoMongoInternals(res);
  });

  it('GET /api/tasks → envelope with meta, every item is a Task', async () => {
    const res = await request(app).get(TASKS_URL);
    expect(res.status).toBe(HTTP.OK);
    expect(Object.keys(res.body).sort()).toEqual(['data', 'message', 'meta', 'success']);
    expect(res.body.message).toBe(MESSAGES.TASKS_FETCHED);
    expect(Object.keys(res.body.meta).sort()).toEqual(['limit', 'page', 'total', 'totalPages']);
    res.body.data.forEach(expectTaskShape);
    expect(res.body.data[0].dueDate).toBe('2026-11-15T00:00:00.000Z');
    expectNoMongoInternals(res);
  });

  it('DELETE /api/tasks/:id → data is { id }, second delete → 404 (idempotency)', async () => {
    const first = await request(app).delete(taskUrl(id));
    expect(first.status).toBe(HTTP.OK);
    expect(first.body).toEqual({ success: true, message: MESSAGES.TASK_DELETED, data: { id } });
    const second = await request(app).delete(taskUrl(id));
    expect(second.status).toBe(HTTP.NOT_FOUND);
    expect(second.body).toEqual({ success: false, message: MESSAGES.TASK_NOT_FOUND });
  });
});

describe('error envelope', () => {
  it.each([
    ['validation', () => postTask({ title: '' }), true],
    ['invalid id', () => request(app).get(taskUrl('abc')), false],
    ['not found', () => request(app).get(taskUrl(missingId())), false],
    ['unknown route', () => request(app).get('/api/nope'), false],
  ])('%s → { success:false, message } (+errors only on validation)', async (_name, send, hasErrors) => {
    const res = await send();
    const expectedKeys = hasErrors ? ['errors', 'message', 'success'] : ['message', 'success'];
    expect(Object.keys(res.body).sort()).toEqual(expectedKeys);
    expect(res.body.success).toBe(false);
    expectNoMongoInternals(res);
  });

  it('malformed :id is rejected before body validation', async () => {
    const res = await request(app).put(taskUrl('abc')).send({ nonsense: true });
    expect(res.status).toBe(HTTP.BAD_REQUEST);
    expect(res.body).toEqual({ success: false, message: MESSAGES.INVALID_ID });
  });
});

describe('unknown fields on every write route', () => {
  let id;
  beforeEach(async () => {
    ({ id } = (await postTask()).body.data);
  });

  it.each([
    ['POST', () => request(app).post(TASKS_URL).send(validTask({ extra: 1 }))],
    ['PUT', () => request(app).put(taskUrl(id)).send(validTask({ extra: 1 }))],
    ['PATCH', () => request(app).patch(`${taskUrl(id)}/status`).send({ status: COMPLETED, extra: 1 })],
  ])('%s → 400 naming the field', async (_name, send) => {
    const res = await send();
    expect(res.status).toBe(HTTP.BAD_REQUEST);
    expect(res.body.message).toBe(MESSAGES.VALIDATION_FAILED);
    expect(res.body.errors).toEqual([expect.objectContaining({ field: 'extra' })]);
  });
});

describe('wrong Content-Type', () => {
  it.each([
    ['text/plain', 'title=Some title'],
    ['application/x-www-form-urlencoded', 'title=Some+title'],
  ])('%s body → 400', async (type, body) => {
    const res = await request(app).post(TASKS_URL).set('Content-Type', type).send(body);
    expect(res.status).toBe(HTTP.BAD_REQUEST);
    expect(res.body.success).toBe(false);
  });
});

describe('CORS', () => {
  it('allows CLIENT_ORIGIN', async () => {
    const res = await request(app).get('/api/health').set('Origin', ALLOWED_ORIGIN);
    expect(res.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
  });

  it('does not allow other origins', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'http://evil.example');
    expect(res.headers['access-control-allow-origin']).not.toBe('http://evil.example');
    expect(res.headers['access-control-allow-origin']).not.toBe('*');
  });
});
