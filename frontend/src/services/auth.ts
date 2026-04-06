import {
  createUserWithEmailAndPassword,
  type AuthError,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth'

import { auth } from '../lib/firebase'

export const signUp = async (email: string, password: string) => {
  return createUserWithEmailAndPassword(auth, email, password)
}

export const signIn = async (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password)
}

export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider()
  return signInWithPopup(auth, provider)
}

export const logout = async () => {
  return signOut(auth)
}

export const getAuthErrorMessage = (
  error: unknown,
  options?: { hostname?: string },
) => {
  const code = (error as AuthError | undefined)?.code
  const activeHostname =
    options?.hostname ??
    (typeof window !== 'undefined' ? window.location.hostname : 'unknown-host')

  switch (code) {
    case 'auth/configuration-not-found':
      return 'Google sign-in is not configured in Firebase yet. Use email/password for now, or enable Google provider in Firebase Console.'
    case 'auth/unauthorized-domain':
      return `Google sign-in is blocked for this host: ${activeHostname}. Add this exact hostname in Firebase Console > Authentication > Settings > Authorized domains.`
    case 'auth/operation-not-allowed':
      return 'This sign-in method is currently disabled in Firebase. Enable Email/Password and/or Google in Firebase Console > Authentication > Sign-in method.'
    case 'auth/invalid-credential':
      return 'Invalid email or password.'
    case 'auth/user-not-found':
      return 'No account found with this email.'
    case 'auth/wrong-password':
      return 'Incorrect password.'
    case 'auth/email-already-in-use':
      return 'This email is already in use.'
    case 'auth/weak-password':
      return 'Password is too weak. Use at least 6 characters.'
    case 'auth/popup-closed-by-user':
      return 'Google sign-in popup was closed before completing authentication.'
    default:
      return error instanceof Error ? error.message : 'Authentication failed. Please try again.'
  }
}
