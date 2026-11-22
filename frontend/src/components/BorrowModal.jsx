// A student's borrow request form.
import { useState } from 'react'
import { Alert, Button, Col, Form, Modal, Row, Spinner } from 'react-bootstrap'
import { ProductImage, StockBadge } from './ui.jsx'
import { isoDate, money } from '../utils/format'

const MAX_DAYS = 30

export default function BorrowModal({ product, onSubmit, onClose }) {
  const [quantity, setQuantity] = useState('1')
  const [dueDate, setDueDate] = useState(isoDate(3))
  const [purpose, setPurpose] = useState('')
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const minDate = isoDate(0)
  const maxDate = isoDate(MAX_DAYS)

  async function handleSubmit(event) {
    event.preventDefault()
    const found = {}
    const qty = Number(quantity)
    if (!Number.isInteger(qty) || qty < 1) found.quantity = 'Enter at least 1 unit.'
    else if (qty > product.stock) found.quantity = `Only ${product.stock} unit(s) available.`
    if (!dueDate) found.dueDate = 'Choose a return date.'
    else if (dueDate < minDate) found.dueDate = 'Return date cannot be in the past.'
    else if (dueDate > maxDate) found.dueDate = `Loans can be at most ${MAX_DAYS} days.`
    if (purpose.length > 255) found.purpose = 'Keep it under 255 characters.'
    setErrors(found)
    if (Object.keys(found).length) return

    setSaving(true)
    setFormError('')
    try {
      await onSubmit({ productId: product.id, quantity: qty, dueDate, purpose: purpose.trim() })
    } catch (error) {
      setErrors(error.fields || {})
      setFormError(error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal show onHide={saving ? undefined : onClose} centered fullscreen="sm-down">
      <Form noValidate onSubmit={handleSubmit}>
        <Modal.Header closeButton={!saving}>
          <Modal.Title as="h2" className="h5">Borrow equipment</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="d-flex gap-3 align-items-center mb-3 p-2 rounded-3 bg-body-tertiary">
            <ProductImage src={product.image} className="thumb-lg" />
            <div className="min-w-0">
              <div className="fw-semibold">{product.name}</div>
              <div className="small text-body-secondary">{product.category} · {money.format(product.price)}</div>
              <div className="mt-1"><StockBadge product={product} /> <span className="small ms-1">{product.stock} available</span></div>
            </div>
          </div>
          {formError && <Alert variant="danger" className="py-2">{formError}</Alert>}
          <Row className="g-3">
            <Col xs={5}>
              <Form.Group controlId="borrow-qty">
                <Form.Label>Quantity</Form.Label>
                <Form.Control type="number" min={1} max={product.stock} step={1} inputMode="numeric" value={quantity}
                  onChange={(event) => setQuantity(event.target.value)} isInvalid={Boolean(errors.quantity)} />
                <Form.Control.Feedback type="invalid">{errors.quantity}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col xs={7}>
              <Form.Group controlId="borrow-due">
                <Form.Label>Return by</Form.Label>
                <Form.Control type="date" min={minDate} max={maxDate} value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)} isInvalid={Boolean(errors.dueDate)} />
                <Form.Control.Feedback type="invalid">{errors.dueDate}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col xs={12}>
              <Form.Group controlId="borrow-purpose">
                <Form.Label>Purpose <span className="text-body-secondary small">(optional)</span></Form.Label>
                <Form.Control value={purpose} maxLength={255} placeholder="e.g. Thesis film shoot"
                  onChange={(event) => setPurpose(event.target.value)} isInvalid={Boolean(errors.purpose)} />
                <Form.Control.Feedback type="invalid">{errors.purpose}</Form.Control.Feedback>
              </Form.Group>
            </Col>
          </Row>
          <p className="small text-body-secondary mt-3 mb-0">
            Your request goes to the studio admin. Stock is reserved only once it is approved.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" disabled={saving}>
            {saving && <Spinner animation="border" size="sm" className="me-2" />}
            Send request
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}
