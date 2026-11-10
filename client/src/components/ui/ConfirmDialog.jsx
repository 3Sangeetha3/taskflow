import Modal from './Modal'
import Button from './Button'
import { LABELS } from '../../constants/messages'

export default function ConfirmDialog({ open, title, message, confirmLabel, onConfirm, onCancel, isPending = false }) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="text-ink-muted">{message}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button onClick={onCancel} data-autofocus>
          {LABELS.CANCEL}
        </Button>
        <Button variant="danger" onClick={onConfirm} loading={isPending}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
