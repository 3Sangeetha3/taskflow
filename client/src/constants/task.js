// Keep in sync with server/src/constants/task.js
export const PRIORITIES = ['Low', 'Medium', 'High']
export const STATUSES = ['Pending', 'In Progress', 'Completed']
export const [STATUS_PENDING, STATUS_IN_PROGRESS, STATUS_COMPLETED] = STATUSES

export const TASK_LIMITS = { TITLE_MIN: 3, TITLE_MAX: 80, DESCRIPTION_MAX: 500 }
export const SEARCH_MAX_LENGTH = TASK_LIMITS.TITLE_MAX

export const TASK_DEFAULTS = { PRIORITY: 'Medium', STATUS: 'Pending', DESCRIPTION: '', DUE_DATE: null }

// Form state uses '' for "no date"; the API uses null.
export const EMPTY_FORM = {
  title: '',
  description: TASK_DEFAULTS.DESCRIPTION,
  priority: TASK_DEFAULTS.PRIORITY,
  status: TASK_DEFAULTS.STATUS,
  dueDate: '',
}
export const FORM_FIELDS = Object.keys(EMPTY_FORM)

export const PAGINATION = { FIRST_PAGE: 1, PAGE_SIZE: 10 }
