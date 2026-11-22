// Formatting helpers and status metadata shared by many components.

export const money = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 })
export const number = new Intl.NumberFormat('en-PH')

const dateFormat = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
const dateTimeFormat = new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

export function formatDate(value) {
  if (!value) return '—'
  // "YYYY-MM-DD" strings are calendar dates; parse them as local dates.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value)
  return dateFormat.format(date)
}

export function formatDateTime(value) {
  return value ? dateTimeFormat.format(new Date(value)) : '—'
}

// Local calendar date as YYYY-MM-DD, offset by N days.
export function isoDate(offsetDays = 0) {
  const date = new Date()
  date.setDate(date.getDate() + offsetDays)
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function stockStatus(product) {
  if (product.stock <= 0) return { label: 'Out of stock', bg: 'danger' }
  if (product.stock <= product.lowStockThreshold) return { label: 'Low stock', bg: 'warning' }
  return { label: 'In stock', bg: 'success' }
}

export const LOAN_STATUS = {
  pending: { label: 'Pending', bg: 'warning' },
  approved: { label: 'On loan', bg: 'primary' },
  overdue: { label: 'Overdue', bg: 'danger' },
  returned: { label: 'Returned', bg: 'success' },
  rejected: { label: 'Rejected', bg: 'secondary' },
  cancelled: { label: 'Cancelled', bg: 'secondary' },
}

export function loanStatus(loan) {
  return loan.isOverdue ? LOAN_STATUS.overdue : LOAN_STATUS[loan.status]
}

export function dueText(loan) {
  if (loan.status !== 'approved') return formatDate(loan.dueDate)
  if (loan.daysUntilDue < 0) return `${-loan.daysUntilDue} day(s) overdue`
  if (loan.daysUntilDue === 0) return 'Due today'
  return `Due in ${loan.daysUntilDue} day(s)`
}
