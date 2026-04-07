import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import { AppRouter } from './AppRouter'
import { ThemeSync } from './components/ThemeSync'
import { AuthProvider } from './context/AuthContext'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <ThemeSync />
        <AppRouter />
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
)
