import { useState } from 'react'
import { Inbox, Plus, SearchX, X } from 'lucide-react'
import TaskFilters from './TaskFilters'
import TaskTable from './TaskTable'
import Button from '../ui/Button'
import ConfirmDialog from '../ui/ConfirmDialog'
import EmptyState from '../ui/EmptyState'
import ErrorBanner from '../ui/ErrorBanner'
import Pagination from '../ui/Pagination'
import Skeleton from '../ui/Skeleton'
import { useToast } from '../ui/toastContext'
import { useTaskFilters } from '../../hooks/useTaskFilters'
import { useTasks } from '../../hooks/useTasks'
import { useDeleteTask } from '../../hooks/useTaskMutations'
import { useTaskErrorToast } from '../../hooks/useTaskErrorToast'
import { PAGINATION } from '../../constants/task'
import { EMPTY_STATES, ERRORS, LABELS, TEXT, TITLES, TOASTS } from '../../constants/messages'

// Toolbar + list states (loading, error, empty, filtered-empty, data) + delete confirmation.
export default function TaskList({ onCreate, onEdit }) {
  const filters = useTaskFilters()
  const { data, error, isPending, isError, isFetching, refetch } = useTasks(filters.params)
  const [toDelete, setToDelete] = useState(null)
  const remove = useDeleteTask()
  const toast = useToast()
  const onTaskError = useTaskErrorToast()

  const confirmDelete = () =>
    remove.mutate(toDelete.id, {
      onSuccess: () => {
        toast.success(TOASTS.DELETED)
        const wasLastOnPage = data.items.length === 1 && filters.page > PAGINATION.FIRST_PAGE
        if (wasLastOnPage) filters.setPage(filters.page - 1)
      },
      onError: onTaskError,
      onSettled: () => setToDelete(null),
    })

  const renderContent = () => {
    if (isPending) return <Skeleton />
    if (isError) return <ErrorBanner title={ERRORS.LOAD_TASKS} message={error.message} onRetry={refetch} isRetrying={isFetching} />
    if (!data.items.length && filters.hasAppliedFilters) {
      return (
        <EmptyState
          icon={SearchX}
          title={EMPTY_STATES.NO_MATCHES_TITLE}
          body={EMPTY_STATES.NO_MATCHES_BODY}
          action={<Button icon={X} onClick={filters.clearFilters}>{LABELS.CLEAR_FILTERS}</Button>}
        />
      )
    }
    if (!data.items.length) {
      return (
        <EmptyState
          icon={Inbox}
          title={EMPTY_STATES.NO_TASKS_TITLE}
          body={EMPTY_STATES.NO_TASKS_BODY}
          action={<Button variant="primary" icon={Plus} onClick={onCreate}>{LABELS.CREATE_FIRST}</Button>}
        />
      )
    }
    return (
      <>
        <TaskTable tasks={data.items} onEdit={onEdit} onDelete={setToDelete} />
        <Pagination page={filters.page} totalPages={data.meta.totalPages} onChange={filters.setPage} />
      </>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <TaskFilters filters={filters} total={isError ? undefined : data?.meta.total} isUpdating={isFetching && !isPending && !isError} />
      {renderContent()}
      <ConfirmDialog
        open={Boolean(toDelete)}
        title={TITLES.DELETE_TASK}
        message={toDelete ? TEXT.confirmDelete(toDelete.title) : ''}
        confirmLabel={LABELS.DELETE}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
        isPending={remove.isPending}
      />
    </div>
  )
}
