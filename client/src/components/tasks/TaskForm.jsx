import { useRef, useState } from 'react'
import FormField from '../ui/FormField'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Textarea from '../ui/Textarea'
import Button from '../ui/Button'
import { FORM_FIELDS, TASK_LIMITS } from '../../constants/task'
import { LABELS, TEXT } from '../../constants/messages'
import { PRIORITY_OPTIONS, STATUS_OPTIONS } from '../../constants/options'
import { taskFormSchema } from '../../schemas/taskSchema'
import { splitServerErrors, zodFieldErrors } from '../../utils/formErrors'
import { omit } from '../../utils/taskForm'

// Controlled task form. Validates with the shared schema; server errors map to fields or a form alert.
// Values survive any failure because the form stays mounted until the parent closes it.
export default function TaskForm({ initialValues, submitLabel, onSubmit, onCancel, isPending }) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const submitting = useRef(false) // guards re-entry before isPending re-renders (double click)

  const bind = (field) => ({
    value: values[field],
    onChange: (event) => {
      setValues((current) => ({ ...current, [field]: event.target.value }))
      setErrors((current) => omit(current, field))
    },
  })

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submitting.current || isPending) return
    const result = taskFormSchema.safeParse(values)
    if (!result.success) {
      setErrors(zodFieldErrors(result.error))
      return
    }
    submitting.current = true
    setFormError(null)
    try {
      await onSubmit(result.data)
    } catch (error) {
      const { fieldErrors, formError: message } = splitServerErrors(error, FORM_FIELDS)
      setErrors(fieldErrors)
      setFormError(message)
    } finally {
      submitting.current = false
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FormField label={LABELS.TITLE} error={errors.title} counter={TEXT.counter(values.title.length, TASK_LIMITS.TITLE_MAX)}>
        {(aria) => <Input {...aria} {...bind('title')} maxLength={TASK_LIMITS.TITLE_MAX} autoComplete="off" data-autofocus />}
      </FormField>

      <FormField
        label={LABELS.DESCRIPTION}
        optional
        error={errors.description}
        counter={TEXT.counter(values.description.length, TASK_LIMITS.DESCRIPTION_MAX)}
      >
        {(aria) => <Textarea {...aria} {...bind('description')} maxLength={TASK_LIMITS.DESCRIPTION_MAX} rows={3} />}
      </FormField>

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label={LABELS.PRIORITY} error={errors.priority}>
          {(aria) => <Select {...aria} {...bind('priority')} options={PRIORITY_OPTIONS} />}
        </FormField>
        <FormField label={LABELS.STATUS} error={errors.status}>
          {(aria) => <Select {...aria} {...bind('status')} options={STATUS_OPTIONS} />}
        </FormField>
        <FormField label={LABELS.DUE_DATE} optional error={errors.dueDate}>
          {(aria) => <Input {...aria} {...bind('dueDate')} type="date" />}
        </FormField>
      </div>

      {formError && (
        <p role="alert" className="rounded-md border border-danger/30 bg-danger-soft px-3 py-2 text-danger">
          {formError}
        </p>
      )}

      <div className="flex justify-end gap-2 border-t border-line pt-4">
        <Button onClick={onCancel}>{LABELS.CANCEL}</Button>
        <Button type="submit" variant="primary" loading={isPending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
