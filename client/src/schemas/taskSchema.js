import { z } from 'zod'
import { PRIORITIES, STATUSES, TASK_LIMITS } from '../constants/task'
import { VALIDATION } from '../constants/messages'

// Form schema: validates what the user typed and produces the API payload (dueDate '' → null).
// Zod 4 keeps running checks after one fails, so only the first message per field is shown.
export const taskFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, { error: VALIDATION.TITLE_REQUIRED })
      .min(TASK_LIMITS.TITLE_MIN, { error: VALIDATION.TITLE_LENGTH })
      .max(TASK_LIMITS.TITLE_MAX, { error: VALIDATION.TITLE_LENGTH }),
    description: z.string().trim().max(TASK_LIMITS.DESCRIPTION_MAX, { error: VALIDATION.DESCRIPTION_LENGTH }),
    priority: z.enum(PRIORITIES, { error: VALIDATION.PRIORITY_INVALID }),
    status: z.enum(STATUSES, { error: VALIDATION.STATUS_INVALID }),
    // Zod 4 reports the closest union branch's own issue, so the message must live on the branch.
    dueDate: z.union([z.literal(''), z.iso.date({ error: VALIDATION.DUE_DATE_INVALID })]),
  })
  .transform((values) => ({ ...values, dueDate: values.dueDate || null }))

// Response schemas: guard against malformed server data before it reaches the UI.
const isoDateTime = z.iso.datetime({ offset: true })

export const taskSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  description: z.string(),
  priority: z.enum(PRIORITIES),
  status: z.enum(STATUSES),
  dueDate: isoDateTime.nullable(),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
})

const count = z.number().int().nonnegative()
const envelope = (data) => z.object({ success: z.literal(true), message: z.string(), data })

export const taskEnvelopeSchema = envelope(taskSchema)
export const listEnvelopeSchema = envelope(z.array(taskSchema)).extend({
  meta: z.object({ page: count, limit: count, total: count, totalPages: count }),
})
export const deleteEnvelopeSchema = envelope(z.object({ id: z.string().min(1) }))
