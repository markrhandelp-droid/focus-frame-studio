import { useMemo, useState } from 'react'
import { Button, Card, Col, Form, InputGroup, Row } from 'react-bootstrap'
import { useOutletContext } from 'react-router-dom'
import Icon from '../../components/Icon.jsx'
import BorrowModal from '../../components/BorrowModal.jsx'
import { EmptyState, PageHeader, ProductImage, StockBadge } from '../../components/ui.jsx'
import { useToast } from '../../context/ToastContext.jsx'
import { formatDate, money } from '../../utils/format'

export default function CatalogPage() {
  const { products, categories, loans, requestLoan } = useOutletContext()
  const notify = useToast()
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [availableOnly, setAvailableOnly] = useState(false)
  const [sort, setSort] = useState('name')
  const [borrowing, setBorrowing] = useState(null)

  const pendingByProduct = useMemo(() => new Set(loans.filter((l) => l.status === 'pending').map((l) => l.productId)), [loans])

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    return products
      .filter((p) => !categoryId || String(p.categoryId) === categoryId)
      .filter((p) => !availableOnly || p.stock > 0)
      .filter((p) => !term || `${p.name} ${p.category} ${p.description || ''}`.toLowerCase().includes(term))
      .sort((a, b) => (sort === 'price_asc' ? a.price - b.price : sort === 'price_desc' ? b.price - a.price : sort === 'stock' ? b.stock - a.stock : a.name.localeCompare(b.name)))
  }, [products, search, categoryId, availableOnly, sort])

  async function submitLoan(data) {
    const loan = await requestLoan(data)
    notify(`Request sent for ${loan.productName}. Return by ${formatDate(loan.dueDate)} once approved.`)
    setBorrowing(null)
  }

  return (
    <>
      <PageHeader eyebrow="Student" title="Equipment catalog" subtitle="Browse the studio's gear and request what you need for your next shoot." />

      <div className="catalog-filters mb-3">
        <Row className="g-2 align-items-center">
          <Col xs={12} md={5}>
            <InputGroup>
              <InputGroup.Text><Icon name="search" size={16} /></InputGroup.Text>
              <Form.Control type="search" placeholder="Search equipment" aria-label="Search equipment" value={search} onChange={(event) => setSearch(event.target.value)} />
            </InputGroup>
          </Col>
          <Col xs={6} md={3}>
            <Form.Select aria-label="Sort" value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="name">Sort: Name</option>
              <option value="stock">Most available</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
            </Form.Select>
          </Col>
          <Col xs={6} md={4}>
            <Form.Check type="switch" id="available-only" label="Available now only" checked={availableOnly} onChange={(event) => setAvailableOnly(event.target.checked)} />
          </Col>
        </Row>
        <div className="d-flex gap-2 mt-3 overflow-auto pb-1 chip-row" role="group" aria-label="Filter by category">
          <Button size="sm" variant={categoryId === '' ? 'dark' : 'outline-secondary'} className="rounded-pill text-nowrap" onClick={() => setCategoryId('')} aria-pressed={categoryId === ''}>All</Button>
          {categories.filter((c) => c.productCount > 0).map((c) => (
            <Button key={c.id} size="sm" variant={categoryId === String(c.id) ? 'dark' : 'outline-secondary'} className="rounded-pill text-nowrap"
              onClick={() => setCategoryId(String(c.id))} aria-pressed={categoryId === String(c.id)}>
              {c.name}
            </Button>
          ))}
        </div>
      </div>

      <p className="small text-body-secondary" aria-live="polite">{visible.length} item{visible.length === 1 ? '' : 's'} shown</p>

      {visible.length === 0 ? (
        <Card><EmptyState title="No equipment matches">Try another search or category.</EmptyState></Card>
      ) : (
        <Row xs={1} sm={2} lg={3} xxl={4} className="g-3">
          {visible.map((product) => {
            const pending = pendingByProduct.has(product.id)
            return (
              <Col key={product.id}>
                <Card className="product-card h-100">
                  <div className="product-card-media">
                    <ProductImage src={product.image} alt={product.name} />
                    <span className="product-card-badge"><StockBadge product={product} /></span>
                  </div>
                  <Card.Body className="d-flex flex-column">
                    <span className="eyebrow mb-1">{product.category}</span>
                    <Card.Title as="h2" className="h6">{product.name}</Card.Title>
                    {product.description && <Card.Text className="small text-body-secondary clamp-2">{product.description}</Card.Text>}
                    <div className="d-flex justify-content-between align-items-center mt-auto pt-2">
                      <span className="fw-semibold">{money.format(product.price)}</span>
                      <span className="small text-body-secondary">{product.stock} available</span>
                    </div>
                  </Card.Body>
                  <Card.Footer className="bg-transparent border-0 pt-0">
                    <Button className="w-100" variant={pending ? 'outline-secondary' : 'primary'} disabled={product.stock === 0 || pending} onClick={() => setBorrowing(product)}>
                      {pending ? 'Request pending' : product.stock === 0 ? 'Unavailable' : 'Request to borrow'}
                    </Button>
                  </Card.Footer>
                </Card>
              </Col>
            )
          })}
        </Row>
      )}

      {borrowing && <BorrowModal product={borrowing} onSubmit={submitLoan} onClose={() => setBorrowing(null)} />}
    </>
  )
}
