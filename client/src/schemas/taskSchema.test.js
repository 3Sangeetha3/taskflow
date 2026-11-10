import { taskFormSchema, taskSchema } from './taskSchema'
import { EMPTY_FORM, TASK_LIMITS } from '../constants/task'
import { VALIDATION } from '../constants/messages'
import { zodFieldErrors } from '../utils/formErrors'
import { makeTask } from '../test/utils'

const form = (overrides) => ({ ...EMPTY_FORM, title: 'Valid', ...overrides })
const errorsOf = (values) => {
  const result = taskFormSchema.safeParse(values)
  return result.success ? {} : zodFieldErrors(result.error)
}

describe('taskFormSchema', () => {
  it.each([
    [TASK_LIMITS.TITLE_MIN - 1, false],
    [TASK_LIMITS.TITLE_MIN, true],
    [TASK_LIMITS.TITLE_MAX, true],
    [TASK_LIMITS.TITLE_MAX + 1, false],
  ])('title length %i valid=%s', (length, valid) => {
    expect(taskFormSchema.safeParse(form({ title: 'a'.repeat(length) })).success).toBe(valid)
  })

  it('whitespace-only title → required message (first issue only)', () => {
    expect(errorsOf(form({ title: '   ' }))).toEqual({ title: VALIDATION.TITLE_REQUIRED })
  })

  it('trims the title and description', () => {
    expect(taskFormSchema.parse(form({ title: '  abc  ', description: '  d  ' }))).toMatchObject({ title: 'abc', description: 'd' })
  })

  it('rejects a 501-char description', () => {
    expect(errorsOf(form({ description: 'd'.repeat(TASK_LIMITS.DESCRIPTION_MAX + 1) }))).toEqual({
      description: VALIDATION.DESCRIPTION_LENGTH,
    })
  })

  it('empty dueDate becomes null; a past date is allowed', () => {
    expect(taskFormSchema.parse(form()).dueDate).toBeNull()
    expect(taskFormSchema.parse(form({ dueDate: '2020-01-01' })).dueDate).toBe('2020-01-01')
  })

  it.each(['2026-02-30', 'tomorrow'])('rejects dueDate %p', (dueDate) => {
    expect(errorsOf(form({ dueDate }))).toEqual({ dueDate: VALIDATION.DUE_DATE_INVALID })
  })

  it('rejects unknown enum values', () => {
    expect(errorsOf(form({ priority: 'high', status: 'done' }))).toEqual({
      priority: VALIDATION.PRIORITY_INVALID,
      status: VALIDATION.STATUS_INVALID,
    })
  })
})

describe('taskSchema (API response guard)', () => {
  it('accepts a valid task', () => {
    expect(taskSchema.safeParse(makeTask()).success).toBe(true)
  })

  it.each([
    ['missing id', { id: undefined }],
    ['wrong type', { title: 42 }],
    ['unknown status', { status: 'Done' }],
    ['bad date', { createdAt: 'yesterday' }],
  ])('rejects %s', (_name, overrides) => {
    expect(taskSchema.safeParse(makeTask(overrides)).success).toBe(false)
  })
})
