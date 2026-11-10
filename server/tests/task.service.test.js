process.env.NODE_ENV = 'test';
const mongoose = require('mongoose');
const db = require('./setup');
const Task = require('../src/models/Task');
const escapeRegex = require('../src/utils/escapeRegex');
const { buildTaskFilter, listTasks } = require('../src/services/taskService');
const { STATUSES, PRIORITIES, PAGINATION } = require('../src/constants/task');

const [PENDING, IN_PROGRESS, COMPLETED] = STATUSES;
const [LOW, , HIGH] = PRIORITIES;
const firstPage = (limit = PAGINATION.DEFAULT_LIMIT) => ({ page: PAGINATION.DEFAULT_PAGE, limit });

describe('escapeRegex', () => {
  it('escapes every regex metacharacter', () => {
    const special = '.*+?^${}()|[]\\';
    expect(new RegExp(`^${escapeRegex(special)}$`).test(special)).toBe(true);
  });
});

describe('buildTaskFilter', () => {
  it('returns {} for empty input', () => {
    expect(buildTaskFilter({})).toEqual({});
  });

  it('ignores empty and whitespace-only strings', () => {
    expect(buildTaskFilter({ status: '', priority: '', search: '   ' })).toEqual({});
  });

  it('filters by status alone', () => {
    expect(buildTaskFilter({ status: PENDING })).toEqual({ status: PENDING });
  });

  it('filters by priority alone', () => {
    expect(buildTaskFilter({ priority: HIGH })).toEqual({ priority: HIGH });
  });

  it('builds a case-insensitive, regex-escaped title search', () => {
    expect(buildTaskFilter({ search: ' a.*(b ' })).toEqual({ title: { $regex: 'a\\.\\*\\(b', $options: 'i' } });
  });

  it('combines all filters (AND)', () => {
    expect(buildTaskFilter({ status: COMPLETED, priority: LOW, search: 'mern' })).toEqual({
      status: COMPLETED,
      priority: LOW,
      title: { $regex: 'mern', $options: 'i' },
    });
  });
});

describe('listTasks', () => {
  beforeAll(db.connect, db.DB_HOOK_TIMEOUT_MS);
  afterEach(db.clear);
  afterAll(db.disconnect, db.DB_HOOK_TIMEOUT_MS);

  it('returns items with id (no _id/__v) and meta', async () => {
    await Task.create({ title: 'Only task' });
    const { items, meta } = await listTasks(firstPage());
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveProperty('id');
    expect(items[0]).not.toHaveProperty('_id');
    expect(items[0]).not.toHaveProperty('__v');
    expect(meta).toEqual({ ...firstPage(), total: 1, totalPages: 1 });
  });

  it('orders same-millisecond tasks stably (newest _id first)', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const ids = [1, 2, 3].map(() => new mongoose.Types.ObjectId());
    await Task.collection.insertMany(
      ids.map((_id, i) => ({ _id, title: `Task ${i}`, status: PENDING, priority: LOW, createdAt, updatedAt: createdAt }))
    );
    const expected = ids.map(String).reverse();
    for (let run = 0; run < 3; run += 1) {
      const { items } = await listTasks(firstPage());
      expect(items.map((t) => t.id)).toEqual(expected);
    }
  });

  it('computes total and totalPages from the filtered set', async () => {
    await Task.create([
      { title: 'Done 1', status: COMPLETED },
      { title: 'Done 2', status: COMPLETED },
      { title: 'Done 3', status: COMPLETED },
      { title: 'Open 1', status: IN_PROGRESS },
    ]);
    const { items, meta } = await listTasks({ status: COMPLETED, ...firstPage(2) });
    expect(items).toHaveLength(2);
    expect(meta).toEqual({ ...firstPage(2), total: 3, totalPages: 2 });
  });
});
