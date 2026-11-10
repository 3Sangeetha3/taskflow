const { z } = require('zod');
const {
  PRIORITIES,
  STATUSES,
  TASK_LIMITS,
  TASK_DEFAULTS,
  PAGINATION,
  SEARCH_MAX_LENGTH,
} = require('../constants/task');
const { VALIDATION_MESSAGES: MSG } = require('../constants/messages');

const DIGITS_ONLY = /^\d+$/;

// Picks the "required" message when the field is absent, otherwise the "invalid" one.
const requiredOr = (required, invalid) => (issue) => (issue.input === undefined ? required : invalid);
const strictObject = (shape) => z.strictObject(shape, { error: MSG.OBJECT_EXPECTED });

// Zod 4 still runs refinements after a type failure (an array has .length, so min/max fire),
// adding a second, misleading error. Check the type first, then refine inside the pipe.
const stringThen = (typeError, refine) => z.string({ error: typeError }).pipe(refine(z.string()));

const title = stringThen(requiredOr(MSG.TITLE_REQUIRED, MSG.TITLE_TYPE), (s) =>
  s
    .trim()
    .min(TASK_LIMITS.TITLE_MIN, { error: MSG.TITLE_LENGTH })
    .max(TASK_LIMITS.TITLE_MAX, { error: MSG.TITLE_LENGTH })
);

const description = stringThen(MSG.DESCRIPTION_TYPE, (s) =>
  s.trim().max(TASK_LIMITS.DESCRIPTION_MAX, { error: MSG.DESCRIPTION_LENGTH })
);

const priority = z.enum(PRIORITIES, { error: MSG.PRIORITY_INVALID });
const status = z.enum(STATUSES, { error: requiredOr(MSG.STATUS_REQUIRED, MSG.STATUS_INVALID) });

// "YYYY-MM-DD" (UTC midnight) or ISO datetime with Z/offset; impossible dates fail. null clears.
const dueDate = z
  .union([z.iso.date(), z.iso.datetime({ offset: true })], { error: MSG.DUE_DATE_INVALID })
  .transform((value) => new Date(value))
  .nullable();

// POST and PUT share one schema: PUT is a full replace, so omitted fields reset to defaults.
const createTaskSchema = strictObject({
  title,
  description: description.default(TASK_DEFAULTS.DESCRIPTION),
  priority: priority.default(TASK_DEFAULTS.PRIORITY),
  status: status.default(TASK_DEFAULTS.STATUS),
  dueDate: dueDate.default(TASK_DEFAULTS.DUE_DATE),
});
const updateTaskSchema = createTaskSchema;

const updateStatusSchema = strictObject({ status });

// Query values arrive as strings (arrays/objects for repeated or bracketed keys, which fail z.string/z.enum).
// An empty string means "not provided".
const queryParam = (schema) => z.preprocess((value) => (value === '' ? undefined : value), schema);

const positiveInt = (message, max) =>
  stringThen(message, (s) => s.regex(DIGITS_ONLY, { error: message }))
    .transform(Number)
    .pipe(z.number().int({ error: message }).min(1, { error: message }).max(max ?? Number.MAX_SAFE_INTEGER, { error: message }));

const search = stringThen(MSG.SEARCH_INVALID, (s) => s.trim().max(SEARCH_MAX_LENGTH, { error: MSG.SEARCH_INVALID }))
  .transform((value) => value || undefined); // whitespace-only = no filter

const listQuerySchema = strictObject({
  status: queryParam(z.enum(STATUSES, { error: MSG.STATUS_INVALID }).optional()),
  priority: queryParam(priority.optional()),
  search: queryParam(search.optional()),
  page: queryParam(positiveInt(MSG.PAGE_INVALID).default(PAGINATION.DEFAULT_PAGE)),
  limit: queryParam(positiveInt(MSG.LIMIT_INVALID, PAGINATION.MAX_LIMIT).default(PAGINATION.DEFAULT_LIMIT)),
});

module.exports = { createTaskSchema, updateTaskSchema, updateStatusSchema, listQuerySchema };
