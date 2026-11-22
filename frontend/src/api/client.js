// Thin wrapper around fetch() for the Express API.
// - Base URL comes from VITE_API_URL (Netlify env var) or localhost in dev.
// - Adds the Firebase ID token as "Authorization: Bearer <token>".
// - Turns error responses into an ApiError with the server's message and
//   per-field validation errors (error.fields).
import { auth } from '../firebase'

export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '')

export class ApiError extends Error {
  constructor(status, message, fields = {}) {
    super(message)
    this.status = status
    this.fields = fields
  }
}

async function request(method, path, body) {
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const user = auth.currentUser
  if (user) headers.Authorization = `Bearer ${await user.getIdToken()}`

  let response
  try {
    response = await fetch(`${API_URL}/api${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check your connection or try again in a moment.')
  }

  if (response.status === 204) return null
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const error = data?.error || {}
    throw new ApiError(response.status, error.message || `Request failed (${response.status}).`, error.fields || {})
  }
  return data
}

function query(params = {}) {
  const search = new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined && value !== ''))
  const text = search.toString()
  return text ? `?${text}` : ''
}

export const api = {
  me: () => request('GET', '/me'),

  products: {
    list: (params) => request('GET', `/products${query(params)}`),
    create: (data) => request('POST', '/products', data),
    update: (id, data) => request('PUT', `/products/${id}`, data),
    adjustStock: (id, adjustment) => request('PATCH', `/products/${id}/stock`, { adjustment }),
    remove: (id) => request('DELETE', `/products/${id}`),
  },

  categories: {
    list: () => request('GET', '/categories'),
    create: (data) => request('POST', '/categories', data),
    update: (id, data) => request('PUT', `/categories/${id}`, data),
    remove: (id) => request('DELETE', `/categories/${id}`),
  },

  loans: {
    list: (params) => request('GET', `/loans${query(params)}`),
    create: (data) => request('POST', '/loans', data),
    setStatus: (id, status, note) => request('PATCH', `/loans/${id}/status`, { status, note }),
  },

  stats: {
    summary: () => request('GET', '/stats/summary'),
  },
}
