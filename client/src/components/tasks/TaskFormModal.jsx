import Modal from '../ui/Modal'
import TaskForm from './TaskForm'
import { useToast } from '../ui/toastContext'
import { useCreateTask, useUpdateTask } from '../../hooks/useTaskMutations'
import { useTaskErrorToast } from '../../hooks/useTaskErrorToast'
import { ERROR_KINDS } from '../../constants/app'
import { EMPTY_FORM } from '../../constants/task'
import { LABELS, TITLES, TOASTS } from '../../constants/messages'
import { toFormValues } from '../../utils/taskForm'

// Create (POST) or edit (PUT, full object) in a dialog. A task deleted elsewhere (404) closes the
// dialog with a toast and refetches; other failures are rethrown so the form can show them.
export default function TaskFormModal({ editor }) {
  const create = useCreateTask()
  const update = useUpdateTask()
  const toast = useToast()
  const onTaskError = useTaskErrorToast()
  const isEdit = Boolean(editor.task)

  const handleSubmit = async (values) => {
    try {
      if (isEdit) await update.mutateAsync({ id: editor.task.id, values })
      else await create.mutateAsync(values)
    } catch (error) {
      if (!isEdit || error.kind !== ERROR_KINDS.NOT_FOUND) throw error
      onTaskError(error)
      editor.close()
      return
    }
    toast.success(isEdit ? TOASTS.UPDATED : TOASTS.CREATED)
    editor.close()
  }

  return (
    <Modal open={editor.open} onClose={editor.close} title={isEdit ? TITLES.EDIT_TASK : TITLES.CREATE_TASK}>
      <TaskForm
        initialValues={isEdit ? toFormValues(editor.task) : EMPTY_FORM}
        submitLabel={isEdit ? LABELS.SAVE : LABELS.CREATE}
        onSubmit={handleSubmit}
        onCancel={editor.close}
        isPending={isEdit ? update.isPending : create.isPending}
      />
    </Modal>
  )
}
