// A Bootstrap modal that replaces window.confirm().
import { useState } from 'react'
import { Button, Modal, Spinner } from 'react-bootstrap'

export default function ConfirmDialog({ show, title, children, confirmLabel = 'Confirm', variant = 'danger', onConfirm, onCancel }) {
  const [busy, setBusy] = useState(false)

  async function handleConfirm() {
    setBusy(true)
    try {
      await onConfirm()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal show={show} onHide={busy ? undefined : onCancel} centered>
      <Modal.Header closeButton={!busy}>
        <Modal.Title as="h2" className="h5">{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{children}</Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button variant={variant} onClick={handleConfirm} disabled={busy}>
          {busy && <Spinner animation="border" size="sm" className="me-2" />}
          {confirmLabel}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
