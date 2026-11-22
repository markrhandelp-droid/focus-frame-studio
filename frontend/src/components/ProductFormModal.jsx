// Create / edit equipment. Client-side validation mirrors the API's rules;
// anything the API still rejects is shown next to the matching field.
import { useState } from 'react'
import { Button, Col, Form, Modal, Row, Spinner, Alert, InputGroup } from 'react-bootstrap'
import { ProductImage } from './ui.jsx'
import { compressImage } from '../utils/image'

const EMPTY = { name: '', categoryId: '', price: '', stock: '1', lowStockThreshold: '6', description: '', image: '' }

function validate(values) {
  const errors = {}
  if (!values.name.trim()) errors.name = 'Equipment name is required.'
  else if (values.name.trim().length > 255) errors.name = 'Keep the name under 255 characters.'
  if (!values.categoryId) errors.categoryId = 'Choose a category.'
  if (values.price === '' || Number(values.price) < 0 || Number.isNaN(Number(values.price))) errors.price = 'Enter a price of 0 or more.'
  if (values.stock === '' || !Number.isInteger(Number(values.stock)) || Number(values.stock) < 0) errors.stock = 'Stock must be a whole number, 0 or more.'
  if (values.lowStockThreshold === '' || !Number.isInteger(Number(values.lowStockThreshold)) || Number(values.lowStockThreshold) < 0)
    errors.lowStockThreshold = 'Use a whole number, 0 or more.'
  if (values.description.length > 2000) errors.description = 'Keep the description under 2000 characters.'
  return errors
}

export default function ProductFormModal({ product, categories, onSave, onClose }) {
  const isNew = !product?.id
  const [values, setValues] = useState(() =>
    product?.id
      ? {
          name: product.name,
          categoryId: String(product.categoryId),
          price: String(product.price),
          stock: String(product.stock),
          lowStockThreshold: String(product.lowStockThreshold),
          description: product.description || '',
          image: product.image || '',
        }
      : { ...EMPTY, categoryId: categories[0] ? String(categories[0].id) : '' }
  )
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState(false)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  function change(field, value) {
    const next = { ...values, [field]: value }
    setValues(next)
    if (touched) setErrors(validate(next))
  }

  async function handleImage(event) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      change('image', await compressImage(file))
    } catch (error) {
      setErrors((current) => ({ ...current, image: error.message }))
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setTouched(true)
    const found = validate(values)
    setErrors(found)
    if (Object.keys(found).length) return

    setSaving(true)
    setFormError('')
    try {
      await onSave({
        name: values.name.trim(),
        categoryId: Number(values.categoryId),
        price: Number(values.price),
        stock: Number(values.stock),
        lowStockThreshold: Number(values.lowStockThreshold),
        description: values.description.trim(),
        image: values.image,
      })
    } catch (error) {
      setErrors(error.fields || {})
      setFormError(error.message)
    } finally {
      setSaving(false)
    }
  }

  const field = (name) => ({
    value: values[name],
    onChange: (event) => change(name, event.target.value),
    isInvalid: Boolean(errors[name]),
  })

  return (
    <Modal show onHide={saving ? undefined : onClose} size="lg" centered fullscreen="sm-down" backdrop="static">
      <Form noValidate onSubmit={handleSubmit}>
        <Modal.Header closeButton={!saving}>
          <div>
            <p className="eyebrow mb-0">{isNew ? 'New record' : `SKU-${String(product.id).padStart(4, '0')}`}</p>
            <Modal.Title as="h2" className="h5">{isNew ? 'Add equipment' : 'Edit equipment'}</Modal.Title>
          </div>
        </Modal.Header>
        <Modal.Body>
          {formError && <Alert variant="danger" className="py-2">{formError}</Alert>}
          <Row className="g-3">
            <Col xs={12} md={8}>
              <Form.Group controlId="product-name">
                <Form.Label>Equipment name <span className="text-danger">*</span></Form.Label>
                <Form.Control type="text" maxLength={255} autoFocus {...field('name')} />
                <Form.Control.Feedback type="invalid">{errors.name}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col xs={12} md={4}>
              <Form.Group controlId="product-category">
                <Form.Label>Category <span className="text-danger">*</span></Form.Label>
                <Form.Select {...field('categoryId')}>
                  <option value="">Choose…</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">{errors.categoryId}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col xs={12} sm={4}>
              <Form.Group controlId="product-price">
                <Form.Label>Unit price <span className="text-danger">*</span></Form.Label>
                <InputGroup hasValidation>
                  <InputGroup.Text>₱</InputGroup.Text>
                  <Form.Control type="number" min={0} step="0.01" inputMode="decimal" {...field('price')} />
                  <Form.Control.Feedback type="invalid">{errors.price}</Form.Control.Feedback>
                </InputGroup>
              </Form.Group>
            </Col>
            <Col xs={6} sm={4}>
              <Form.Group controlId="product-stock">
                <Form.Label>Stock (units) <span className="text-danger">*</span></Form.Label>
                <Form.Control type="number" min={0} step={1} inputMode="numeric" {...field('stock')} />
                <Form.Control.Feedback type="invalid">{errors.stock}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col xs={6} sm={4}>
              <Form.Group controlId="product-threshold">
                <Form.Label>Low-stock alert at</Form.Label>
                <Form.Control type="number" min={0} step={1} inputMode="numeric" {...field('lowStockThreshold')} />
                <Form.Control.Feedback type="invalid">{errors.lowStockThreshold}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col xs={12}>
              <Form.Group controlId="product-description">
                <Form.Label>Description</Form.Label>
                <Form.Control as="textarea" rows={3} maxLength={2000} {...field('description')} />
                <Form.Control.Feedback type="invalid">{errors.description}</Form.Control.Feedback>
              </Form.Group>
            </Col>
            <Col xs={12}>
              <Form.Group controlId="product-image">
                <Form.Label>Photo</Form.Label>
                <div className="d-flex flex-column flex-sm-row align-items-sm-center gap-3">
                  <ProductImage src={values.image} className="image-preview" />
                  <div className="flex-grow-1">
                    <Form.Control type="file" accept="image/*" onChange={handleImage} isInvalid={Boolean(errors.image)} />
                    <Form.Control.Feedback type="invalid">{errors.image}</Form.Control.Feedback>
                    <Form.Text>JPG or PNG. Large photos are resized automatically.</Form.Text>
                  </div>
                  {values.image && (
                    <Button variant="link" size="sm" className="text-danger p-0" onClick={() => change('image', '')}>Remove photo</Button>
                  )}
                </div>
              </Form.Group>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving && <Spinner animation="border" size="sm" className="me-2" />}
            {isNew ? 'Add to inventory' : 'Save changes'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}
