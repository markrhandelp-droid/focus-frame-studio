// Loans as a table on laptops/desktops and as stacked cards on phones/tablets.
// `actionsFor(loan)` returns the buttons each row should offer.
import { Button, Card, Table } from 'react-bootstrap'
import { LoanBadge, ProductImage } from './ui.jsx'
import { dueText, formatDate, formatDateTime } from '../utils/format'

function Actions({ loan, actionsFor, onAction, size = 'sm' }) {
  return actionsFor(loan).map((action) => (
    <Button key={action.status} size={size} variant={action.variant} onClick={() => onAction(loan, action)}>
      {action.label}
    </Button>
  ))
}

export default function LoanList({ loans, showBorrower = false, actionsFor = () => [], onAction }) {
  return (
    <>
      <div className="d-none d-lg-block">
        <Table responsive hover className="align-middle mb-0 data-table">
          <thead>
            <tr>
              <th scope="col">Equipment</th>
              {showBorrower && <th scope="col">Borrower</th>}
              <th scope="col" className="text-center">Qty</th>
              <th scope="col" className="d-none d-xl-table-cell">Requested</th>
              <th scope="col">Return by</th>
              <th scope="col">Status</th>
              <th scope="col" className="text-end"><span className="visually-hidden">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {loans.map((loan) => (
              <tr key={loan.id} className={loan.isOverdue ? 'table-danger-subtle' : undefined}>
                <td>
                  <div className="d-flex align-items-center gap-2">
                    <ProductImage src={loan.productImage} className="thumb" />
                    <div className="min-w-0">
                      <div className="fw-semibold text-truncate">{loan.productName}</div>
                      <div className="small text-body-secondary text-truncate">{loan.purpose || loan.category}</div>
                    </div>
                  </div>
                </td>
                {showBorrower && (
                  <td>
                    <div className="fw-medium">{loan.borrowerName || '—'}</div>
                    <div className="small text-body-secondary">{loan.borrowerEmail}</div>
                  </td>
                )}
                <td className="text-center">{loan.quantity}</td>
                <td className="small d-none d-xl-table-cell">{formatDateTime(loan.requestedAt)}</td>
                <td className="small">
                  <div>{formatDate(loan.dueDate)}</div>
                  {loan.status === 'approved' && (
                    <div className={loan.isOverdue ? 'text-danger fw-semibold' : 'text-body-secondary'}>{dueText(loan)}</div>
                  )}
                </td>
                <td><LoanBadge loan={loan} /></td>
                <td className="text-end text-nowrap">
                  <div className="d-inline-flex gap-1 justify-content-end">
                    <Actions loan={loan} actionsFor={actionsFor} onAction={onAction} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      <div className="d-lg-none d-grid gap-2">
        {loans.map((loan) => (
          <Card key={loan.id} className={loan.isOverdue ? 'border-danger' : ''}>
            <Card.Body className="p-3">
              <div className="d-flex gap-3">
                <ProductImage src={loan.productImage} className="thumb" />
                <div className="flex-grow-1 min-w-0">
                  <div className="d-flex justify-content-between gap-2">
                    <span className="fw-semibold text-truncate">{loan.productName}</span>
                    <LoanBadge loan={loan} />
                  </div>
                  {showBorrower && <div className="small">{loan.borrowerName || loan.borrowerEmail}</div>}
                  <div className="small text-body-secondary">
                    Qty {loan.quantity} · {loan.status === 'approved' ? dueText(loan) : `Return by ${formatDate(loan.dueDate)}`}
                  </div>
                  {loan.purpose && <div className="small text-body-secondary text-truncate">{loan.purpose}</div>}
                </div>
              </div>
              {actionsFor(loan).length > 0 && (
                <div className="d-flex gap-2 mt-3">
                  <Actions loan={loan} actionsFor={actionsFor} onAction={onAction} />
                </div>
              )}
            </Card.Body>
          </Card>
        ))}
      </div>
    </>
  )
}
