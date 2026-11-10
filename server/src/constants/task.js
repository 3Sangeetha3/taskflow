// Single source of truth for task rules. Models, validators, services and tests import from here.
const PRIORITIES = ['Low', 'Medium', 'High'];
const STATUSES = ['Pending', 'In Progress', 'Completed'];

const TASK_LIMITS = {
  TITLE_MIN: 3,
  TITLE_MAX: 80,
  DESCRIPTION_MAX: 500,
};

const TASK_DEFAULTS = {
  DESCRIPTION: '',
  PRIORITY: 'Medium',
  STATUS: 'Pending',
  DUE_DATE: null,
};

const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
};

const SEARCH_MAX_LENGTH = TASK_LIMITS.TITLE_MAX;

// Only these fields may ever be written by a client ($set whitelist).
const TASK_WRITABLE_FIELDS = ['title', 'description', 'priority', 'status', 'dueDate'];
// Fields returned to clients (plus `id`, mapped from `_id`).
const TASK_PUBLIC_FIELDS = [...TASK_WRITABLE_FIELDS, 'createdAt', 'updatedAt'];

// Newest first; `_id` breaks createdAt ties so pagination order is stable.
const TASK_SORT = { createdAt: -1, _id: -1 };

module.exports = {
  PRIORITIES,
  STATUSES,
  TASK_LIMITS,
  TASK_DEFAULTS,
  PAGINATION,
  SEARCH_MAX_LENGTH,
  TASK_WRITABLE_FIELDS,
  TASK_PUBLIC_FIELDS,
  TASK_SORT,
};
