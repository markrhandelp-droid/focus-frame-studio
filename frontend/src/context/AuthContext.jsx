// Keeps track of who is signed in.
// Firebase tells us *who* the user is; our own API (/api/me, backed by the
// MySQL users table) tells us their *role*.
import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { auth, googleProvider } from '../firebase'
import { api } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, profile: null, loading: true, error: '' })

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setState({ user: null, profile: null, loading: false, error: '' })
        return
      }
      setState((current) => ({ ...current, user: firebaseUser, loading: true }))
      try {
        const profile = await api.me()
        setState({ user: firebaseUser, profile, loading: false, error: '' })
      } catch (error) {
        setState({ user: firebaseUser, profile: null, loading: false, error: error.message })
      }
    })
  }, [])

  async function login() {
    setState((current) => ({ ...current, error: '' }))
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (error) {
      if (error.code !== 'auth/popup-closed-by-user') {
        setState((current) => ({ ...current, error: 'Google sign-in failed. Please try again.' }))
      }
    }
  }

  async function logout() {
    await signOut(auth)
  }

  return <AuthContext.Provider value={{ ...state, login, logout }}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
