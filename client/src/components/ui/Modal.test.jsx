import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Modal from './Modal'
import { LABELS } from '../../constants/messages'

function Harness() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Example dialog">
        <input aria-label="First" />
        <button>Last</button>
      </Modal>
    </>
  )
}

describe('Modal', () => {
  it('is a labelled modal dialog that focuses inside, traps Tab, closes on Escape and restores focus', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const trigger = screen.getByRole('button', { name: 'Open' })
    await user.click(trigger)

    const dialog = screen.getByRole('dialog', { name: 'Example dialog' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByRole('button', { name: LABELS.CLOSE })).toHaveFocus()

    // Tab cycles within the dialog: Close → First → Last → Close
    await user.tab()
    expect(screen.getByRole('textbox', { name: 'First' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Last' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: LABELS.CLOSE })).toHaveFocus()
    await user.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Last' })).toHaveFocus()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('closes from the close button', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    await user.click(screen.getByRole('button', { name: LABELS.CLOSE }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
