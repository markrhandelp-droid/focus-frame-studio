import { Alert, Button, Card, Col, Container, Row, Spinner } from 'react-bootstrap'
import Icon from '../components/Icon.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function LoginPage() {
  const { login, error, loading, user } = useAuth()
  const busy = loading && Boolean(user)

  return (
    <div className="login-page min-vh-100 d-flex">
      <Container fluid className="p-0">
        <Row className="g-0 min-vh-100">
          <Col lg={6} className="login-brand d-flex flex-column justify-content-between p-4 p-md-5">
            <div className="d-flex align-items-center gap-2">
              <span className="brand-mark"><Icon name="aperture" size={22} /></span>
              <span className="fw-semibold">Focus Frame Studio</span>
            </div>
            <div className="my-5 my-lg-0">
              <h1 className="display-6 fw-semibold mb-3">Equipment, perfectly in focus.</h1>
              <p className="lead mb-4 opacity-75">Track every camera, lens and light — and lend them out without the spreadsheet.</p>
              <ul className="list-unstyled d-grid gap-2 mb-0 login-points">
                <li><Icon name="camera" /> Live catalog backed by MySQL</li>
                <li><Icon name="loan" /> Borrow requests with approval and return tracking</li>
                <li><Icon name="alert" /> Low-stock and overdue alerts</li>
              </ul>
            </div>
            <span className="small opacity-50 d-none d-lg-block">© {new Date().getFullYear()} Focus Frame Studio</span>
          </Col>
          <Col lg={6} className="d-flex align-items-center justify-content-center p-4">
            <Card className="login-card w-100 border-0 shadow-sm">
              <Card.Body className="p-4 p-md-5">
                <p className="eyebrow mb-1">Secure access</p>
                <h2 className="h3 mb-2">Welcome back</h2>
                <p className="text-body-secondary mb-4">Sign in with your Google account to continue.</p>
                {error && <Alert variant="danger" className="py-2 small">{error}</Alert>}
                <Button size="lg" className="w-100 d-inline-flex align-items-center justify-content-center gap-2" onClick={login} disabled={busy}>
                  {busy ? <Spinner animation="border" size="sm" /> : null}
                  Continue with Google <Icon name="arrowRight" size={18} />
                </Button>
                <p className="small text-body-secondary mt-4 mb-0">Students can browse and borrow. Studio admins manage inventory and approve loans.</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  )
}
