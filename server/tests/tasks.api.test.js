process.env.NODE_ENV = 'test';
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const db = require('./setup');
const Task = require('../src/models/Task');
const HTTP = require('../src/constants/http');
const { MESSAGES } = require('../src/constants/messages');
const { STATUSES, PRIORITIES, TASK_LIMITS, TASK_DEFAULTS, PAGINATION, SEARCH_MAX_LENGTH } = require('../src/constants/task');
const { TASKS_URL, validTask, stringOfLength, missingId, postTask, createTasks, listTasks } = require('./factories');

const [PENDING, IN_PROGRESS, COMPLETED] = STATUSES;
const [LOW, MEDIUM, HIGH] = PRIORITIES;
const taskUrl = (id) => `${TASKS_URL}/${id}`;
const statusUrl = (id) => `${taskUrl(id)}/status`;
const titlesOf = (res) => res.body.data.map((t) => t.title);
const errorFieldsOf = (res) => res.body.errors.map((e) => e.field);

beforeAll(db.connect, db.DB_HOOK_TIMEOUT_MS);
afterEach(db.clear);
afterAll(db.disconnect, db.DB_HOOK_TIMEOUT_MS);

describe('A. required cases', () => {
  it('1. POST valid → 201 with id, defaults applied, no _id/__v', async () => {
    const res = await postTask();
    expect(res.status).toBe(HTTP.CREATED);
    expect(res.body).toMatchObject({ success: true, message: MESSAGES.TASK_CREATED });
    expect(res.body.data).toMatchObject({
      id: expect.any(String),
      title: validTask().title,
      description: TASK_DEFAULTS.DESCRIPTION,
      priority: TASK_DEFAULTS.PRIORITY,
      status: TASK_DEFAULTS.STATUS,
      dueDate: TASK_DEFAULTS.DUE_DATE,
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    });
    expect(res.body.data).not.toHaveProperty('_id');
    expect(res.body.data).not.toHaveProperty('__v');
  });

  it('2. POST without title → 400', async () => {
    const res = await request(app).post(TASKS_URL).send({ description: 'no title' });
    expect(res.status).toBe(HTTP.BAD_REQUEST);
    expect(errorFieldsOf(res)).toEqual(['title']);
  });

  it('3. POST invalid priority → 400', async () => {
    const res = await postTask({ priority: 'Urgent' });
    expect(res.status).toBe(HTTP.BAD_REQUEST);
    expect(errorFieldsOf(res)).toEqual(['priority']);
  });

  it('4. POST title of length 2 → 400', async () => {
    const res = await postTask({ title: stringOfLength(TASK_LIMITS.TITLE_MIN - 1) });
    expect(res.status).toBe(HTTP.BAD_REQUEST);
  });

  it('5. GET /api/tasks → 200 with items', async () => {
    await createTasks([{ title: 'First' }, { title: 'Second' }]);
    const res = await listTasks();
    expect(res.status).toBe(HTTP.OK);
    expect(res.body.message).toBe(MESSAGES.TASKS_FETCHED);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta).toEqual({ page: PAGINATION.DEFAULT_PAGE, limit: PAGINATION.DEFAULT_LIMIT, total: 2, totalPages: 1 });
  });

  it('6. GET /api/tasks/:id nonexistent → 404', async () => {
    const res = await request(app).get(taskUrl(missingId()));
    expect(res.status).toBe(HTTP.NOT_FOUND);
    expect(res.body).toEqual({ success: false, message: MESSAGES.TASK_NOT_FOUND });
  });

  it('7. PUT existing → 200 with changed values', async () => {
    const { id } = (await postTask()).body.data;
    const update = { title: 'Rewritten', description: 'Now with detail', priority: HIGH, status: IN_PROGRESS, dueDate: '2026-12-01' };
    const res = await request(app).put(taskUrl(id)).send(update);
    expect(res.status).toBe(HTTP.OK);
    expect(res.body.message).toBe(MESSAGES.TASK_UPDATED);
    expect(res.body.data).toMatchObject({ ...update, id, dueDate: '2026-12-01T00:00:00.000Z' });
  });

  it('8. PUT with invalid id → 400', async () => {
    const res = await request(app).put(taskUrl('abc')).send(validTask());
    expect(res.status).toBe(HTTP.BAD_REQUEST);
    expect(res.body.message).toBe(MESSAGES.INVALID_ID);
  });

  it('9. DELETE existing → 200, then GET → 404', async () => {
    const { id } = (await postTask()).body.data;
    const del = await request(app).delete(taskUrl(id));
    expect(del.status).toBe(HTTP.OK);
    expect(del.body).toEqual({ success: true, message: MESSAGES.TASK_DELETED, data: { id } });
    expect((await request(app).get(taskUrl(id))).status).toBe(HTTP.NOT_FOUND);
    expect(await Task.countDocuments()).toBe(0); // hard delete
  });

  it('10. DELETE nonexistent → 404', async () => {
    const res = await request(app).delete(taskUrl(missingId()));
    expect(res.status).toBe(HTTP.NOT_FOUND);
  });

  it('11. PUT and PATCH with invalid status → 400', async () => {
    const { id } = (await postTask()).body.data;
    const put = await request(app).put(taskUrl(id)).send(validTask({ status: 'Done' }));
    const patch = await request(app).patch(statusUrl(id)).send({ status: 'Done' });
    expect([put.status, patch.status]).toEqual([HTTP.BAD_REQUEST, HTTP.BAD_REQUEST]);
    expect(errorFieldsOf(patch)).toEqual(['status']);
  });

  it('12. search by title returns only matching tasks', async () => {
    await createTasks([{ title: 'Buy groceries' }, { title: 'Write report' }, { title: 'Review report' }]);
    const res = await listTasks({ search: 'report' });
    expect(res.status).toBe(HTTP.OK);
    expect(titlesOf(res)).toEqual(['Review report', 'Write report']);
  });
});

describe('B. validation edge cases (API)', () => {
  it.each([
    [TASK_LIMITS.TITLE_MIN - 1, HTTP.BAD_REQUEST],
    [TASK_LIMITS.TITLE_MIN, HTTP.CREATED],
    [TASK_LIMITS.TITLE_MAX, HTTP.CREATED],
    [TASK_LIMITS.TITLE_MAX + 1, HTTP.BAD_REQUEST],
  ])('title length %i → %i', async (length, status) => {
    expect((await postTask({ title: stringOfLength(length) })).status).toBe(status);
  });

  it.each([['   '], ['  ab  ']])('title %p → 400 after trimming', async (title) => {
    expect((await postTask({ title })).status).toBe(HTTP.BAD_REQUEST);
  });

  it('stores a padded title trimmed', async () => {
    const res = await postTask({ title: '  abc  ' });
    expect(res.status).toBe(HTTP.CREATED);
    expect(res.body.data.title).toBe('abc');
  });

  it.each([[123], [null], [['abc']], [{ text: 'abc' }]])('title of wrong type %p → 400', async (title) => {
    const res = await postTask({ title });
    expect(res.status).toBe(HTTP.BAD_REQUEST);
    expect(errorFieldsOf(res)).toEqual(['title']);
  });

  it.each([
    [stringOfLength(TASK_LIMITS.DESCRIPTION_MAX), HTTP.CREATED],
    [stringOfLength(TASK_LIMITS.DESCRIPTION_MAX + 1), HTTP.BAD_REQUEST],
    [42, HTTP.BAD_REQUEST],
  ])('description %#', async (description, status) => {
    expect((await postTask({ description })).status).toBe(status);
  });

  it.each([
    ['priority', 'high'],
    ['priority', ''],
    ['priority', null],
    ['priority', 3],
    ['status', 'completed'],
    ['status', ''],
    ['status', null],
    ['status', 3],
  ])('%s=%p → 400', async (field, value) => {
    const res = await postTask({ [field]: value });
    expect(res.status).toBe(HTTP.BAD_REQUEST);
    expect(errorFieldsOf(res)).toEqual([field]);
  });

  it.each([
    ['2026-11-15', '2026-11-15T00:00:00.000Z'],
    ['2026-11-15T10:30:00.000Z', '2026-11-15T10:30:00.000Z'],
    ['2020-01-01', '2020-01-01T00:00:00.000Z'],
    [null, null],
  ])('dueDate %p is accepted', async (dueDate, stored) => {
    const res = await postTask({ dueDate });
    expect(res.status).toBe(HTTP.CREATED);
    expect(res.body.data.dueDate).toBe(stored);
  });

  it.each([['2026-02-30'], ['tomorrow'], [123]])('dueDate %p → 400', async (dueDate) => {
    const res = await postTask({ dueDate });
    expect(res.status).toBe(HTTP.BAD_REQUEST);
    expect(errorFieldsOf(res)).toEqual(['dueDate']);
  });

  it('null dueDate clears an existing date', async () => {
    const { id } = (await postTask({ dueDate: '2026-11-15' })).body.data;
    const res = await request(app).put(taskUrl(id)).send(validTask({ dueDate: null }));
    expect(res.body.data.dueDate).toBeNull();
  });

  it.each(['foo', '_id', 'id', 'createdAt', 'updatedAt', '__v'])('unknown field %s → 400 naming it', async (field) => {
    const res = await postTask({ [field]: 1 });
    expect(res.status).toBe(HTTP.BAD_REQUEST);
    expect(res.body.message).toBe(MESSAGES.VALIDATION_FAILED);
    expect(errorFieldsOf(res)).toEqual([field]);
  });

  it('unknown fields are rejected on PUT too', async () => {
    const { id } = (await postTask()).body.data;
    const res = await request(app).put(taskUrl(id)).send(validTask({ createdAt: '2000-01-01' }));
    expect(res.status).toBe(HTTP.BAD_REQUEST);
    expect(errorFieldsOf(res)).toEqual(['createdAt']);
  });

  it('empty body {} → 400', async () => {
    expect((await request(app).post(TASKS_URL).send({})).status).toBe(HTTP.BAD_REQUEST);
  });

  it('array body → 400', async () => {
    const res = await request(app).post(TASKS_URL).send([validTask()]);
    expect(res.status).toBe(HTTP.BAD_REQUEST);
    expect(errorFieldsOf(res)).toEqual(['body']);
  });

  it('JSON string body → 400', async () => {
    const res = await request(app).post(TASKS_URL).set('Content-Type', 'application/json').send('"just a string"');
    expect(res.status).toBe(HTTP.BAD_REQUEST);
  });

  it('no body → 400', async () => {
    const res = await request(app).post(TASKS_URL);
    expect(res.status).toBe(HTTP.BAD_REQUEST);
    expect(errorFieldsOf(res)).toEqual(['body']);
  });

  describe('PATCH /:id/status', () => {
    it('missing status → 400', async () => {
      const { id } = (await postTask()).body.data;
      const res = await request(app).patch(statusUrl(id)).send({});
      expect(res.status).toBe(HTTP.BAD_REQUEST);
      expect(errorFieldsOf(res)).toEqual(['status']);
    });

    it('extra field → 400', async () => {
      const { id } = (await postTask()).body.data;
      const res = await request(app).patch(statusUrl(id)).send({ status: COMPLETED, title: 'Sneaky rename' });
      expect(res.status).toBe(HTTP.BAD_REQUEST);
      expect(errorFieldsOf(res)).toEqual(['title']);
    });

    it('valid → 200, only status and updatedAt change', async () => {
      const { id, title } = (await postTask()).body.data;
      const past = new Date('2020-01-01T00:00:00.000Z');
      await Task.collection.updateOne({ _id: new mongoose.Types.ObjectId(id) }, { $set: { updatedAt: past } });

      const res = await request(app).patch(statusUrl(id)).send({ status: COMPLETED });
      expect(res.status).toBe(HTTP.OK);
      expect(res.body.message).toBe(MESSAGES.TASK_STATUS_UPDATED);
      expect(res.body.data).toMatchObject({ id, title, status: COMPLETED });
      expect(new Date(res.body.data.updatedAt).getTime()).toBeGreaterThan(past.getTime());
    });
  });

  it('PUT replaces the whole task: omitted optional fields reset to defaults', async () => {
    const { id } = (
      await postTask({ description: 'details', dueDate: '2026-11-15', priority: HIGH, status: COMPLETED })
    ).body.data;
    const res = await request(app).put(taskUrl(id)).send({ title: 'Only a title' });
    expect(res.status).toBe(HTTP.OK);
    expect(res.body.data).toMatchObject({
      title: 'Only a title',
      description: TASK_DEFAULTS.DESCRIPTION,
      dueDate: TASK_DEFAULTS.DUE_DATE,
      priority: TASK_DEFAULTS.PRIORITY,
      status: TASK_DEFAULTS.STATUS,
    });
  });

  it('PUT without title → 400', async () => {
    const { id } = (await postTask()).body.data;
    const res = await request(app).put(taskUrl(id)).send({ description: 'no title' });
    expect(res.status).toBe(HTTP.BAD_REQUEST);
    expect(errorFieldsOf(res)).toEqual(['title']);
  });

  // [method, url builder, body]
  const idRoutes = [
    ['GET', taskUrl, undefined],
    ['PUT', taskUrl, validTask()],
    ['PATCH', statusUrl, { status: COMPLETED }],
    ['DELETE', taskUrl, undefined],
  ];
  const send = (method, url, body) => {
    const req = request(app)[method.toLowerCase()](url);
    return body ? req.send(body) : req;
  };

  it.each(idRoutes)('%s with malformed id → 400', async (method, url, body) => {
    for (const badId of ['abc', '123', 'zzzzzzzzzzzzzzzzzzzzzzzz', 'aaaaaaaaaaaa']) {
      const res = await send(method, url(badId), body);
      expect(res.status).toBe(HTTP.BAD_REQUEST);
      expect(res.body.message).toBe(MESSAGES.INVALID_ID);
    }
  });

  it.each(idRoutes)('%s with valid but missing id → 404', async (method, url, body) => {
    const res = await send(method, url(missingId()), body);
    expect(res.status).toBe(HTTP.NOT_FOUND);
    expect(res.body.message).toBe(MESSAGES.TASK_NOT_FOUND);
  });
});

describe('C. query, search and pagination', () => {
  it('returns newest first', async () => {
    await createTasks([{ title: 'Task one' }, { title: 'Task two' }, { title: 'Task three' }]);
    expect(titlesOf(await listTasks())).toEqual(['Task three', 'Task two', 'Task one']);
  });

  describe('filters', () => {
    beforeEach(() =>
      createTasks([
        { title: 'MERN assignment', status: PENDING, priority: HIGH },
        { title: 'mern notes', status: COMPLETED, priority: HIGH },
        { title: 'Groceries', status: PENDING, priority: LOW },
        { title: 'Assignment review', status: IN_PROGRESS, priority: MEDIUM },
      ])
    );

    it('by status', async () => {
      expect(titlesOf(await listTasks({ status: PENDING }))).toEqual(['Groceries', 'MERN assignment']);
    });

    it('by priority', async () => {
      expect(titlesOf(await listTasks({ priority: HIGH }))).toEqual(['mern notes', 'MERN assignment']);
    });

    it('by status and priority together', async () => {
      expect(titlesOf(await listTasks({ status: PENDING, priority: HIGH }))).toEqual(['MERN assignment']);
    });

    it('search + status + priority combined (AND)', async () => {
      expect(titlesOf(await listTasks({ search: 'mern', status: COMPLETED, priority: HIGH }))).toEqual(['mern notes']);
      expect(titlesOf(await listTasks({ search: 'mern', status: IN_PROGRESS, priority: HIGH }))).toEqual([]);
    });

    it('search is case-insensitive', async () => {
      expect(titlesOf(await listTasks({ search: 'MERN' }))).toEqual(['mern notes', 'MERN assignment']);
    });

    it('search matches partially', async () => {
      expect(titlesOf(await listTasks({ search: 'assign' }))).toEqual(['Assignment review', 'MERN assignment']);
    });

    it('whitespace-only search and empty filters behave as no filter', async () => {
      const res = await listTasks({ search: '   ', status: '', priority: '' });
      expect(res.body.meta.total).toBe(4);
    });

    it('meta.total and totalPages reflect the filters', async () => {
      const res = await listTasks({ priority: HIGH, limit: 1 });
      expect(res.body.meta).toEqual({ page: 1, limit: 1, total: 2, totalPages: 2 });
    });
  });

  it.each([
    ['(', ['Use (parens)']],
    ['.*', []],
    ['[', []],
    ['\\', []],
    ['+', ['C++ notes']],
  ])('search %p is treated literally', async (search, expected) => {
    await createTasks([{ title: 'C++ notes' }, { title: 'Use (parens)' }, { title: 'Plain task' }]);
    const res = await listTasks({ search });
    expect(res.status).toBe(HTTP.OK);
    expect(titlesOf(res)).toEqual(expected);
  });

  it('search longer than the max → 400', async () => {
    const res = await listTasks({ search: stringOfLength(SEARCH_MAX_LENGTH + 1) });
    expect(res.status).toBe(HTTP.BAD_REQUEST);
    expect(errorFieldsOf(res)).toEqual(['search']);
  });

  it('no matches → 200 with empty items and total 0', async () => {
    await createTasks([{ title: 'Something' }]);
    const res = await listTasks({ search: 'nothing-matches' });
    expect(res.status).toBe(HTTP.OK);
    expect(res.body.data).toEqual([]);
    expect(res.body.meta).toMatchObject({ total: 0, totalPages: 0 });
  });

  it.each([
    ['?status=foo', 'status'],
    ['?status=Pending&status=Completed', 'status'],
    ['?status[$ne]=x', 'status[$ne]'],
    ['?priority=high', 'priority'],
    ['?foo=bar', 'foo'],
  ])('invalid query %s → 400', async (query, field) => {
    const res = await request(app).get(`${TASKS_URL}${query}`);
    expect(res.status).toBe(HTTP.BAD_REQUEST);
    expect(errorFieldsOf(res)).toEqual([field]);
  });

  describe('pagination', () => {
    beforeEach(() => createTasks([1, 2, 3, 4, 5].map((n) => ({ title: `Task ${n}` }))));

    it('page 2 with limit 2 over 5 tasks', async () => {
      const res = await listTasks({ page: 2, limit: 2 });
      expect(titlesOf(res)).toEqual(['Task 3', 'Task 2']);
      expect(res.body.meta).toEqual({ page: 2, limit: 2, total: 5, totalPages: 3 });
    });

    it('page beyond the last → empty items', async () => {
      const res = await listTasks({ page: 4, limit: 2 });
      expect(res.status).toBe(HTTP.OK);
      expect(res.body.data).toEqual([]);
      expect(res.body.meta.total).toBe(5);
    });

    it('defaults when omitted', async () => {
      const res = await listTasks();
      expect(res.body.meta).toEqual({ page: PAGINATION.DEFAULT_PAGE, limit: PAGINATION.DEFAULT_LIMIT, total: 5, totalPages: 1 });
    });

    it.each([
      [{ page: 0 }, 'page'],
      [{ limit: 0 }, 'limit'],
      [{ limit: PAGINATION.MAX_LIMIT + 1 }, 'limit'],
      [{ limit: 'abc' }, 'limit'],
      [{ page: 1.5 }, 'page'],
    ])('invalid %p → 400', async (query, field) => {
      const res = await listTasks(query);
      expect(res.status).toBe(HTTP.BAD_REQUEST);
      expect(errorFieldsOf(res)).toEqual([field]);
    });
  });
});

describe('E. concurrency and duplicates', () => {
  it('two identical POSTs in parallel → both 201 with distinct ids (duplicates allowed)', async () => {
    const [a, b] = await Promise.all([postTask(), postTask()]);
    expect([a.status, b.status]).toEqual([HTTP.CREATED, HTTP.CREATED]);
    expect(a.body.data.id).not.toBe(b.body.data.id);
    expect(await Task.countDocuments({ title: validTask().title })).toBe(2);
  });

  it('two parallel status PATCHes → both 200 and the final state is one of them', async () => {
    const { id } = (await postTask()).body.data;
    const results = await Promise.all([
      request(app).patch(statusUrl(id)).send({ status: IN_PROGRESS }),
      request(app).patch(statusUrl(id)).send({ status: COMPLETED }),
    ]);
    expect(results.map((r) => r.status)).toEqual([HTTP.OK, HTTP.OK]);
    const final = await request(app).get(taskUrl(id));
    expect([IN_PROGRESS, COMPLETED]).toContain(final.body.data.status);
  });
});
