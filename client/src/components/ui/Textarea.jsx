import { CONTROL_CLASSES } from '../../constants/ui'
import { cx } from '../../utils/cx'

export default function Textarea({ className, ...props }) {
  return <textarea className={cx(CONTROL_CLASSES.textarea, className)} {...props} />
}
