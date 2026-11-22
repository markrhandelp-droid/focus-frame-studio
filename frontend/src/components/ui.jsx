// Small presentational components reused across pages.
import { useState } from 'react'
import { Badge, Card, Spinner } from 'react-bootstrap'
import Icon from './Icon.jsx'
import { loanStatus, stockStatus } from '../utils/format'

export function StatCard({ label, value, note, icon, tone = 'neutral' }) {
  return (
    <Card className={`stat-card h-100 tone-${tone}`}>
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start mb-2">
          <span className="stat-label">{label}</span>
          {icon && (
            <span className="stat-icon">
              <Icon name={icon} size={16} />
            </span>
          )}
        </div>
        <div className="stat-value">{value}</div>
        {note && <div className="stat-note">{note}</div>}
      </Card.Body>
    </Card>
  )
}

export function StockBadge({ product }) {
  const status = stockStatus(product)
  return (
    <Badge bg={status.bg} text={status.bg === 'warning' ? 'dark' : undefined} pill>
      {status.label}
    </Badge>
  )
}

export function LoanBadge({ loan }) {
  const status = loanStatus(loan)
  return (
    <Badge bg={status.bg} text={status.bg === 'warning' ? 'dark' : undefined} pill>
      {status.label}
    </Badge>
  )
}

export function ProductImage({ src, alt = '', className = '' }) {
  const [failed, setFailed] = useState(false)
  if (!src || failed) {
    return (
      <span className={`product-image placeholder-image ${className}`} aria-hidden={!alt} role={alt ? 'img' : undefined} aria-label={alt || undefined}>
        <Icon name="camera" size={22} />
      </span>
    )
  }
  return <img className={`product-image ${className}`} src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />
}

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="d-flex align-items-center justify-content-center gap-2 py-5 text-body-secondary" role="status">
      <Spinner animation="border" size="sm" />
      <span>{label}</span>
    </div>
  )
}

export function EmptyState({ icon = 'search', title, children, action }) {
  return (
    <div className="empty-state text-center py-5 px-3">
      <span className="empty-icon mb-3">
        <Icon name={icon} size={22} />
      </span>
      <h3 className="h6 mb-1">{title}</h3>
      {children && <p className="text-body-secondary small mb-3">{children}</p>}
      {action}
    </div>
  )
}

export function PageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <div className="page-header d-flex flex-column flex-md-row align-items-md-end justify-content-between gap-3 mb-4">
      <div>
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h1 className="h3 mb-1">{title}</h1>
        {subtitle && <p className="text-body-secondary mb-0">{subtitle}</p>}
      </div>
      {actions && <div className="d-flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}
