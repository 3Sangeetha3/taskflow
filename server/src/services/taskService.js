const Task = require('../models/Task');
const escapeRegex = require('../utils/escapeRegex');
const { TASK_PUBLIC_FIELDS, TASK_WRITABLE_FIELDS, TASK_SORT } = require('../constants/task');

const PROJECTION = TASK_PUBLIC_FIELDS.join(' ');
// Mongoose 9 deprecates `new: true`; `returnDocument: 'after'` is its documented equivalent.
const UPDATE_OPTIONS = { returnDocument: 'after', runValidators: true };

// Lean docs and toObject() keep `_id`; the API only ever exposes `id`.
const toTask = ({ _id, ...fields }) => ({ id: _id.toString(), ...fields });
const toTaskOrNull = (doc) => (doc ? toTask(doc) : null);

// $set whitelist: never write anything a client could smuggle past validation.
const pickWritable = (data) =>
  Object.fromEntries(TASK_WRITABLE_FIELDS.filter((field) => field in data).map((field) => [field, data[field]]));

const buildTaskFilter = ({ status, priority, search } = {}) => {
  const filter = {};
  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  const term = search?.trim();
  if (term) filter.title = { $regex: escapeRegex(term), $options: 'i' };
  return filter;
};

const listTasks = async ({ page, limit, ...filters }) => {
  const filter = buildTaskFilter(filters);
  const [docs, total] = await Promise.all([
    Task.find(filter)
      .select(PROJECTION)
      .sort(TASK_SORT)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Task.countDocuments(filter),
  ]);
  return { items: docs.map(toTask), meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
};

const createTask = async (data) => toTask((await Task.create(pickWritable(data))).toObject({ versionKey: false }));

const getTaskById = async (id) => toTaskOrNull(await Task.findById(id).select(PROJECTION).lean());

// Used by PUT (full validated object, defaults filled) and PATCH status ({ status }).
const updateTask = async (id, data) =>
  toTaskOrNull(await Task.findByIdAndUpdate(id, { $set: pickWritable(data) }, UPDATE_OPTIONS).select(PROJECTION).lean());

const deleteTask = async (id) => toTaskOrNull(await Task.findByIdAndDelete(id).select('_id').lean());

module.exports = { buildTaskFilter, listTasks, createTask, getTaskById, updateTask, deleteTask };
