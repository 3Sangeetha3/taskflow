import { FORM_FIELDS } from '../constants/task'
import { toInputDate } from './date'

// Task from the API → form values (dueDate as YYYY-MM-DD, '' when unset).
export const toFormValues = (task) => ({
  ...Object.fromEntries(FORM_FIELDS.map((field) => [field, task[field]])),
  dueDate: toInputDate(task.dueDate),
})

export const omit = (object, key) => Object.fromEntries(Object.entries(object).filter(([k]) => k !== key))
