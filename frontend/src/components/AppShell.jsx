// Page frame for signed-in users: a responsive Bootstrap navbar (collapses
// into a menu on phones) and a content container.
import { Container, Nav, Navbar, NavDropdown, Badge } from 'react-bootstrap'
import { NavLink } from 'react-router-dom'
import Icon from './Icon.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function AppShell({ links, children }) {
  const { user, profile, logout } = useAuth()
  const name = user?.displayName || profile?.email || 'Account'

  return (
    <div className="app-shell d-flex flex-column min-vh-100">
      <a className="visually-hidden-focusable skip-link" href="#main">Skip to content</a>
      <Navbar expand="lg" variant="dark" className="app-navbar" sticky="top" collapseOnSelect>
        <Container fluid="xl">
          <Navbar.Brand as={NavLink} to={links[0].to} className="d-flex align-items-center gap-2">
            <span className="brand-mark"><Icon name="aperture" size={18} /></span>
            <span className="fw-semibold">Focus Frame</span>
            <Badge bg="light" text="dark" className="role-badge text-uppercase">{profile?.role}</Badge>
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="main-nav" />
          <Navbar.Collapse id="main-nav">
            <Nav className="me-auto">
              {links.map((link) => (
                <Nav.Link as={NavLink} to={link.to} end={link.end} key={link.to} eventKey={link.to} className="d-flex align-items-center gap-2">
                  <Icon name={link.icon} size={16} />
                  {link.label}
                  {link.badge > 0 && <Badge bg="warning" text="dark" pill>{link.badge}</Badge>}
                </Nav.Link>
              ))}
            </Nav>
            <Nav>
              <NavDropdown
                align="end"
                id="account-menu"
                title={
                  <span className="d-inline-flex align-items-center gap-2">
                    <span className="avatar">{name.charAt(0).toUpperCase()}</span>
                    <span className="text-truncate account-name d-lg-none d-xl-inline">{name}</span>
                  </span>
                }
              >
                <NavDropdown.ItemText className="small text-body-secondary">{profile?.email}</NavDropdown.ItemText>
                <NavDropdown.Divider />
                <NavDropdown.Item as="button" onClick={logout} className="d-flex align-items-center gap-2">
                  <Icon name="logout" size={16} /> Sign out
                </NavDropdown.Item>
              </NavDropdown>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      <main id="main" className="flex-grow-1 py-4">
        <Container fluid="xl">{children}</Container>
      </main>
      <footer className="app-footer py-3">
        <Container fluid="xl" className="small text-body-secondary">
          Focus Frame Studio · Equipment inventory &amp; borrowing
        </Container>
      </footer>
    </div>
  )
}
