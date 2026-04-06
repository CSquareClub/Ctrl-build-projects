import { useEffect } from 'react'
import { useVaultStore } from '@stores/vaultStore'
import AuthLayout from '@layouts/AuthLayout'
import DashboardLayout from '@layouts/DashboardLayout'

function App() {
  const { isInitialized, isAuthenticated, initializeVault } = useVaultStore()

  useEffect(() => {
    initializeVault()
  }, [initializeVault])

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary-50 to-slate-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading VaultMaster...</p>
        </div>
      </div>
    )
  }

  return isAuthenticated ? <DashboardLayout /> : <AuthLayout />
}

export default App
