// Equipment CRUD: search/filter/sort, add, edit, adjust stock, delete, CSV.
import { useMemo, useState } from 'react'
import { Button, ButtonGroup, Card, Col, Form, InputGroup, Row, Table, Modal, Alert, Spinner } from 'react-bootstrap'
import { useSearchParams } from 'react-router-dom'
import Icon from '../../components/Icon.jsx'
import ConfirmDialog from '../../components/ConfirmDialog.jsx'
import ProductFormModal from '../../components/ProductFormModal.jsx'
import { EmptyState, PageHeader, ProductImage, StockBadge } from '../../components/ui.jsx'
import { useAdminData } from '../../context/AdminDataContext.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { money } from '../../utils/format'

const SORTS = {
  name: (a, b) => a.name.localeCompare(b.name),
  stock_asc: (a, b) => a.stock - b.stock || a.name.localeCompare(b.name),
  price_desc: (a, b) => b.price - a.price,
  price_asc: (a, b) => a.price - b.price,
  newest: (a, b) => b.id - a.id,
}

function StockAdjustModal({ product, onClose }) {
  const { adjustStock } = useAdminData()
  const notify = useToast()
  const [mode, setMode] = useState('add')
  const [amount, setAmount] = useState('1')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const qty = Number(amount)
  const invalid = !Number.isInteger(qty) || qty < 1 || (mode === 'remove' && qty > product.stock)

  async function submit(event) {
    event.preventDefault()
    if (invalid) return
    setBusy(true)
    try {
      const saved = await adjustStock(product.id, mode === 'add' ? qty : -qty)
      notify(`${product.name}: stock is now ${saved.stock}.`)
      onClose()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <Modal show onHide={busy ? undefined : onClose} centered size="sm">
      <Form noValidate onSubmit={submit}>
        <Modal.Header closeButton={!busy}>
          <Modal.Title as="h2" className="h6 mb-0">Adjust stock</Modal.Title>
        </Modal.Header>
        <Modal.Body className="d-grid gap-3">
          <div className="small"><strong>{product.name}</strong><br />Currently {product.stock} unit(s) on the shelf.</div>
          {error && <Alert variant="danger" className="py-2 mb-0">{error}</Alert>}
          <ButtonGroup className="w-100">
            <Button variant={mode === 'add' ? 'success' : 'outline-success'} onClick={() => setMode('add')}>Restock</Button>
            <Button variant={mode === 'remove' ? 'danger' : 'outline-danger'} onClick={() => setMode('remove')}>Write off</Button>
          </ButtonGroup>
          <Form.Group controlId="adjust-amount">
            <Form.Label>Units to {mode === 'add' ? 'add' : 'remove'}</Form.Label>
            <Form.Control type="number" min={1} step={1} value={amount} onChange={(event) => setAmount(event.target.value)} isInvalid={invalid} autoFocus />
            <Form.Control.Feedback type="invalid">
              {mode === 'remove' && qty > product.stock ? `Only ${product.stock} in stock.` : 'Enter a whole number of at least 1.'}
            </Form.Control.Feedback>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button type="submit" disabled={busy || invalid}>
            {busy && <Spinner animation="border" size="sm" className="me-2" />}Save
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  )
}

export default function InventoryPage() {
  const { products, categories, saveProduct, deleteProduct } = useAdminData()
  const notify = useToast()
  const [params, setParams] = useSearchParams()
  const [editing, setEditing] = useState(null)
  const [adjusting, setAdjusting] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const search = params.get('q') || ''
  const categoryId = params.get('category') || ''
  const stock = params.get('stock') || ''
  const sort = params.get('sort') || 'name'

  function setFilter(key, value) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const list = useMemo(() => {
    const term = search.trim().toLowerCase()
    return products
      .filter((p) => !categoryId || String(p.categoryId) === categoryId)
      .filter((p) => !stock || (stock === 'low' ? p.isLowStock : stock === 'out' ? p.stock === 0 : !p.isLowStock))
      .filter((p) => !term || `${p.name} ${p.category} ${p.description || ''}`.toLowerCase().includes(term))
      .sort(SORTS[sort] || SORTS.name)
  }, [products, search, categoryId, stock, sort])

  async function handleSave(data) {
    const saved = await saveProduct(editing.id, data)
    notify(editing.id ? `Saved changes to ${saved.name}.` : `${saved.name} added to inventory.`)
    setEditing(null)
  }

  async function handleDelete() {
    try {
      await deleteProduct(deleting.id)
      notify(`${deleting.name} deleted.`)
    } catch (error) {
      notify(error.message, 'danger')
    }
    setDeleting(null)
  }

  function exportCsv() {
    const rows = [['SKU', 'Name', 'Category', 'Stock', 'On loan', 'Unit price', 'Stock value']]
    list.forEach((p) => rows.push([`SKU-${String(p.id).padStart(4, '0')}`, p.name, p.category, p.stock, p.unitsOnLoan, p.price, p.price * p.stock]))
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    link.download = 'focus-frame-inventory.csv'
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const filtersActive = search || categoryId || stock || sort !== 'name'
  const rowActions = (product) => (
    <>
      <Button size="sm" variant="outline-secondary" onClick={() => setAdjusting(product)} aria-label={`Adjust stock of ${product.name}`} title="Adjust stock">
        <Icon name="plus" size={14} /><span className="d-none d-xxl-inline ms-1">Stock</span>
      </Button>
      <Button size="sm" variant="outline-primary" onClick={() => setEditing(product)} aria-label={`Edit ${product.name}`} title="Edit">
        <Icon name="edit" size={14} /><span className="d-none d-xxl-inline ms-1">Edit</span>
      </Button>
      <Button size="sm" variant="outline-danger" onClick={() => setDeleting(product)} aria-label={`Delete ${product.name}`} title="Delete">
        <Icon name="trash" size={14} />
      </Button>
    </>
  )

  return (
    <>
      <PageHeader
        eyebrow="Inventory"
        title="Equipment inventory"
        subtitle={`${products.length} items across ${categories.length} categories`}
        actions={
          <>
            <Button variant="outline-secondary" onClick={exportCsv} className="d-inline-flex align-items-center gap-2">
              <Icon name="download" size={16} /> Export CSV
            </Button>
            <Button onClick={() => setEditing({})} className="d-inline-flex align-items-center gap-2" disabled={!categories.length}>
              <Icon name="plus" size={16} /> Add equipment
            </Button>
          </>
        }
      />

      <Card className="mb-3">
        <Card.Body>
          <Row className="g-2">
            <Col xs={12} lg={4}>
              <InputGroup>
                <InputGroup.Text><Icon name="search" size={16} /></InputGroup.Text>
                <Form.Control type="search" placeholder="Search name, category, description" aria-label="Search equipment"
                  value={search} onChange={(event) => setFilter('q', event.target.value)} />
              </InputGroup>
            </Col>
            <Col xs={6} md={4} lg={3}>
              <Form.Select aria-label="Category" value={categoryId} onChange={(event) => setFilter('category', event.target.value)}>
                <option value="">All categories</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Form.Select>
            </Col>
            <Col xs={6} md={4} lg={2}>
              <Form.Select aria-label="Stock level" value={stock} onChange={(event) => setFilter('stock', event.target.value)}>
                <option value="">All stock</option>
                <option value="low">Low stock</option>
                <option value="out">Out of stock</option>
                <option value="healthy">Healthy</option>
              </Form.Select>
            </Col>
            <Col xs={8} md={3} lg={2}>
              <Form.Select aria-label="Sort by" value={sort} onChange={(event) => setFilter('sort', event.target.value === 'name' ? '' : event.target.value)}>
                <option value="name">Sort: Name</option>
                <option value="stock_asc">Sort: Lowest stock</option>
                <option value="price_desc">Sort: Price high–low</option>
                <option value="price_asc">Sort: Price low–high</option>
                <option value="newest">Sort: Newest</option>
              </Form.Select>
            </Col>
            <Col xs={4} md={1} className="d-grid">
              <Button variant="link" disabled={!filtersActive} onClick={() => setParams({}, { replace: true })}>Clear</Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <p className="small text-body-secondary mb-2" aria-live="polite">{list.length} result{list.length === 1 ? '' : 's'}</p>

      {list.length === 0 ? (
        <Card><EmptyState title="No equipment found" action={filtersActive && <Button variant="outline-secondary" size="sm" onClick={() => setParams({})}>Clear filters</Button>}>Try a different search or filter.</EmptyState></Card>
      ) : (
        <>
          <Card className="d-none d-md-block">
            <Table responsive hover className="align-middle mb-0 data-table">
              <thead>
                <tr>
                  <th scope="col">Equipment</th>
                  <th scope="col" className="d-none d-lg-table-cell">Category</th>
                  <th scope="col">Stock</th>
                  <th scope="col" className="text-center d-none d-lg-table-cell">On loan</th>
                  <th scope="col" className="text-end">Unit price</th>
                  <th scope="col" className="text-end"><span className="visually-hidden">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {list.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <ProductImage src={product.image} className="thumb" />
                        <div className="min-w-0">
                          <div className="fw-semibold text-truncate product-name">{product.name}</div>
                          <div className="small text-body-secondary">SKU-{String(product.id).padStart(4, '0')}<span className="d-lg-none"> · {product.category}</span></div>
                        </div>
                      </div>
                    </td>
                    <td className="d-none d-lg-table-cell"><span className="badge text-bg-light border">{product.category}</span></td>
                    <td>
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        <span className="fw-semibold">{product.stock}</span>
                        <StockBadge product={product} />
                      </div>
                    </td>
                    <td className="text-center d-none d-lg-table-cell">
                      {product.unitsOnLoan || '—'}
                      {product.pendingRequests > 0 && <div className="small text-warning-emphasis">{product.pendingRequests} pending</div>}
                    </td>
                    <td className="text-end">{money.format(product.price)}</td>
                    <td className="text-end text-nowrap"><div className="d-inline-flex gap-1">{rowActions(product)}</div></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card>

          <div className="d-md-none d-grid gap-2">
            {list.map((product) => (
              <Card key={product.id}>
                <Card.Body className="p-3">
                  <div className="d-flex gap-3">
                    <ProductImage src={product.image} className="thumb-lg" />
                    <div className="flex-grow-1 min-w-0">
                      <div className="fw-semibold">{product.name}</div>
                      <div className="small text-body-secondary">{product.category} · {money.format(product.price)}</div>
                      <div className="d-flex align-items-center gap-2 mt-1">
                        <StockBadge product={product} /><span className="small">{product.stock} units</span>
                      </div>
                    </div>
                  </div>
                  <div className="d-flex gap-2 mt-3 mobile-actions">{rowActions(product)}</div>
                </Card.Body>
              </Card>
            ))}
          </div>
        </>
      )}

      {editing && <ProductFormModal product={editing} categories={categories} onSave={handleSave} onClose={() => setEditing(null)} />}
      {adjusting && <StockAdjustModal product={adjusting} onClose={() => setAdjusting(null)} />}
      <ConfirmDialog show={Boolean(deleting)} title="Delete equipment?" confirmLabel="Delete" onConfirm={handleDelete} onCancel={() => setDeleting(null)}>
        <p className="mb-0">
          <strong>{deleting?.name}</strong> will be permanently removed from the database. Items that have loan history can't be deleted — set their stock to 0 instead.
        </p>
      </ConfirmDialog>
    </>
  )
}
