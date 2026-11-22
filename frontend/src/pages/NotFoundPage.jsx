import { Button, Container } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import Icon from '../components/Icon.jsx'

export default function NotFoundPage({ title = 'Page not found', message = "The page you're looking for doesn't exist or was moved." }) {
  return (
    <Container className="min-vh-100 d-flex flex-column align-items-center justify-content-center text-center py-5">
      <span className="brand-mark brand-mark-lg mb-4"><Icon name="aperture" size={28} /></span>
      <h1 className="h3">{title}</h1>
      <p className="text-body-secondary mb-4">{message}</p>
      <Button as={Link} to="/">Go to dashboard</Button>
    </Container>
  )
}
