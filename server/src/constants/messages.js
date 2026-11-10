// Every user-facing message. Templates are built from the same constants the validators use.
const { PRIORITIES, STATUSES, TASK_LIMITS, PAGINATION, SEARCH_MAX_LENGTH } = require('./task');

const MESSAGES = {
  HEALTH_OK: 'TaskFlow API is running',
  TASK_CREATED: 'Task created successfully',
  TASKS_FETCHED: 'Tasks fetched successfully',
  TASK_FETCHED: 'Task fetched successfully',
  TASK_UPDATED: 'Task updated successfully',
  TASK_STATUS_UPDATED: 'Task status updated successfully',
  TASK_DELETED: 'Task deleted successfully',
  TASK_NOT_FOUND: 'Task not found',
  INVALID_ID: 'Invalid task id',
  VALIDATION_FAILED: 'Validation failed',
  DB_UNAVAILABLE: 'Database unavailable, please try again later',
  MALFORMED_JSON: 'Malformed JSON body',
  PAYLOAD_TOO_LARGE: 'Request body is too large',
  INTERNAL_ERROR: 'Internal server error',
  ROUTE_NOT_FOUND: (method, url) => `Route not found: ${method} ${url}`,
  INVALID_VALUE: (path) => `Invalid ${path}`,
};

const VALIDATION_MESSAGES = {
  OBJECT_EXPECTED: 'Must be a JSON object',
  UNKNOWN_FIELD: 'Unknown field',
  FIELD_INVALID: 'Invalid value',
  TITLE_REQUIRED: 'Title is required',
  TITLE_TYPE: 'Title must be a string',
  TITLE_LENGTH: `Title must be ${TASK_LIMITS.TITLE_MIN}-${TASK_LIMITS.TITLE_MAX} characters after trimming`,
  DESCRIPTION_TYPE: 'Description must be a string',
  DESCRIPTION_LENGTH: `Description must be at most ${TASK_LIMITS.DESCRIPTION_MAX} characters`,
  PRIORITY_INVALID: `Priority must be one of: ${PRIORITIES.join(', ')}`,
  STATUS_INVALID: `Status must be one of: ${STATUSES.join(', ')}`,
  STATUS_REQUIRED: 'Status is required',
  DUE_DATE_INVALID: 'Due date must be a valid YYYY-MM-DD date, an ISO datetime, or null',
  SEARCH_INVALID: `Search must be a string of at most ${SEARCH_MAX_LENGTH} characters`,
  PAGE_INVALID: 'page must be a positive integer',
  LIMIT_INVALID: `limit must be an integer between 1 and ${PAGINATION.MAX_LIMIT}`,
};

module.exports = { MESSAGES, VALIDATION_MESSAGES };
