import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { taskApi } from './services/api'
import { ApiError } from './services/apiError'
import { renderWithProviders, makeTask, listResult, deferred } from './test/utils'
import { APP_NAME, ERROR_KINDS, SEARCH_DEBOUNCE_MS } from './constants/app'
import { PAGINATION, TASK_LIMITS, STATUS_COMPLETED, STATUS_IN_PROGRESS, STATUS_PENDING } from './constants/task'
import { EMPTY_STATES, ERRORS, LABELS, TEXT, TITLES, TOASTS, VALIDATION } from './constants/messages'

vi.mock('./services/api', () => ({
  taskApi: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
    remove: vi.fn(),
  },
}))

const listParams = () => taskApi.list.mock.calls.map(([params]) => params)
const lastListParams = () => taskApi.list.mock.lastCall[0]
const networkError = () => new ApiError(ERRORS.NETWORK, { kind: ERROR_KINDS.NETWORK })
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// The fake server filters like the real one, so assertions on rendered rows are meaningful.
const serveTasks = (tasks) =>
  taskApi.list.mockImplementation(async ({ search, status, priority, page = 1, limit = PAGINATION.PAGE_SIZE }) => {
    const matches = tasks.filter(
      (t) =>
        (!search || t.title.toLowerCase().includes(search.trim().toLowerCase())) &&
        (!status || t.status === status) &&
        (!priority || t.priority === priority),
    )
    const items = matches.slice((page - 1) * limit, page * limit)
    return listResult(items, { page, limit, total: matches.length, totalPages: Math.ceil(matches.length / limit) })
  })

const renderApp = () => {
  const user = userEvent.setup()
  const utils = renderWithProviders(<App />)
  return { user, ...utils }
}

// The first [title] in a row header is the task title (the description, if any, comes second).
const rowTitles = () =>
  within(screen.getByRole('table'))
    .queryAllByRole('rowheader')
    .map((cell) => cell.querySelector('[title]').getAttribute('title'))
const titleInput = () => screen.getByRole('textbox', { name: LABELS.TITLE })
const dialog = (name) => screen.getByRole('dialog', { name })
const openCreate = async (user) => {
  await user.click(screen.getByRole('button', { name: LABELS.NEW_TASK }))
  return dialog(TITLES.CREATE_TASK)
}

beforeEach(() => {
  Object.values(taskApi).forEach((fn) => fn.mockReset())
  serveTasks([])
})

describe('required behaviour', () => {
  it('1. form does not submit an empty title', async () => {
    const { user } = renderApp()
    const form = await openCreate(user)
    await user.click(within(form).getByRole('button', { name: LABELS.CREATE }))
    expect(within(form).getByText(VALIDATION.TITLE_REQUIRED)).toBeInTheDocument()
    expect(titleInput()).toHaveAttribute('aria-invalid', 'true')
    expect(taskApi.create).not.toHaveBeenCalled()
  })

  it('2. successful creation updates the list', async () => {
    const created = makeTask({ title: 'Write report' })
    const tasks = []
    serveTasks(tasks)
    taskApi.create.mockImplementation(async () => {
      tasks.unshift(created)
      return created
    })
    const { user } = renderApp()
    await screen.findByText(EMPTY_STATES.NO_TASKS_TITLE)

    const form = await openCreate(user)
    await user.type(titleInput(), 'Write report')
    await user.click(within(form).getByRole('button', { name: LABELS.CREATE }))

    expect(await screen.findByText(TOASTS.CREATED)).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(await screen.findByRole('rowheader', { name: /Write report/ })).toBeInTheDocument()
    expect(taskApi.create).toHaveBeenCalledWith({
      title: 'Write report',
      description: '',
      priority: 'Medium',
      status: 'Pending',
      dueDate: null,
    })
  })

  it('3. search returns matching tasks (debounced, raw text sent)', async () => {
    serveTasks([makeTask({ title: 'MERN report' }), makeTask({ title: 'Groceries' }), makeTask({ title: 'Weekly report' })])
    const { user } = renderApp()
    await screen.findByRole('table')

    await user.type(screen.getByRole('searchbox', { name: LABELS.SEARCH }), 'Report')
    await waitFor(() => expect(lastListParams()).toMatchObject({ search: 'Report', page: 1 }))
    await waitFor(() => expect(rowTitles()).toEqual(['MERN report', 'Weekly report']))
    // Debounced: no request for the partial words typed along the way.
    expect(listParams().map((p) => p.search).filter(Boolean)).toEqual(['Report'])
  })

  it('4. status filter works', async () => {
    serveTasks([makeTask({ title: 'Open one' }), makeTask({ title: 'Done one', status: STATUS_COMPLETED })])
    const { user } = renderApp()
    await screen.findByRole('table')
    await user.selectOptions(screen.getByRole('combobox', { name: LABELS.STATUS }), STATUS_COMPLETED)
    await waitFor(() => expect(lastListParams()).toMatchObject({ status: STATUS_COMPLETED }))
    await waitFor(() => expect(rowTitles()).toEqual(['Done one']))
  })

  it('5. priority filter works', async () => {
    serveTasks([makeTask({ title: 'Urgent', priority: 'High' }), makeTask({ title: 'Someday', priority: 'Low' })])
    const { user } = renderApp()
    await screen.findByRole('table')
    await user.selectOptions(screen.getByRole('combobox', { name: LABELS.PRIORITY }), 'High')
    await waitFor(() => expect(lastListParams()).toMatchObject({ priority: 'High' }))
    await waitFor(() => expect(rowTitles()).toEqual(['Urgent']))
  })

  it('6. deleting requires confirmation', async () => {
    const task = makeTask({ title: 'Disposable' })
    serveTasks([task])
    taskApi.remove.mockResolvedValue({ id: task.id })
    const { user } = renderApp()
    await user.click(await screen.findByRole('button', { name: TEXT.deleteTask(task.title) }))

    const confirm = dialog(TITLES.DELETE_TASK)
    expect(within(confirm).getByText(TEXT.confirmDelete(task.title))).toBeInTheDocument()
    await user.click(within(confirm).getByRole('button', { name: LABELS.CANCEL }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(taskApi.remove).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: TEXT.deleteTask(task.title) }))
    await user.click(within(dialog(TITLES.DELETE_TASK)).getByRole('button', { name: LABELS.DELETE }))
    expect(taskApi.remove).toHaveBeenCalledWith(task.id)
    expect(await screen.findByText(TOASTS.DELETED)).toBeInTheDocument()
  })

  it('7. API failure shows an error banner whose Retry refetches', async () => {
    taskApi.list.mockRejectedValueOnce(networkError())
    const { user } = renderApp()
    const banner = await screen.findByRole('alert')
    expect(banner).toHaveTextContent(ERRORS.NETWORK)

    serveTasks([makeTask({ title: 'Back online' })])
    await user.click(within(banner).getByRole('button', { name: LABELS.RETRY }))
    expect(await screen.findByRole('rowheader', { name: /Back online/ })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('8a. loading state: skeleton while the list loads', async () => {
    const pending = deferred()
    taskApi.list.mockReturnValueOnce(pending.promise)
    renderApp()
    expect(screen.getByRole('status', { name: LABELS.LOADING_TASKS })).toBeInTheDocument()
    pending.resolve(listResult([makeTask({ title: 'Loaded' })]))
    expect(await screen.findByRole('rowheader', { name: /Loaded/ })).toBeInTheDocument()
    expect(screen.queryByRole('status', { name: LABELS.LOADING_TASKS })).not.toBeInTheDocument()
  })

  it('8b. loading state: submit is disabled while saving', async () => {
    const saving = deferred()
    taskApi.create.mockReturnValue(saving.promise)
    const { user } = renderApp()
    const form = await openCreate(user)
    await user.type(titleInput(), 'Slow save')
    const submit = within(form).getByRole('button', { name: LABELS.CREATE })
    await user.click(submit)
    expect(submit).toBeDisabled()
    expect(submit).toHaveAttribute('aria-busy', 'true')
    saving.resolve(makeTask({ title: 'Slow save' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('9a. empty state when there are no tasks', async () => {
    const { user } = renderApp()
    expect(await screen.findByText(EMPTY_STATES.NO_TASKS_TITLE)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: LABELS.CREATE_FIRST }))
    expect(dialog(TITLES.CREATE_TASK)).toBeInTheDocument()
  })

  it('9b. filtered-empty state offers to clear filters', async () => {
    serveTasks([makeTask({ title: 'Only pending' })])
    const { user } = renderApp()
    await screen.findByRole('table')
    await user.selectOptions(screen.getByRole('combobox', { name: LABELS.STATUS }), STATUS_COMPLETED)
    expect(await screen.findByText(EMPTY_STATES.NO_MATCHES_TITLE)).toBeInTheDocument()
    expect(screen.queryByText(EMPTY_STATES.NO_TASKS_TITLE)).not.toBeInTheDocument()

    const empty = screen.getByText(EMPTY_STATES.NO_MATCHES_TITLE).closest('section')
    await user.click(within(empty).getByRole('button', { name: LABELS.CLEAR_FILTERS }))
    await waitFor(() => expect(lastListParams()).not.toHaveProperty('status'))
    expect(await screen.findByRole('rowheader', { name: /Only pending/ })).toBeInTheDocument()
  })
})

describe('form edge cases', () => {
  it.each([
    ['   ', VALIDATION.TITLE_REQUIRED],
    ['ab', VALIDATION.TITLE_LENGTH],
  ])('title %p is rejected', async (title, message) => {
    const { user } = renderApp()
    const form = await openCreate(user)
    await user.type(titleInput(), title)
    await user.click(within(form).getByRole('button', { name: LABELS.CREATE }))
    expect(within(form).getByText(message)).toBeInTheDocument()
    expect(taskApi.create).not.toHaveBeenCalled()
  })

  it('title and description enforce maxLength and show live counters', async () => {
    const { user } = renderApp()
    const form = await openCreate(user)
    await user.type(titleInput(), 'abc')
    expect(within(form).getByText(TEXT.counter(3, TASK_LIMITS.TITLE_MAX))).toBeInTheDocument()

    await user.clear(titleInput())
    await user.click(titleInput())
    await user.paste('x'.repeat(TASK_LIMITS.TITLE_MAX + 1))
    expect(titleInput()).toHaveValue('x'.repeat(TASK_LIMITS.TITLE_MAX))

    const description = screen.getByRole('textbox', { name: new RegExp(LABELS.DESCRIPTION) })
    await user.click(description)
    await user.paste('d'.repeat(TASK_LIMITS.DESCRIPTION_MAX + 1))
    expect(description).toHaveValue('d'.repeat(TASK_LIMITS.DESCRIPTION_MAX))
    expect(within(form).getByText(TEXT.counter(TASK_LIMITS.DESCRIPTION_MAX, TASK_LIMITS.DESCRIPTION_MAX))).toBeInTheDocument()
  })

  it('a padded title is submitted trimmed, and a past due date can be saved', async () => {
    taskApi.create.mockResolvedValue(makeTask())
    const { user } = renderApp()
    const form = await openCreate(user)
    await user.type(titleInput(), '  abc  ')
    await user.type(screen.getByLabelText(new RegExp(LABELS.DUE_DATE)), '2020-01-01')
    await user.click(within(form).getByRole('button', { name: LABELS.CREATE }))
    await waitFor(() => expect(taskApi.create).toHaveBeenCalledWith(expect.objectContaining({ title: 'abc', dueDate: '2020-01-01' })))
  })

  it('double-clicking submit calls the API exactly once', async () => {
    const saving = deferred()
    taskApi.create.mockReturnValue(saving.promise)
    const { user } = renderApp()
    const form = await openCreate(user)
    await user.type(titleInput(), 'Only once')
    await user.dblClick(within(form).getByRole('button', { name: LABELS.CREATE }))
    expect(taskApi.create).toHaveBeenCalledTimes(1)
    saving.resolve(makeTask())
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('400 errors appear under the matching fields; unmatched ones as a form alert; values kept', async () => {
    taskApi.create.mockRejectedValue(
      new ApiError('Validation failed', {
        kind: ERROR_KINDS.VALIDATION,
        fieldErrors: [
          { field: 'title', message: 'Server says no' },
          { field: 'body', message: 'Must be a JSON object' },
        ],
      }),
    )
    const { user } = renderApp()
    const form = await openCreate(user)
    await user.type(titleInput(), 'Valid title')
    await user.click(within(form).getByRole('button', { name: LABELS.CREATE }))

    const fieldError = await within(form).findByText('Server says no')
    expect(titleInput()).toHaveAttribute('aria-describedby', expect.stringContaining(fieldError.id))
    expect(within(form).getByRole('alert')).toHaveTextContent('Must be a JSON object')
    expect(titleInput()).toHaveValue('Valid title')
    expect(dialog(TITLES.CREATE_TASK)).toBeInTheDocument()
  })

  it('network error on submit shows a form error, keeps values, and can be retried', async () => {
    taskApi.create.mockRejectedValueOnce(networkError()).mockResolvedValueOnce(makeTask())
    const { user } = renderApp()
    const form = await openCreate(user)
    await user.type(titleInput(), 'Flaky network')
    await user.click(within(form).getByRole('button', { name: LABELS.CREATE }))
    expect(await within(form).findByRole('alert')).toHaveTextContent(ERRORS.NETWORK)
    expect(titleInput()).toHaveValue('Flaky network')

    await user.click(within(form).getByRole('button', { name: LABELS.CREATE }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(taskApi.create).toHaveBeenCalledTimes(2)
  })

  it('edit prefills the form and PUTs the full object; clearing the date sends null', async () => {
    const task = makeTask({ title: 'Plan sprint', description: 'Notes', priority: 'High', status: STATUS_IN_PROGRESS, dueDate: '2026-11-15T00:00:00.000Z' })
    serveTasks([task])
    taskApi.update.mockResolvedValue({ ...task, title: 'Plan sprint 2', dueDate: null })
    const { user } = renderApp()
    await user.click(await screen.findByRole('button', { name: TEXT.editTask(task.title) }))

    const form = dialog(TITLES.EDIT_TASK)
    expect(titleInput()).toHaveValue('Plan sprint')
    const due = within(form).getByLabelText(new RegExp(LABELS.DUE_DATE))
    expect(due).toHaveValue('2026-11-15')
    await user.type(titleInput(), ' 2')
    await user.clear(due)
    await user.click(within(form).getByRole('button', { name: LABELS.SAVE }))

    await waitFor(() =>
      expect(taskApi.update).toHaveBeenCalledWith(task.id, {
        title: 'Plan sprint 2',
        description: 'Notes',
        priority: 'High',
        status: STATUS_IN_PROGRESS,
        dueDate: null,
      }),
    )
    expect(await screen.findByText(TOASTS.UPDATED)).toBeInTheDocument()
  })

  it('editing a task that no longer exists toasts and refetches', async () => {
    const task = makeTask({ title: 'Ghost' })
    serveTasks([task])
    taskApi.update.mockRejectedValue(new ApiError('Task not found', { kind: ERROR_KINDS.NOT_FOUND }))
    const { user } = renderApp()
    await user.click(await screen.findByRole('button', { name: TEXT.editTask(task.title) }))
    const calls = taskApi.list.mock.calls.length
    await user.click(within(dialog(TITLES.EDIT_TASK)).getByRole('button', { name: LABELS.SAVE }))
    expect(await screen.findByText(TOASTS.TASK_GONE)).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(taskApi.list.mock.calls.length).toBeGreaterThan(calls))
  })
})

describe('inline status change', () => {
  it('PATCHes, disables the select while pending, then shows the new value', async () => {
    const task = makeTask({ title: 'Move me' })
    serveTasks([task])
    const saving = deferred()
    // Like the real API, the fake server persists the change once the PATCH completes.
    taskApi.updateStatus.mockImplementation(async (id, status) => {
      await saving.promise
      task.status = status
      return { ...task }
    })
    const { user } = renderApp()
    const select = await screen.findByRole('combobox', { name: TEXT.statusFor(task.title) })
    await user.selectOptions(select, STATUS_COMPLETED)
    expect(taskApi.updateStatus).toHaveBeenCalledWith(task.id, STATUS_COMPLETED)
    expect(select).toBeDisabled()
    expect(select).toHaveValue(STATUS_COMPLETED)
    saving.resolve()
    await waitFor(() => expect(select).toBeEnabled())
    expect(select).toHaveValue(STATUS_COMPLETED)
  })

  it('reverts and shows an error toast when the PATCH fails', async () => {
    const task = makeTask({ title: 'Stubborn' })
    serveTasks([task])
    taskApi.updateStatus.mockRejectedValue(networkError())
    const { user } = renderApp()
    const select = await screen.findByRole('combobox', { name: TEXT.statusFor(task.title) })
    await user.selectOptions(select, STATUS_COMPLETED)
    expect(await screen.findByText(ERRORS.NETWORK)).toBeInTheDocument()
    await waitFor(() => expect(select).toHaveValue(STATUS_PENDING))
    expect(select).toBeEnabled()
  })
})

describe('delete edge cases', () => {
  it('404 on delete toasts "no longer exists" and refetches', async () => {
    const task = makeTask({ title: 'Already gone' })
    serveTasks([task])
    taskApi.remove.mockRejectedValue(new ApiError('Task not found', { kind: ERROR_KINDS.NOT_FOUND }))
    const { user } = renderApp()
    await user.click(await screen.findByRole('button', { name: TEXT.deleteTask(task.title) }))
    const calls = taskApi.list.mock.calls.length
    await user.click(within(dialog(TITLES.DELETE_TASK)).getByRole('button', { name: LABELS.DELETE }))
    expect(await screen.findByText(TOASTS.TASK_GONE)).toBeInTheDocument()
    await waitFor(() => expect(taskApi.list.mock.calls.length).toBeGreaterThan(calls))
  })

  it('deleting the last item on page 2 moves to page 1', async () => {
    const tasks = Array.from({ length: PAGINATION.PAGE_SIZE + 1 }, (_, i) => makeTask({ title: `Item ${i + 1}` }))
    serveTasks(tasks)
    const last = tasks[PAGINATION.PAGE_SIZE]
    taskApi.remove.mockImplementation(async (id) => {
      tasks.splice(tasks.findIndex((t) => t.id === id), 1)
      return { id }
    })
    const { user } = renderApp()
    await user.click(await screen.findByRole('button', { name: LABELS.NEXT }))
    await waitFor(() => expect(rowTitles()).toEqual([last.title]))

    await user.click(screen.getByRole('button', { name: TEXT.deleteTask(last.title) }))
    await user.click(within(dialog(TITLES.DELETE_TASK)).getByRole('button', { name: LABELS.DELETE }))
    await waitFor(() => expect(lastListParams()).toMatchObject({ page: 1 }))
    await waitFor(() => expect(rowTitles()).toHaveLength(PAGINATION.PAGE_SIZE))
  })
})

describe('filters, search and pagination', () => {
  const manyTasks = () =>
    Array.from({ length: PAGINATION.PAGE_SIZE * 2 + 1 }, (_, i) => makeTask({ title: `Report ${i + 1}`, priority: 'High' }))

  it('combined search + status + priority sends all params; Clear filters resets everything', async () => {
    serveTasks(manyTasks())
    const { user } = renderApp()
    await screen.findByRole('table')
    const search = screen.getByRole('searchbox', { name: LABELS.SEARCH })
    await user.type(search, 'Report 1')
    await user.selectOptions(screen.getByRole('combobox', { name: LABELS.STATUS }), STATUS_PENDING)
    await user.selectOptions(screen.getByRole('combobox', { name: LABELS.PRIORITY }), 'High')
    await waitFor(() =>
      expect(lastListParams()).toEqual({ search: 'Report 1', status: STATUS_PENDING, priority: 'High', page: 1, limit: PAGINATION.PAGE_SIZE }),
    )

    await user.click(screen.getByRole('button', { name: LABELS.CLEAR_FILTERS }))
    await waitFor(() => expect(lastListParams()).toEqual({ page: 1, limit: PAGINATION.PAGE_SIZE }))
    expect(search).toHaveValue('')
    expect(screen.getByRole('combobox', { name: LABELS.STATUS })).toHaveValue('')
    expect(screen.queryByRole('button', { name: LABELS.CLEAR_FILTERS })).not.toBeInTheDocument()
  })

  it('changing a filter or the search resets the page to 1', async () => {
    serveTasks(manyTasks())
    const { user } = renderApp()
    await user.click(await screen.findByRole('button', { name: LABELS.NEXT }))
    await waitFor(() => expect(lastListParams()).toMatchObject({ page: 2 }))

    await user.selectOptions(screen.getByRole('combobox', { name: LABELS.PRIORITY }), 'High')
    await waitFor(() => expect(lastListParams()).toMatchObject({ page: 1, priority: 'High' }))

    await user.click(screen.getByRole('button', { name: LABELS.NEXT }))
    await waitFor(() => expect(lastListParams()).toMatchObject({ page: 2 }))
    await user.type(screen.getByRole('searchbox', { name: LABELS.SEARCH }), 'Rep')
    await waitFor(() => expect(lastListParams()).toMatchObject({ page: 1, search: 'Rep' }))
  })

  it('search text is sent as typed (case preserved); whitespace-only sends no search param', async () => {
    const { user } = renderApp()
    const search = screen.getByRole('searchbox', { name: LABELS.SEARCH })
    await user.type(search, 'MERN')
    await waitFor(() => expect(lastListParams()).toMatchObject({ search: 'MERN' }))

    await user.clear(search)
    await user.type(search, '   ')
    await act(() => sleep(SEARCH_DEBOUNCE_MS * 2)) // let the debounce fire inside act()
    expect(lastListParams()).not.toHaveProperty('search')
  })

  it('Next / Previous request the right page; "Page X of Y" shown', async () => {
    serveTasks(manyTasks())
    const { user } = renderApp()
    const nav = await screen.findByRole('navigation', { name: LABELS.PAGINATION })
    expect(within(nav).getByText(TEXT.pageOf(1, 3))).toBeInTheDocument()
    expect(within(nav).getByRole('button', { name: LABELS.PREVIOUS })).toBeDisabled()

    await user.click(within(nav).getByRole('button', { name: LABELS.NEXT }))
    await waitFor(() => expect(lastListParams()).toMatchObject({ page: 2 }))
    expect(await within(nav).findByText(TEXT.pageOf(2, 3))).toBeInTheDocument()

    await user.click(within(nav).getByRole('button', { name: LABELS.PREVIOUS }))
    await waitFor(() => expect(lastListParams()).toMatchObject({ page: 1 }))
  })

  it('pagination is hidden when there is only one page', async () => {
    serveTasks([makeTask()])
    renderApp()
    await screen.findByRole('table')
    expect(screen.queryByRole('navigation', { name: LABELS.PAGINATION })).not.toBeInTheDocument()
  })

  it('shows "Updating…" and keeps the table while a filter refetch is in flight', async () => {
    serveTasks([makeTask({ title: 'Stays visible' })])
    const { user } = renderApp()
    await screen.findByRole('table')
    const refetch = deferred()
    taskApi.list.mockReturnValueOnce(refetch.promise)
    await user.selectOptions(screen.getByRole('combobox', { name: LABELS.PRIORITY }), 'Low')
    expect(await screen.findByText(LABELS.UPDATING)).toBeInTheDocument()
    expect(screen.getByRole('rowheader', { name: /Stays visible/ })).toBeInTheDocument()
    refetch.resolve(listResult([]))
    await waitFor(() => expect(screen.queryByText(LABELS.UPDATING)).not.toBeInTheDocument())
  })

  it('a failed refetch shows the banner and hides the stale rows', async () => {
    serveTasks([makeTask({ title: 'Stale soon' })])
    const { user } = renderApp()
    await screen.findByRole('table')
    taskApi.list.mockRejectedValueOnce(new ApiError(ERRORS.GENERIC, { kind: ERROR_KINDS.SERVER }))
    await user.selectOptions(screen.getByRole('combobox', { name: LABELS.PRIORITY }), 'Low')
    expect(await screen.findByRole('alert')).toHaveTextContent(ERRORS.GENERIC)
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows the result count', async () => {
    serveTasks([makeTask(), makeTask()])
    renderApp()
    expect(await screen.findByText(TEXT.taskCount(2))).toBeInTheDocument()
  })
})

describe('rows', () => {
  it('shows Overdue only for past-due tasks that are not Completed', async () => {
    serveTasks([
      makeTask({ title: 'Late', dueDate: '2020-01-01T00:00:00.000Z' }),
      makeTask({ title: 'Late but done', dueDate: '2020-01-01T00:00:00.000Z', status: STATUS_COMPLETED }),
      makeTask({ title: 'Future', dueDate: '2999-01-01T00:00:00.000Z' }),
    ])
    renderApp()
    await screen.findByRole('table')
    const rowOf = (title) => screen.getByRole('rowheader', { name: title }).closest('tr')
    expect(within(rowOf('Late')).getByText(LABELS.OVERDUE)).toBeInTheDocument()
    expect(within(rowOf('Late but done')).queryByText(LABELS.OVERDUE)).not.toBeInTheDocument()
    expect(within(rowOf('Future')).queryByText(LABELS.OVERDUE)).not.toBeInTheDocument()
  })

  it('renders "2026-11-15" as Nov 15, 2026 (no UTC off-by-one)', async () => {
    serveTasks([makeTask({ dueDate: '2026-11-15T00:00:00.000Z' })])
    renderApp()
    expect(await screen.findByText('Nov 15, 2026')).toBeInTheDocument()
  })

  it('long titles carry a title attribute for the full text', async () => {
    const long = 'L'.repeat(TASK_LIMITS.TITLE_MAX)
    serveTasks([makeTask({ title: long, description: 'One line only' })])
    renderApp()
    const header = await screen.findByRole('rowheader')
    expect(within(header).getByText(long)).toHaveAttribute('title', long)
  })
})

describe('server reachability', () => {
  it('a 503 / network failure shows the "Can’t reach the server" banner with Retry', async () => {
    taskApi.list.mockRejectedValue(networkError())
    renderApp()
    const banner = await screen.findByRole('alert')
    expect(banner).toHaveTextContent(ERRORS.NETWORK)
    expect(within(banner).getByRole('button', { name: LABELS.RETRY })).toBeInTheDocument()
  })
})

describe('dialogs and accessibility', () => {
  it('Escape closes the form dialog and focus returns to the trigger', async () => {
    const { user } = renderApp()
    const trigger = screen.getByRole('button', { name: LABELS.NEW_TASK })
    await user.click(trigger)
    expect(dialog(TITLES.CREATE_TASK)).toHaveAttribute('aria-modal', 'true')
    expect(titleInput()).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('Escape closes the confirm dialog', async () => {
    const task = makeTask({ title: 'Keep me' })
    serveTasks([task])
    const { user } = renderApp()
    await user.click(await screen.findByRole('button', { name: TEXT.deleteTask(task.title) }))
    expect(dialog(TITLES.DELETE_TASK)).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(taskApi.remove).not.toHaveBeenCalled()
  })

  it('renders the app name and a semantic table with column headers', async () => {
    serveTasks([makeTask()])
    renderApp()
    expect(screen.getByRole('heading', { name: APP_NAME })).toBeInTheDocument()
    const table = await screen.findByRole('table')
    expect(within(table).getAllByRole('columnheader').length).toBeGreaterThan(0)
  })
})

describe('lifecycle', () => {
  it('unmounting mid-request does not warn or throw', async () => {
    const pending = deferred()
    taskApi.list.mockReturnValue(pending.promise)
    const { unmount } = renderApp()
    unmount()
    pending.resolve(listResult([makeTask()]))
    await sleep(0)
    // setup.js fails the test on any console.error/warn
  })
})
