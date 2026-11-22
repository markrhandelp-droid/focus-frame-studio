// Read-only reports built from /api/stats/summary (SQL aggregates + JOINs).
import { Card, Col, ListGroup, ProgressBar, Row, Table } from 'react-bootstrap'
import { EmptyState, PageHeader, StatCard } from '../../components/ui.jsx'
import { useAdminData } from '../../context/AdminDataContext.jsx'
import { formatDateTime, money, number } from '../../utils/format'

export default function ReportsPage() {
  const { summary } = useAdminData()
  const { inventory, loans, byCategory, topBorrowed, topBorrowers } = summary
  const healthy = inventory.products - inventory.lowStock
  const healthPct = Math.round((healthy / Math.max(inventory.products, 1)) * 100)
  const maxUnits = Math.max(...byCategory.map((c) => c.units), 1)
  const totalValue = Math.max(inventory.value, 1)

  return (
    <>
      <PageHeader eyebrow="Reports" title="Inventory & loan reports" subtitle={`Updated ${formatDateTime(summary.generatedAt)}`} />

      <Row xs={2} lg={4} className="g-3 mb-4">
        <Col><StatCard label="Stock health" value={`${healthPct}%`} note={`${healthy} of ${inventory.products} items healthy`} icon="check" tone={healthPct >= 80 ? 'good' : 'warn'} /></Col>
        <Col><StatCard label="Out of stock" value={inventory.outOfStock} note={`${inventory.lowStock} at or below alert level`} icon="alert" tone={inventory.outOfStock ? 'danger' : 'neutral'} /></Col>
        <Col><StatCard label="Units on loan" value={loans.unitsOnLoan} note={`${loans.active} active loan(s)`} icon="loan" /></Col>
        <Col><StatCard label="Returned this month" value={loans.returnedThisMonth} note={`${loans.total} loans all-time`} icon="refresh" /></Col>
      </Row>

      <Row className="g-4">
        <Col lg={7}>
          <Card className="h-100">
            <Card.Header><h2 className="h6 mb-0">Stock by category</h2></Card.Header>
            <Card.Body className="d-grid gap-3">
              {byCategory.map((category) => (
                <div key={category.id}>
                  <div className="d-flex justify-content-between small mb-1">
                    <span className="fw-medium">{category.name}</span>
                    <span className="text-body-secondary">{number.format(category.units)} units · {category.products} items</span>
                  </div>
                  <ProgressBar now={(category.units / maxUnits) * 100} variant={category.lowStock ? 'warning' : 'primary'} aria-label={`${category.name}: ${category.units} units`} style={{ height: 10 }} />
                </div>
              ))}
            </Card.Body>
          </Card>
        </Col>

        <Col lg={5}>
          <Card className="h-100">
            <Card.Header><h2 className="h6 mb-0">Value by category</h2></Card.Header>
            <Table responsive className="mb-0 align-middle small">
              <thead><tr><th scope="col">Category</th><th scope="col" className="text-end">Value</th><th scope="col" className="text-end">Share</th></tr></thead>
              <tbody>
                {[...byCategory].sort((a, b) => b.value - a.value).map((category) => (
                  <tr key={category.id}>
                    <td>{category.name}</td>
                    <td className="text-end">{money.format(category.value)}</td>
                    <td className="text-end">{Math.round((category.value / totalValue) * 100)}%</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr className="fw-semibold"><td>Total</td><td className="text-end">{money.format(inventory.value)}</td><td /></tr></tfoot>
            </Table>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="h-100">
            <Card.Header><h2 className="h6 mb-0">Most borrowed equipment</h2></Card.Header>
            {topBorrowed.length === 0 ? <EmptyState icon="loan" title="No loans yet" /> : (
              <ListGroup variant="flush" as="ol" numbered>
                {topBorrowed.map((item) => (
                  <ListGroup.Item as="li" key={item.id} className="d-flex justify-content-between align-items-start">
                    <div className="ms-2 me-auto">
                      <div className="fw-medium">{item.name}</div>
                      <div className="small text-body-secondary">{item.category}</div>
                    </div>
                    <span className="small text-nowrap">{item.loans} loan(s)</span>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            )}
          </Card>
        </Col>

        <Col md={6}>
          <Card className="h-100">
            <Card.Header><h2 className="h6 mb-0">Most active borrowers</h2></Card.Header>
            {topBorrowers.length === 0 ? <EmptyState icon="user" title="No borrowers yet" /> : (
              <ListGroup variant="flush" as="ol" numbered>
                {topBorrowers.map((person) => (
                  <ListGroup.Item as="li" key={person.id} className="d-flex justify-content-between align-items-start">
                    <div className="ms-2 me-auto min-w-0">
                      <div className="fw-medium">{person.name || person.email}</div>
                      <div className="small text-body-secondary text-truncate">{person.email}</div>
                    </div>
                    <span className="small text-nowrap">
                      {person.loans} loan(s){person.overdue > 0 && <span className="text-danger"> · {person.overdue} overdue</span>}
                    </span>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            )}
          </Card>
        </Col>
      </Row>
    </>
  )
}
