import { useState } from 'react'
import { Button, Card, Col, ListGroup, Row } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import Icon from '../../components/Icon.jsx'
import { EmptyState, PageHeader, ProductImage, StatCard, StockBadge } from '../../components/ui.jsx'
import LoanStatusDialog from './LoanStatusDialog.jsx'
import { useAdminData } from '../../context/AdminDataContext.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { dueText, formatDate, money, number } from '../../utils/format'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function OverviewPage() {
  const { summary, products, loans } = useAdminData()
  const { user } = useAuth()
  const [pendingAction, setPendingAction] = useState(null)

  const firstName = user?.displayName?.split(' ')[0] || 'Admin'
  const lowStock = products.filter((p) => p.isLowStock).sort((a, b) => a.stock - b.stock).slice(0, 6)
  const pending = loans.filter((loan) => loan.status === 'pending').slice(0, 5)
  const overdue = loans.filter((loan) => loan.isOverdue)
  const { inventory, loans: loanStats } = summary

  return (
    <>
      <PageHeader
        eyebrow={new Intl.DateTimeFormat('en-PH', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())}
        title={`${greeting()}, ${firstName}.`}
        subtitle="Here's what's happening in the equipment room."
        actions={
          <Button as={Link} to="/admin/inventory" variant="primary" className="d-inline-flex align-items-center gap-2">
            <Icon name="inventory" size={16} /> Manage inventory
          </Button>
        }
      />

      <Row xs={2} lg={4} className="g-3 mb-4">
        <Col><StatCard label="Equipment items" value={number.format(inventory.products)} note={`${number.format(inventory.units)} units on the shelf`} icon="camera" /></Col>
        <Col><StatCard label="Inventory value" value={money.format(inventory.value)} note="Price × units in stock" icon="reports" /></Col>
        <Col><StatCard label="Pending requests" value={loanStats.pending} note="Waiting for approval" icon="clock" tone={loanStats.pending ? 'warn' : 'neutral'} /></Col>
        <Col><StatCard label="On loan" value={loanStats.active} note={loanStats.overdue ? `${loanStats.overdue} overdue` : 'None overdue'} icon="loan" tone={loanStats.overdue ? 'danger' : 'good'} /></Col>
      </Row>

      <Row className="g-4">
        <Col lg={7}>
          <Card className="h-100">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h2 className="h6 mb-0">Borrow requests</h2>
              <Link to="/admin/loans" className="small">View all loans</Link>
            </Card.Header>
            {pending.length === 0 ? (
              <EmptyState icon="check" title="No pending requests">New student requests will appear here.</EmptyState>
            ) : (
              <ListGroup variant="flush">
                {pending.map((loan) => (
                  <ListGroup.Item key={loan.id} className="d-flex flex-column flex-sm-row gap-2 align-items-sm-center">
                    <div className="d-flex gap-2 align-items-center flex-grow-1 min-w-0">
                      <ProductImage src={loan.productImage} className="thumb" />
                      <div className="min-w-0">
                        <div className="fw-semibold text-truncate">{loan.productName} × {loan.quantity}</div>
                        <div className="small text-body-secondary text-truncate">{loan.borrowerName || loan.borrowerEmail} · return by {formatDate(loan.dueDate)}</div>
                      </div>
                    </div>
                    <div className="d-flex gap-2">
                      <Button size="sm" variant="success" onClick={() => setPendingAction({ loan, status: 'approved' })}>Approve</Button>
                      <Button size="sm" variant="outline-secondary" onClick={() => setPendingAction({ loan, status: 'rejected' })}>Reject</Button>
                    </div>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            )}
          </Card>
        </Col>

        <Col lg={5}>
          <Card className="h-100">
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h2 className="h6 mb-0">Low-stock watch</h2>
              <Link to="/admin/inventory?stock=low" className="small">See all {inventory.lowStock}</Link>
            </Card.Header>
            {lowStock.length === 0 ? (
              <EmptyState icon="check" title="All stocked up" />
            ) : (
              <ListGroup variant="flush">
                {lowStock.map((product) => (
                  <ListGroup.Item key={product.id} className="d-flex align-items-center gap-2">
                    <ProductImage src={product.image} className="thumb" />
                    <div className="flex-grow-1 min-w-0">
                      <div className="fw-medium text-truncate">{product.name}</div>
                      <div className="small text-body-secondary">{product.category}</div>
                    </div>
                    <div className="text-end">
                      <StockBadge product={product} />
                      <div className="small text-body-secondary">{product.stock} left</div>
                    </div>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            )}
          </Card>
        </Col>

        {overdue.length > 0 && (
          <Col xs={12}>
            <Card border="danger">
              <Card.Header className="bg-danger-subtle text-danger-emphasis d-flex align-items-center gap-2">
                <Icon name="alert" size={16} /> <h2 className="h6 mb-0">Overdue returns ({overdue.length})</h2>
              </Card.Header>
              <ListGroup variant="flush">
                {overdue.map((loan) => (
                  <ListGroup.Item key={loan.id} className="d-flex flex-column flex-sm-row justify-content-between gap-2 align-items-sm-center">
                    <span>
                      <span className="fw-semibold">{loan.productName}</span>
                      <span className="text-body-secondary"> — {loan.borrowerName || loan.borrowerEmail}</span>
                    </span>
                    <span className="d-flex align-items-center gap-2">
                      <span className="small text-danger fw-semibold">{dueText(loan)}</span>
                      <Button size="sm" variant="outline-primary" onClick={() => setPendingAction({ loan, status: 'returned' })}>Mark returned</Button>
                    </span>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </Card>
          </Col>
        )}
      </Row>

      {pendingAction && <LoanStatusDialog {...pendingAction} onClose={() => setPendingAction(null)} />}
    </>
  )
}
