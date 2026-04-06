import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface VaultEntry {
  id: string
  title: string
  username: string
  password: string
  url: string
  category: string
  notes: string
  tags: string[]
  isFavorite: boolean
  createdAt: number
  updatedAt: number
  passwordStrength: number
  lastModifiedBy: string
}

export interface VaultState {
  // Auth state
  isAuthenticated: boolean
  isInitialized: boolean
  masterPassword: string | null

  // Vault data
  entries: VaultEntry[]
  selectedCategory: string
  searchQuery: string

  // UI state
  isLoading: boolean
  error: string | null
  selectedEntryId: string | null

  // Actions
  initializeVault: () => void
  setMasterPassword: (password: string) => void
  authenticate: (password: string) => Promise<boolean>
  logout: () => void
  addEntry: (entry: Omit<VaultEntry, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateEntry: (id: string, updates: Partial<VaultEntry>) => void
  deleteEntry: (id: string) => void
  toggleFavorite: (id: string) => void
  setSelectedCategory: (category: string) => void
  setSearchQuery: (query: string) => void
  setSelectedEntry: (id: string | null) => void
  clearError: () => void
  setError: (error: string) => void
  getFilteredEntries: () => VaultEntry[]
  exportVault: () => string
  importVault: (data: string) => Promise<boolean>
}

const STORAGE_KEY = 'vaultmaster_vault'
const PASSWORD_KEY = 'vaultmaster_pwd'

export const useVaultStore = create<VaultState>()(
  persist(
    (set, get) => ({
      // Initial state
      isAuthenticated: false,
      isInitialized: false,
      masterPassword: null,
      entries: [],
      selectedCategory: 'All',
      searchQuery: '',
      isLoading: false,
      error: null,
      selectedEntryId: null,

      // Actions
      initializeVault: () => {
        set({ isInitialized: true })
        const stored = localStorage.getItem(PASSWORD_KEY)
        if (stored) {
          set({ masterPassword: stored })
        }
      },

      setMasterPassword: (password: string) => {
        set({ masterPassword: password })
        localStorage.setItem(PASSWORD_KEY, password)
      },

      authenticate: async (password: string) => {
        const { masterPassword } = get()
        if (!masterPassword) {
          // First time setup
          get().setMasterPassword(password)
          set({ isAuthenticated: true })
          return true
        }

        // Verify password
        const isValid = password === masterPassword
        if (isValid) {
          set({ isAuthenticated: true })
        } else {
          set({ error: 'Invalid master password' })
        }
        return isValid
      },

      logout: () => {
        set({
          isAuthenticated: false,
          selectedEntryId: null,
          searchQuery: '',
        })
      },

      addEntry: (entry) => {
        const newEntry: VaultEntry = {
          ...entry,
          id: crypto.randomUUID(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        set((state) => ({
          entries: [...state.entries, newEntry],
        }))
      },

      updateEntry: (id: string, updates: Partial<VaultEntry>) => {
        set((state) => ({
          entries: state.entries.map((entry) =>
            entry.id === id
              ? { ...entry, ...updates, updatedAt: Date.now() }
              : entry,
          ),
        }))
      },

      deleteEntry: (id: string) => {
        set((state) => ({
          entries: state.entries.filter((entry) => entry.id !== id),
          selectedEntryId: state.selectedEntryId === id ? null : state.selectedEntryId,
        }))
      },

      toggleFavorite: (id: string) => {
        set((state) => ({
          entries: state.entries.map((entry) =>
            entry.id === id
              ? { ...entry, isFavorite: !entry.isFavorite, updatedAt: Date.now() }
              : entry,
          ),
        }))
      },

      setSelectedCategory: (category: string) => {
        set({ selectedCategory: category, searchQuery: '' })
      },

      setSearchQuery: (query: string) => {
        set({ searchQuery: query })
      },

      setSelectedEntry: (id: string | null) => {
        set({ selectedEntryId: id })
      },

      clearError: () => {
        set({ error: null })
      },

      setError: (error: string) => {
        set({ error })
        setTimeout(() => set({ error: null }), 5000)
      },

      getFilteredEntries: () => {
        const { entries, selectedCategory, searchQuery } = get()
        let filtered = entries

        // Filter by category
        if (selectedCategory !== 'All') {
          if (selectedCategory === 'Favorites') {
            filtered = filtered.filter((e) => e.isFavorite)
          } else {
            filtered = filtered.filter((e) => e.category === selectedCategory)
          }
        }

        // Filter by search query
        if (searchQuery) {
          const query = searchQuery.toLowerCase()
          filtered = filtered.filter(
            (e) =>
              e.title.toLowerCase().includes(query) ||
              e.username.toLowerCase().includes(query) ||
              e.url.toLowerCase().includes(query) ||
              e.tags.some((tag) => tag.toLowerCase().includes(query)),
          )
        }

        return filtered.sort((a, b) => b.updatedAt - a.updatedAt)
      },

      exportVault: () => {
        const { entries, masterPassword } = get()
        const vaultData = {
          version: 1,
          exportedAt: new Date().toISOString(),
          entriesCount: entries.length,
          entries: entries.map((e) => ({
            ...e,
            // In production, encrypt sensitive data
            password: Buffer.from(e.password).toString('base64'),
          })),
        }
        return JSON.stringify(vaultData, null, 2)
      },

      importVault: async (data: string) => {
        try {
          const vaultData = JSON.parse(data)

          if (!vaultData.entries || !Array.isArray(vaultData.entries)) {
            throw new Error('Invalid vault format')
          }

          const importedEntries = vaultData.entries.map((e: any) => ({
            ...e,
            id: crypto.randomUUID(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            // Decode password from import
            password: Buffer.from(e.password, 'base64').toString(),
          }))

          set((state) => ({
            entries: [...state.entries, ...importedEntries],
          }))

          get().setError(`Successfully imported ${importedEntries.length} entries`)
          return true
        } catch (error) {
          get().setError(`Failed to import vault: ${error}`)
          return false
        }
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        entries: state.entries,
        masterPassword: state.masterPassword,
      }),
    },
  ),
)
