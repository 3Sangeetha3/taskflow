import { TASK_LIMITS, SEARCH_MAX_LENGTH } from './task'

// Every user-facing string in the UI.
export const LABELS = {
  NEW_TASK: 'New task',
  CREATE_FIRST: 'Create your first task',
  SEARCH: 'Search tasks',
  SEARCH_PLACEHOLDER: 'Search by title',
  CLEAR_SEARCH: 'Clear search',
  STATUS: 'Status',
  PRIORITY: 'Priority',
  ALL_STATUSES: 'All statuses',
  ALL_PRIORITIES: 'All priorities',
  CLEAR_FILTERS: 'Clear filters',
  TITLE: 'Title',
  DESCRIPTION: 'Description',
  DUE_DATE: 'Due date',
  ACTIONS: 'Actions',
  OPTIONAL: 'optional',
  EDIT: 'Edit',
  DELETE: 'Delete',
  CANCEL: 'Cancel',
  CLOSE: 'Close',
  DISMISS: 'Dismiss',
  RETRY: 'Retry',
  PREVIOUS: 'Previous',
  NEXT: 'Next',
  CREATE: 'Create task',
  SAVE: 'Save changes',
  NO_DUE_DATE: 'No due date',
  OVERDUE: 'Overdue',
  UPDATING: 'Updating…',
  LOADING_TASKS: 'Loading tasks',
  PAGINATION: 'Pagination',
  NOTIFICATIONS: 'Notifications',
}

export const TITLES = {
  CREATE_TASK: 'New task',
  EDIT_TASK: 'Edit task',
  DELETE_TASK: 'Delete task?',
}

export const TEXT = {
  taskCount: (n) => `${n} ${n === 1 ? 'task' : 'tasks'}`,
  pageOf: (page, total) => `Page ${page} of ${total}`,
  editTask: (title) => `Edit “${title}”`,
  deleteTask: (title) => `Delete “${title}”`,
  statusFor: (title) => `Status for “${title}”`,
  confirmDelete: (title) => `“${title}” will be permanently deleted. This can’t be undone.`,
  counter: (length, max) => `${length}/${max}`,
}

export const EMPTY_STATES = {
  NO_TASKS_TITLE: 'No tasks yet',
  NO_TASKS_BODY: 'Tasks you create will show up here, newest first.',
  NO_MATCHES_TITLE: 'No tasks match these filters',
  NO_MATCHES_BODY: 'Try a different search term or clear the filters.',
}

export const TOASTS = {
  CREATED: 'Task created',
  UPDATED: 'Task updated',
  STATUS_UPDATED: 'Status updated',
  DELETED: 'Task deleted',
  TASK_GONE: 'This task no longer exists',
}

export const ERRORS = {
  NETWORK: 'Can’t reach the server. Check your connection and try again',
  GENERIC: 'Something went wrong. Please try again',
  TOO_LARGE: 'This task is too large to save. Shorten the description and try again',
  UNEXPECTED_RESPONSE: 'Unexpected response from the server',
  LOAD_TASKS: 'Couldn’t load tasks',
  CRASH_TITLE: 'Something went wrong',
  CRASH_BODY: 'Reload the page to continue.',
  RELOAD: 'Reload page',
}

export const VALIDATION = {
  TITLE_REQUIRED: 'Enter a title',
  TITLE_LENGTH: `Title must be ${TASK_LIMITS.TITLE_MIN}–${TASK_LIMITS.TITLE_MAX} characters`,
  DESCRIPTION_LENGTH: `Description must be ${TASK_LIMITS.DESCRIPTION_MAX} characters or fewer`,
  PRIORITY_INVALID: 'Choose a priority',
  STATUS_INVALID: 'Choose a status',
  DUE_DATE_INVALID: 'Enter a valid date',
  SEARCH_LENGTH: `Search must be ${SEARCH_MAX_LENGTH} characters or fewer`,
}
