import { useState } from 'react'
import { Alert, Button, Card, Col, Row } from 'react-bootstrap'
import { Link, useOutletContext } from 'react-router-dom'
import ConfirmDialog from '../../components/ConfirmDialog.jsx'
import LoanList from '../../components/LoanList.jsx'
import { EmptyState, PageHeader, StatCard } from '../../components/ui.jsx'
import { useToast } from '../../context/ToastContext.jsx'

export default function MyLoansPage() {
  const { loans, cancelLoan } = useOutletContext()
  const notify = useToast()
  const [cancelling, setCancelling] = useState(null)

  const pending = loans.filter((l) => l.status === 'pending').length
  const active = loans.filter((l) => l.status === 'approved').length
  const overdue = loans.filter((l) => l.isOverdue)
  const withNotes = loans.filter((l) => l.adminNote && (l.status === 'approved' || l.status === 'rejected'))

  async function confirmCancel() {
    try {
      await cancelLoan(cancelling.id)
      notify('Request cancelled.')
    } catch (error) {
      notify(error.message, 'danger')
    }
    setCancelling(null)
  }

  return (
    <>
      <PageHeader eyebrow="Student" title="My loans" subtitle="Track your requests and return dates."
        actions={<Button as={Link} to="/student" variant="outline-secondary">Browse catalog</Button>} />

      <Row xs={3} className="g-2 g-md-3 mb-4">
        <Col><StatCard label="Pending" value={pending} icon="clock" tone={pending ? 'warn' : 'neutral'} /></Col>
        <Col><StatCard label="Borrowed" value={active} icon="loan" /></Col>
        <Col><StatCard label="Overdue" value={overdue.length} icon="alert" tone={overdue.length ? 'danger' : 'good'} /></Col>
      </Row>

      {overdue.length > 0 && (
        <Alert variant="danger">
          Please return {overdue.map((l) => l.productName).join(', ')} to the studio as soon as possible.
        </Alert>
      )}

      {withNotes.slice(0, 3).map((loan) => (
        <Alert key={loan.id} variant={loan.status === 'rejected' ? 'secondary' : 'info'} className="py-2 small">
          <strong>{loan.productName}:</strong> {loan.adminNote}
        </Alert>
      ))}

      <Card>
        {loans.length === 0 ? (
          <EmptyState icon="loan" title="No loans yet" action={<Button as={Link} to="/student" size="sm">Find equipment</Button>}>
            Requests you send from the catalog show up here.
          </EmptyState>
        ) : (
          <div className="p-2 p-lg-0">
            <LoanList
              loans={loans}
              actionsFor={(loan) => (loan.status === 'pending' ? [{ status: 'cancelled', label: 'Cancel', variant: 'outline-danger' }] : [])}
              onAction={(loan) => setCancelling(loan)}
            />
          </div>
        )}
      </Card>

      <ConfirmDialog show={Boolean(cancelling)} title="Cancel this request?" confirmLabel="Cancel request" onConfirm={confirmCancel} onCancel={() => setCancelling(null)}>
        <p className="mb-0">Your request for <strong>{cancelling?.productName}</strong> will be withdrawn.</p>
      </ConfirmDialog>
    </>
  )
}
