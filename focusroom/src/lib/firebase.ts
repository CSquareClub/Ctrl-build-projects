import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyD-7vt3xanEyXGLzs6kDC6Sz_7xiHwSPio',
  authDomain: 'focusroom-9cfdb.firebaseapp.com',
  projectId: 'focusroom-9cfdb',
  storageBucket: 'focusroom-9cfdb.firebasestorage.app',
  messagingSenderId: '132664214538',
  appId: '1:132664214538:web:8564df644cdf5263820bf3',
  measurementId: 'G-9507NK2N0D',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
