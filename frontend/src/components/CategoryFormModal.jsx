// Create / rename a category.
import { useState } from 'react'
import { Alert, Button, Form, Modal, Spinner } from 'react-bootstrap'

export default function CategoryFormModal({ category, onSave, onClose }) {
  const isNew = !category?.id
  const [name, setName] = useState(category?.name || '')
  const [description, setDescription] = useState(category?.description || '')
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const found = {}
    if (!name.trim()) found.name = 'Category name is required.'
    else if (name.trim().length > 100) found.name = 'Keep the name under 100 characters.'
    if (description.length > 255) found.description = 'Keep the description under 255 characters.'
    setErrors(found)
    if (Object.keys(found).length) return

    setSaving(true)
    setFormError('')
    try {
      await onSave({ name: name.trim(), description: description.trim() })
    } catch (error) {
      setErrors(error.fields || {})
      setFormError(error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal show onHide={saving ? undefined : onClose} centered backdrop="static">
      <Form noValidate onSubmit={handleSubmit}>
        <Modal.Header closeButton={!saving}>
          <Modal.Title as="h2" className="h5">{isNew ? 'New category' : 'Edit category'}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="d-grid gap-3">
          {formError && <Alert variant="danger" className="py-2 mb-0">{formError}</Alert>}
          <Form.Group controlId="category-name">
            <Form.Label>Name <span className="text-danger">*</span></Form.Label>
            <Form.Control value={name} onChange={(event) => setName(event.target.value)} isInvalid={Boolean(errors.name)} maxLength={100} autoFocus />
            <Form.Control.Feedback type="invalid">{errors.name}</Form.Control.Feedback>
          </Form.Group>
          <Form.Group controlId="category-description">
            <Form.Label>Description</Form.Label>
            <Form.Control value={description} onChange={(event) => setDescription(event.target.value)} isInvalid={Boolean(errors.description)} maxLength={255} />
            <Form.Control.Feedback type="invalid">{errors.description}</Form.Control.Feedback>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" disabled={saving}>
            {saving && <Spinner animation="border" size="sm" className="me-2" />}
            {isNew ? 'Create category' : 'Save changes'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}
