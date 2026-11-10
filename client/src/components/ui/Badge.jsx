import { TONE_CLASSES } from '../../constants/ui'
import { cx } from '../../utils/cx'

export default function Badge({ tone = 'neutral', className, children }) {
  return (
    <span className={cx('inline-flex items-center rounded-sm px-1.5 py-0.5 text-xs font-medium whitespace-nowrap', TONE_CLASSES[tone], className)}>
      {children}
    </span>
  )
}
