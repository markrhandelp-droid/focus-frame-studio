// Shared state for every admin page: products, categories, loans and the
// summary numbers. Each action calls the API, then updates local state from
// the response, so the UI reflects the change immediately without a reload.
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from '../api/client'

const AdminDataContext = createContext(null)

export function AdminDataProvider({ children }) {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loans, setLoans] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refreshSummary = useCallback(() => api.stats.summary().then(setSummary).catch(() => {}), [])
  const refreshCategories = useCallback(() => api.categories.list().then(setCategories).catch(() => {}), [])

  // Fetch everything in parallel; state is only set in the promise callbacks.
  const load = useCallback(() => {
    let active = true
    Promise.all([api.products.list(), api.categories.list(), api.loans.list(), api.stats.summary()])
      .then(([p, c, l, s]) => {
        if (!active) return
        setProducts(p)
        setCategories(c)
        setLoans(l)
        setSummary(s)
        setError('')
      })
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  useEffect(() => load(), [load])

  // After inventory changes, category totals and dashboard numbers change too.
  const afterInventoryChange = () => {
    refreshCategories()
    refreshSummary()
  }

  const actions = {
    reload() {
      setLoading(true)
      setError('')
      load()
    },

    async saveProduct(id, data) {
      const saved = id ? await api.products.update(id, data) : await api.products.create(data)
      setProducts((list) => (id ? list.map((p) => (p.id === id ? saved : p)) : [...list, saved]))
      afterInventoryChange()
      return saved
    },

    async adjustStock(id, adjustment) {
      const saved = await api.products.adjustStock(id, adjustment)
      setProducts((list) => list.map((p) => (p.id === id ? saved : p)))
      afterInventoryChange()
      return saved
    },

    async deleteProduct(id) {
      await api.products.remove(id)
      setProducts((list) => list.filter((p) => p.id !== id))
      afterInventoryChange()
    },

    async saveCategory(id, data) {
      const saved = id ? await api.categories.update(id, data) : await api.categories.create(data)
      setCategories((list) =>
        (id ? list.map((c) => (c.id === id ? saved : c)) : [...list, saved]).sort((a, b) => a.name.localeCompare(b.name))
      )
      // A renamed category shows up on every product that uses it.
      if (id) setProducts((list) => list.map((p) => (p.categoryId === id ? { ...p, category: saved.name } : p)))
      refreshSummary()
      return saved
    },

    async deleteCategory(id) {
      await api.categories.remove(id)
      setCategories((list) => list.filter((c) => c.id !== id))
      refreshSummary()
    },

    async setLoanStatus(id, status, note) {
      const saved = await api.loans.setStatus(id, status, note)
      setLoans((list) => list.map((loan) => (loan.id === id ? saved : loan)))
      // Approving/returning changes the product's stock; patch it in place.
      setProducts((list) =>
        list.map((p) =>
          p.id === saved.productId
            ? {
                ...p,
                stock: saved.productStock,
                unitsOnLoan: p.unitsOnLoan + (status === 'approved' ? saved.quantity : status === 'returned' ? -saved.quantity : 0),
                pendingRequests: Math.max(0, p.pendingRequests - (['approved', 'rejected', 'cancelled'].includes(status) ? 1 : 0)),
              }
            : p
        )
      )
      afterInventoryChange()
      return saved
    },
  }

  return (
    <AdminDataContext.Provider value={{ products, categories, loans, summary, loading, error, ...actions }}>
      {children}
    </AdminDataContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAdminData() {
  return useContext(AdminDataContext)
}
