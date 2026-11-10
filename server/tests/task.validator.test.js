// Zod schemas tested directly (no HTTP, no DB).
const {
  createTaskSchema,
  updateTaskSchema,
  updateStatusSchema,
  listQuerySchema,
} = require('../src/validators/taskValidator');
const { formatZodError } = require('../src/middleware/validate');
const { TASK_LIMITS, TASK_DEFAULTS, PAGINATION, SEARCH_MAX_LENGTH, STATUSES, PRIORITIES } = require('../src/constants/task');
const { VALIDATION_MESSAGES } = require('../src/constants/messages');
const { validTask, stringOfLength } = require('./factories');

const SOURCE = 'body';
// Field names of every error the schema reports for `input` ([] when valid).
const errorFields = (schema, input) => {
  const result = schema.safeParse(input);
  return result.success ? [] : formatZodError(result.error, SOURCE).map((e) => e.field);
};
const parsed = (schema, input) => schema.parse(input);

describe.each([
  ['createTaskSchema', createTaskSchema],
  ['updateTaskSchema (PUT = full replace)', updateTaskSchema],
])('%s', (_name, schema) => {
  describe('title', () => {
    it.each([
      [TASK_LIMITS.TITLE_MIN - 1, false],
      [TASK_LIMITS.TITLE_MIN, true],
      [TASK_LIMITS.TITLE_MAX, true],
      [TASK_LIMITS.TITLE_MAX + 1, false],
    ])('length %i valid=%s', (length, valid) => {
      expect(schema.safeParse(validTask({ title: stringOfLength(length) })).success).toBe(valid);
    });

    it('rejects whitespace-only title', () => {
      expect(errorFields(schema, { title: '   ' })).toEqual(['title']);
    });

    it('rejects a title that trims below the minimum', () => {
      expect(errorFields(schema, { title: '  ab  ' })).toEqual(['title']);
    });

    it('trims the stored title', () => {
      expect(parsed(schema, { title: '  abc  ' }).title).toBe('abc');
    });

    it('is required', () => {
      const result = schema.safeParse({});
      expect(formatZodError(result.error, SOURCE)).toEqual([
        { field: 'title', message: VALIDATION_MESSAGES.TITLE_REQUIRED },
      ]);
    });

    it.each([[123], [null], [['abc']], [{ text: 'abc' }]])('rejects wrong type %p', (title) => {
      expect(errorFields(schema, { title })).toEqual(['title']);
    });
  });

  describe('description', () => {
    it('accepts max length and rejects one more', () => {
      expect(errorFields(schema, validTask({ description: stringOfLength(TASK_LIMITS.DESCRIPTION_MAX) }))).toEqual([]);
      expect(errorFields(schema, validTask({ description: stringOfLength(TASK_LIMITS.DESCRIPTION_MAX + 1) }))).toEqual([
        'description',
      ]);
    });

    it('rejects wrong type', () => {
      expect(errorFields(schema, validTask({ description: 42 }))).toEqual(['description']);
    });

    // Regression: Zod 4 ran length checks on arrays after the type error, reporting the field twice.
    it('reports a single error for an over-long array', () => {
      const tooMany = Array.from({ length: TASK_LIMITS.DESCRIPTION_MAX + 1 }, () => 'x');
      expect(errorFields(schema, validTask({ description: tooMany }))).toEqual(['description']);
    });
  });

  it('applies defaults for every omitted optional field', () => {
    expect(parsed(schema, validTask())).toEqual({
      title: validTask().title,
      description: TASK_DEFAULTS.DESCRIPTION,
      priority: TASK_DEFAULTS.PRIORITY,
      status: TASK_DEFAULTS.STATUS,
      dueDate: TASK_DEFAULTS.DUE_DATE,
    });
  });

  it.each(['priority', 'status'])('accepts every allowed %s value', (field) => {
    const allowed = field === 'priority' ? PRIORITIES : STATUSES;
    allowed.forEach((value) => expect(errorFields(schema, validTask({ [field]: value }))).toEqual([]));
  });

  it.each([
    ['priority', 'high'],
    ['priority', ''],
    ['priority', null],
    ['priority', 1],
    ['status', 'pending'],
    ['status', ''],
    ['status', null],
    ['status', 1],
  ])('rejects %s=%p', (field, value) => {
    expect(errorFields(schema, validTask({ [field]: value }))).toEqual([field]);
  });

  describe('dueDate', () => {
    it('accepts YYYY-MM-DD and stores it as UTC midnight', () => {
      expect(parsed(schema, validTask({ dueDate: '2026-11-15' })).dueDate.toISOString()).toBe('2026-11-15T00:00:00.000Z');
    });

    it('accepts ISO datetimes, converting offsets to UTC', () => {
      expect(parsed(schema, validTask({ dueDate: '2026-11-15T10:30:00Z' })).dueDate.toISOString()).toBe(
        '2026-11-15T10:30:00.000Z'
      );
      expect(parsed(schema, validTask({ dueDate: '2026-11-15T10:30:00+05:30' })).dueDate.toISOString()).toBe(
        '2026-11-15T05:00:00.000Z'
      );
    });

    it('accepts past dates', () => {
      expect(errorFields(schema, validTask({ dueDate: '2001-01-01' }))).toEqual([]);
    });

    it('accepts null (clears the date)', () => {
      expect(parsed(schema, validTask({ dueDate: null })).dueDate).toBeNull();
    });

    it.each([['2026-02-30'], ['2026-13-01'], ['tomorrow'], [''], [123], [true], ['2026-02-30T10:00:00Z']])(
      'rejects %p',
      (dueDate) => {
        const result = schema.safeParse(validTask({ dueDate }));
        expect(formatZodError(result.error, SOURCE)).toEqual([
          { field: 'dueDate', message: VALIDATION_MESSAGES.DUE_DATE_INVALID },
        ]);
      }
    );
  });

  describe('unknown fields', () => {
    it.each(['foo', 'id', '_id', 'createdAt', 'updatedAt', '__v'])('rejects %s and names it', (field) => {
      const result = schema.safeParse(validTask({ [field]: 1 }));
      expect(formatZodError(result.error, SOURCE)).toEqual([{ field, message: VALIDATION_MESSAGES.UNKNOWN_FIELD }]);
    });
  });

  it.each([[[]], ['a string'], [undefined], [null]])('rejects a non-object body %p', (input) => {
    expect(errorFields(schema, input)).toEqual([SOURCE]);
  });
});

describe('updateStatusSchema', () => {
  it('accepts a valid status', () => {
    expect(parsed(updateStatusSchema, { status: STATUSES[2] })).toEqual({ status: STATUSES[2] });
  });

  it('requires status', () => {
    expect(formatZodError(updateStatusSchema.safeParse({}).error, SOURCE)).toEqual([
      { field: 'status', message: VALIDATION_MESSAGES.STATUS_REQUIRED },
    ]);
  });

  it('rejects any other field', () => {
    expect(errorFields(updateStatusSchema, { status: STATUSES[0], title: 'nope' })).toEqual(['title']);
  });

  it('rejects an invalid status', () => {
    expect(errorFields(updateStatusSchema, { status: 'Done' })).toEqual(['status']);
  });
});

describe('listQuerySchema', () => {
  const defaults = { page: PAGINATION.DEFAULT_PAGE, limit: PAGINATION.DEFAULT_LIMIT };

  it('applies pagination defaults when omitted', () => {
    expect(parsed(listQuerySchema, {})).toEqual(defaults);
  });

  it('treats empty strings as no filter', () => {
    expect(parsed(listQuerySchema, { status: '', priority: '', search: '', page: '', limit: '' })).toEqual(defaults);
  });

  it('trims search and treats whitespace-only as no filter', () => {
    expect(parsed(listQuerySchema, { search: '  mern  ' }).search).toBe('mern');
    expect(parsed(listQuerySchema, { search: '   ' })).toEqual(defaults);
  });

  it('accepts search at max length and rejects one more', () => {
    expect(errorFields(listQuerySchema, { search: stringOfLength(SEARCH_MAX_LENGTH) })).toEqual([]);
    expect(errorFields(listQuerySchema, { search: stringOfLength(SEARCH_MAX_LENGTH + 1) })).toEqual(['search']);
  });

  it('parses valid filters and pagination', () => {
    expect(
      parsed(listQuerySchema, { status: STATUSES[1], priority: PRIORITIES[2], page: '2', limit: String(PAGINATION.MAX_LIMIT) })
    ).toEqual({ status: STATUSES[1], priority: PRIORITIES[2], page: 2, limit: PAGINATION.MAX_LIMIT });
  });

  it.each([
    ['status', 'foo'],
    ['status', 'pending'],
    ['status', [STATUSES[0], STATUSES[2]]],
    ['status', { $ne: 'x' }],
    ['priority', 'urgent'],
    ['search', ['a', 'b']],
    ['page', '0'],
    ['page', '-1'],
    ['page', '1.5'],
    ['page', 'abc'],
    ['limit', '0'],
    ['limit', String(PAGINATION.MAX_LIMIT + 1)],
    ['limit', 'abc'],
  ])('rejects %s=%p', (field, value) => {
    expect(errorFields(listQuerySchema, { [field]: value })).toEqual([field]);
  });

  // Regression: arrays used to trigger length/regex checks after the type error (duplicate errors).
  it.each([
    ['search', Array.from({ length: SEARCH_MAX_LENGTH + 1 }, () => 'x')],
    ['page', ['1', '2']],
    ['limit', ['1', '2']],
  ])('reports a single error for array %s', (field, value) => {
    expect(errorFields(listQuerySchema, { [field]: value })).toEqual([field]);
  });

  it('rejects unknown query keys such as the bracket form status[$ne]', () => {
    expect(errorFields(listQuerySchema, { 'status[$ne]': 'x' })).toEqual(['status[$ne]']);
  });
});
