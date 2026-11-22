// App-wide success / error notifications using Bootstrap toasts.
import { createContext, useCallback, useContext, useState } from 'react'
import { Toast, ToastContainer } from 'react-bootstrap'
import Icon from '../components/Icon.jsx'

const ToastContext = createContext(() => {})

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const notify = useCallback((message, variant = 'success') => {
    const id = Date.now() + Math.random()
    setToasts((current) => [...current, { id, message, variant }])
  }, [])

  const dismiss = (id) => setToasts((current) => current.filter((toast) => toast.id !== id))

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <ToastContainer position="bottom-end" className="p-3 toast-stack" containerPosition="fixed">
        {toasts.map((toast) => (
          <Toast key={toast.id} onClose={() => dismiss(toast.id)} delay={toast.variant === 'danger' ? 7000 : 3500} autohide bg={toast.variant}>
            <Toast.Body className={`d-flex align-items-start gap-2 ${toast.variant === 'warning' ? '' : 'text-white'}`}>
              <Icon name={toast.variant === 'success' ? 'check' : 'alert'} size={18} />
              <span className="flex-grow-1" role={toast.variant === 'danger' ? 'alert' : 'status'}>{toast.message}</span>
              <button type="button" className={`btn-close ${toast.variant === 'warning' ? '' : 'btn-close-white'}`} aria-label="Dismiss" onClick={() => dismiss(toast.id)} />
            </Toast.Body>
          </Toast>
        ))}
      </ToastContainer>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  return useContext(ToastContext)
}
