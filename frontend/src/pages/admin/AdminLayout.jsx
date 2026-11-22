import { Outlet } from 'react-router-dom'
import { Alert, Button } from 'react-bootstrap'
import AppShell from '../../components/AppShell.jsx'
import { Loading } from '../../components/ui.jsx'
import { AdminDataProvider, useAdminData } from '../../context/AdminDataContext.jsx'

function AdminFrame() {
  const { summary, loading, error, reload } = useAdminData()
  const links = [
    { to: '/admin', label: 'Overview', icon: 'overview', end: true },
    { to: '/admin/inventory', label: 'Inventory', icon: 'inventory', badge: summary?.inventory.lowStock },
    { to: '/admin/categories', label: 'Categories', icon: 'tag' },
    { to: '/admin/loans', label: 'Loans', icon: 'loan', badge: summary?.loans.pending },
    { to: '/admin/reports', label: 'Reports', icon: 'reports' },
  ]

  return (
    <AppShell links={links}>
      {error ? (
        <Alert variant="danger" className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-2">
          <span>Could not load studio data: {error}</span>
          <Button variant="outline-danger" size="sm" onClick={reload}>Try again</Button>
        </Alert>
      ) : loading ? (
        <Loading label="Loading studio data…" />
      ) : (
        <Outlet />
      )}
    </AppShell>
  )
}

export default function AdminLayout() {
  return (
    <AdminDataProvider>
      <AdminFrame />
    </AdminDataProvider>
  )
}
