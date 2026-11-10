// HTTP in/out only: read req.validated, call the service, send the envelope.
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { sendSuccess } = require('../utils/response');
const taskService = require('../services/taskService');
const HTTP = require('../constants/http');
const { MESSAGES } = require('../constants/messages');

const found = (task) => {
  if (!task) throw new AppError(MESSAGES.TASK_NOT_FOUND, HTTP.NOT_FOUND);
  return task;
};

exports.createTask = asyncHandler(async (req, res) => {
  sendSuccess(res, HTTP.CREATED, MESSAGES.TASK_CREATED, await taskService.createTask(req.validated.body));
});

exports.getTasks = asyncHandler(async (req, res) => {
  const { items, meta } = await taskService.listTasks(req.validated.query);
  sendSuccess(res, HTTP.OK, MESSAGES.TASKS_FETCHED, items, meta);
});

exports.getTask = asyncHandler(async (req, res) => {
  sendSuccess(res, HTTP.OK, MESSAGES.TASK_FETCHED, found(await taskService.getTaskById(req.validated.params.id)));
});

exports.updateTask = asyncHandler(async (req, res) => {
  const task = found(await taskService.updateTask(req.validated.params.id, req.validated.body));
  sendSuccess(res, HTTP.OK, MESSAGES.TASK_UPDATED, task);
});

exports.updateTaskStatus = asyncHandler(async (req, res) => {
  const task = found(await taskService.updateTask(req.validated.params.id, req.validated.body));
  sendSuccess(res, HTTP.OK, MESSAGES.TASK_STATUS_UPDATED, task);
});

exports.deleteTask = asyncHandler(async (req, res) => {
  const { id } = found(await taskService.deleteTask(req.validated.params.id));
  sendSuccess(res, HTTP.OK, MESSAGES.TASK_DELETED, { id });
});
