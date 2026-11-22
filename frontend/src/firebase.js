// Firebase web config. These values identify the Firebase project and are
// meant to be public (security comes from Firebase Auth + the API checking
// ID tokens). They can be overridden with VITE_FIREBASE_* variables.
import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

const env = import.meta.env

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyDL5x90_e5-jnOVQJb0I3663_mwaif2FaM',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'focus-frame-studio.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'focus-frame-studio',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'focus-frame-studio.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '77287753660',
  appId: env.VITE_FIREBASE_APP_ID || '1:77287753660:web:bfd2585498c35266644db9',
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })
