import { CONTROL_CLASSES } from '../../constants/ui'
import { cx } from '../../utils/cx'

export default function Input({ className, ...props }) {
  return <input className={cx(CONTROL_CLASSES.input, className)} {...props} />
}
