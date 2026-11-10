const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');

const TASKS_URL = '/api/tasks';

const validTask = (overrides = {}) => ({ title: 'Write the report', ...overrides });
const stringOfLength = (length) => 'a'.repeat(length);
const missingId = () => new mongoose.Types.ObjectId().toString();

const postTask = (overrides) => request(app).post(TASKS_URL).send(validTask(overrides));

// Creates tasks one after another (so createdAt order is deterministic) and returns their bodies' data.
const createTasks = async (overridesList) => {
  const created = [];
  for (const overrides of overridesList) created.push((await postTask(overrides)).body.data);
  return created;
};

const listTasks = (query = {}) => request(app).get(TASKS_URL).query(query);

module.exports = { TASKS_URL, validTask, stringOfLength, missingId, postTask, createTasks, listTasks };
