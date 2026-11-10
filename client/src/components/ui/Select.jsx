import { CONTROL_CLASSES } from '../../constants/ui'
import { cx } from '../../utils/cx'

// options: [{ value, label }]
export default function Select({ options, className, ...props }) {
  return (
    <select className={cx(CONTROL_CLASSES.select, className)} {...props}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}
