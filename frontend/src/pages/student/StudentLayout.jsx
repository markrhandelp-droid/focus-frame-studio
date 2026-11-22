// Loads the catalog and the student's own loans once, shares them with the
// catalog and "My loans" pages, and keeps both in sync after each action.
import { useCallback, useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Alert, Button } from 'react-bootstrap'
import AppShell from '../../components/AppShell.jsx'
import { Loading } from '../../components/ui.jsx'
import { api } from '../../api/client'

export default function StudentLayout() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    let active = true
    Promise.all([api.products.list(), api.categories.list(), api.loans.list()])
      .then(([p, c, l]) => {
        if (!active) return
        setProducts(p)
        setCategories(c)
        setLoans(l)
        setError('')
      })
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  useEffect(() => load(), [load])

  function retry() {
    setLoading(true)
    setError('')
    load()
  }

  const actions = {
    async requestLoan(data) {
      const loan = await api.loans.create(data)
      setLoans((list) => [loan, ...list])
      setProducts((list) => list.map((p) => (p.id === loan.productId ? { ...p, pendingRequests: p.pendingRequests + 1 } : p)))
      return loan
    },
    async cancelLoan(id) {
      const loan = await api.loans.setStatus(id, 'cancelled')
      setLoans((list) => list.map((l) => (l.id === id ? loan : l)))
      return loan
    },
  }

  const active = loans.filter((l) => l.status === 'pending' || l.status === 'approved').length
  const links = [
    { to: '/student', label: 'Catalog', icon: 'camera', end: true },
    { to: '/student/loans', label: 'My loans', icon: 'loan', badge: active },
  ]

  return (
    <AppShell links={links}>
      {error ? (
        <Alert variant="danger" className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-2">
          <span>Could not load the catalog: {error}</span>
          <Button variant="outline-danger" size="sm" onClick={retry}>Try again</Button>
        </Alert>
      ) : loading ? (
        <Loading label="Loading catalog…" />
      ) : (
        <Outlet context={{ products, categories, loans, ...actions }} />
      )}
    </AppShell>
  )
}
