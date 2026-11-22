import { useMemo, useState } from 'react'
import { Card, Form, InputGroup, Nav, Badge } from 'react-bootstrap'
import Icon from '../../components/Icon.jsx'
import LoanList from '../../components/LoanList.jsx'
import { EmptyState, PageHeader } from '../../components/ui.jsx'
import LoanStatusDialog from './LoanStatusDialog.jsx'
import { useAdminData } from '../../context/AdminDataContext.jsx'

const FILTERS = [
  ['pending', 'Pending', (l) => l.status === 'pending'],
  ['active', 'On loan', (l) => l.status === 'approved'],
  ['overdue', 'Overdue', (l) => l.isOverdue],
  ['returned', 'Returned', (l) => l.status === 'returned'],
  ['closed', 'Rejected / cancelled', (l) => l.status === 'rejected' || l.status === 'cancelled'],
  ['all', 'All', () => true],
]

function actionsFor(loan) {
  if (loan.status === 'pending')
    return [
      { status: 'approved', label: 'Approve', variant: 'success' },
      { status: 'rejected', label: 'Reject', variant: 'outline-secondary' },
    ]
  if (loan.status === 'approved') return [{ status: 'returned', label: 'Mark returned', variant: 'outline-primary' }]
  return []
}

export default function LoansPage() {
  const { loans } = useAdminData()
  const [filter, setFilter] = useState('pending')
  const [search, setSearch] = useState('')
  const [action, setAction] = useState(null)

  const counts = useMemo(() => Object.fromEntries(FILTERS.map(([key, , test]) => [key, loans.filter(test).length])), [loans])
  const visible = useMemo(() => {
    const test = FILTERS.find(([key]) => key === filter)[2]
    const term = search.trim().toLowerCase()
    return loans.filter(test).filter((l) => !term || `${l.productName} ${l.borrowerName} ${l.borrowerEmail} ${l.purpose}`.toLowerCase().includes(term))
  }, [loans, filter, search])

  return (
    <>
      <PageHeader eyebrow="Borrowing" title="Equipment loans" subtitle="Approve requests, track who has what, and record returns." />

      <Card>
        <Card.Header className="bg-transparent">
          <div className="d-flex flex-column flex-lg-row gap-2 justify-content-between align-items-lg-center">
            <Nav variant="pills" className="loan-filters flex-nowrap overflow-auto" activeKey={filter} onSelect={(key) => setFilter(key)}>
              {FILTERS.map(([key, label]) => (
                <Nav.Item key={key}>
                  <Nav.Link eventKey={key} className="text-nowrap">
                    {label} <Badge bg={key === 'overdue' && counts[key] ? 'danger' : 'secondary'} pill className="ms-1">{counts[key]}</Badge>
                  </Nav.Link>
                </Nav.Item>
              ))}
            </Nav>
            <InputGroup className="loan-search">
              <InputGroup.Text><Icon name="search" size={16} /></InputGroup.Text>
              <Form.Control type="search" placeholder="Search borrower or item" aria-label="Search loans" value={search} onChange={(event) => setSearch(event.target.value)} />
            </InputGroup>
          </div>
        </Card.Header>
        <Card.Body className="p-0 p-md-0">
          {visible.length === 0 ? (
            <EmptyState icon="loan" title="Nothing here">No loans match this filter.</EmptyState>
          ) : (
            <div className="p-2 p-lg-0">
              <LoanList loans={visible} showBorrower actionsFor={actionsFor} onAction={(loan, a) => setAction({ loan, status: a.status })} />
            </div>
          )}
        </Card.Body>
      </Card>

      {action && <LoanStatusDialog {...action} onClose={() => setAction(null)} />}
    </>
  )
}
