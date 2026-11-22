// Confirms a loan status change (approve / reject / return / cancel) with an
// optional note for the student.
import { useState } from 'react'
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap'
import { useAdminData } from '../../context/AdminDataContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'

const COPY = {
  approved: { title: 'Approve request', button: 'Approve', variant: 'success', done: 'Loan approved — stock updated.' },
  rejected: { title: 'Reject request', button: 'Reject', variant: 'danger', done: 'Request rejected.' },
  returned: { title: 'Mark as returned', button: 'Mark returned', variant: 'primary', done: 'Return recorded — stock restored.' },
  cancelled: { title: 'Cancel request', button: 'Cancel request', variant: 'danger', done: 'Request cancelled.' },
}

export default function LoanStatusDialog({ loan, status, onClose }) {
  const { setLoanStatus } = useAdminData()
  const notify = useToast()
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const copy = COPY[status]

  async function confirm(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await setLoanStatus(loan.id, status, note.trim() || undefined)
      notify(copy.done)
      onClose()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <Modal show onHide={busy ? undefined : onClose} centered>
      <Form onSubmit={confirm}>
        <Modal.Header closeButton={!busy}>
          <Modal.Title as="h2" className="h5">{copy.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="d-grid gap-3">
          {error && <Alert variant="danger" className="py-2 mb-0">{error}</Alert>}
          <p className="mb-0">
            <strong>{loan.productName}</strong> × {loan.quantity} for {loan.borrowerName || loan.borrowerEmail}
            {status === 'approved' && <> — {loan.quantity} unit(s) will be taken out of stock (currently {loan.productStock}).</>}
            {status === 'returned' && <> — {loan.quantity} unit(s) will be added back to stock.</>}
          </p>
          <Form.Group controlId="loan-note">
            <Form.Label>Note to the student <span className="text-body-secondary small">(optional)</span></Form.Label>
            <Form.Control value={note} maxLength={255} onChange={(event) => setNote(event.target.value)}
              placeholder={status === 'rejected' ? 'e.g. Reserved for a class that week' : 'e.g. Pick up at the front desk'} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={onClose} disabled={busy}>Back</Button>
          <Button type="submit" variant={copy.variant} disabled={busy}>
            {busy && <Spinner animation="border" size="sm" className="me-2" />}
            {copy.button}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}
