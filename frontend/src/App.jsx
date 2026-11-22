// Routes and role-based guards.
//   /login            Google sign-in
//   /admin/...        admin pages (overview, inventory, categories, loans, reports)
//   /student/...      student pages (catalog, my loans)
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Alert, Button, Container } from 'react-bootstrap'
import { AuthProvider, useAuth } from './context/AuthContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import { Loading } from './components/ui.jsx'
import LoginPage from './pages/LoginPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import AdminLayout from './pages/admin/AdminLayout.jsx'
import OverviewPage from './pages/admin/OverviewPage.jsx'
import InventoryPage from './pages/admin/InventoryPage.jsx'
import CategoriesPage from './pages/admin/CategoriesPage.jsx'
import LoansPage from './pages/admin/LoansPage.jsx'
import ReportsPage from './pages/admin/ReportsPage.jsx'
import StudentLayout from './pages/student/StudentLayout.jsx'
import CatalogPage from './pages/student/CatalogPage.jsx'
import MyLoansPage from './pages/student/MyLoansPage.jsx'

const home = (profile) => (profile?.role === 'admin' ? '/admin' : '/student')

function ProfileError() {
  const { error, logout } = useAuth()
  return (
    <Container className="min-vh-100 d-flex align-items-center justify-content-center">
      <Alert variant="danger" className="w-100" style={{ maxWidth: 480 }}>
        <Alert.Heading as="h1" className="h5">We couldn't finish signing you in</Alert.Heading>
        <p className="small">{error || 'Your account profile could not be loaded from the server.'}</p>
        <Button variant="outline-danger" size="sm" onClick={logout}>Sign out and try again</Button>
      </Alert>
    </Container>
  )
}

// Wraps pages that need a signed-in user, optionally with a specific role.
function RequireRole({ role, children }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <Loading label="Checking your account…" />
  if (!user) return <Navigate to="/login" replace />
  if (!profile) return <ProfileError />
  if (role && profile.role !== role) return <Navigate to={home(profile)} replace />
  return children
}

function PublicOnly({ children }) {
  const { user, profile, loading } = useAuth()
  if (user && profile && !loading) return <Navigate to={home(profile)} replace />
  if (user && !profile && !loading) return <ProfileError />
  return children
}

function HomeRedirect() {
  const { profile } = useAuth()
  return <Navigate to={home(profile)} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
            <Route path="/" element={<RequireRole><HomeRedirect /></RequireRole>} />
            <Route path="/admin" element={<RequireRole role="admin"><AdminLayout /></RequireRole>}>
              <Route index element={<OverviewPage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route path="loans" element={<LoansPage />} />
              <Route path="reports" element={<ReportsPage />} />
            </Route>
            <Route path="/student" element={<RequireRole role="student"><StudentLayout /></RequireRole>}>
              <Route index element={<CatalogPage />} />
              <Route path="loans" element={<MyLoansPage />} />
            </Route>
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}
