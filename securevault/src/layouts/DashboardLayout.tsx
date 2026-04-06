import { useState, useMemo } from "react";
import { useVaultStore } from "@stores/vaultStore";
import { Menu, X, Search, Plus, Settings, LogOut } from "lucide-react";
import Sidebar from "@components/Sidebar";
import VaultGrid from "@components/VaultGrid";
import EntryModal from "@components/EntryModal";
import DarkModeToggle from "@components/DarkModeToggle";

interface DashboardStats {
  totalEntries: number;
  favoritesCount: number;
  categoriesCount: number;
  lastModified: string;
}

export default function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showNewEntry, setShowNewEntry] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const { entries, selectedCategory, setSelectedCategory, logout } =
    useVaultStore();

  // Calculate statistics
  const stats: DashboardStats = useMemo(() => {
    const categories = new Set(entries.map((e) => e.category));
    const favorites = entries.filter((e) => e.isFavorite);
    const mostRecent =
      entries.length > 0
        ? new Date(entries[0].updatedAt).toLocaleDateString()
        : "Never";

    return {
      totalEntries: entries.length,
      favoritesCount: favorites.length,
      categoriesCount: categories.size,
      lastModified: mostRecent,
    };
  }, [entries]);

  const entriesByCategory = useMemo(() => {
    return entries.reduce(
      (acc, entry) => {
        acc[entry.category] = (acc[entry.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [entries]);

  const filteredEntries = useMemo(() => {
    let filtered = entries;

    // Filter by category
    if (selectedCategory !== "All") {
      if (selectedCategory === "Favorites") {
        filtered = filtered.filter((e) => e.isFavorite);
      } else {
        filtered = filtered.filter((e) => e.category === selectedCategory);
      }
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.title.toLowerCase().includes(query) ||
          e.username.toLowerCase().includes(query) ||
          e.url.toLowerCase().includes(query) ||
          e.tags.some((tag) => tag.toLowerCase().includes(query)),
      );
    }

    return filtered;
  }, [entries, selectedCategory, searchQuery]);

  const handleLogout = () => {
    if (
      confirm(
        "Are you sure you want to lock the vault? You'll need to enter your password to access it again.",
      )
    ) {
      logout();
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">
      {/* Sidebar Overlay - Mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 md:hidden z-30 animate-fade-in"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        entriesByCategory={entriesByCategory}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden dark:bg-slate-900">
        {/* Header */}
        <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-20 shadow-sm">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            {/* Left: Menu & Search */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="md:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0"
                aria-label="Toggle sidebar"
              >
                {isSidebarOpen ? (
                  <X size={24} className="dark:text-slate-100" />
                ) : (
                  <Menu size={24} className="dark:text-slate-100" />
                )}
              </button>

              <div className="flex-1 max-w-md min-w-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search passwords..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-field pl-10 bg-slate-50 dark:bg-slate-700 focus:bg-white dark:bg-slate-700 dark:focus:bg-slate-600 dark:focus:bg-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2 ml-4 flex-shrink-0">
              <button
                onClick={() => setShowNewEntry(true)}
                className="btn-primary"
              >
                <Plus size={20} />
                <span className="hidden sm:inline">New</span>
              </button>

              <DarkModeToggle />

              <div className="relative">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  aria-label="Settings"
                >
                  <Settings
                    size={24}
                    className="text-slate-600 dark:text-slate-300"
                  />
                </button>

                {/* Settings Dropdown */}
                {showSettings && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 animate-scale-in z-30">
                    <button className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      ⚙️ Preferences
                    </button>
                    <button className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      📥 Import
                    </button>
                    <button className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      📤 Export
                    </button>
                    <div className="border-t border-slate-200 dark:border-slate-700 my-1" />
                    <button className="w-full text-left px-4 py-2 hover:bg-danger-50 dark:hover:bg-slate-700 transition-colors text-sm text-danger-600 flex items-center gap-2">
                      🔓 Lock Vault
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={handleLogout}
                className="p-2 hover:bg-danger-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                aria-label="Logout"
              >
                <LogOut
                  size={24}
                  className="text-slate-600 dark:text-slate-300 hover:text-danger-600"
                />
              </button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950">
          <div className="container-safe py-8">
            {/* Header Section */}
            <div className="mb-8 animate-fade-in">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">
                {selectedCategory === "All"
                  ? "All Passwords"
                  : selectedCategory === "Favorites"
                    ? "⭐ Favorites"
                    : selectedCategory}
              </h1>
              <p className="text-slate-500 dark:text-slate-400">
                {filteredEntries.length} of {stats.totalEntries} entries
              </p>
            </div>

            {/* Stats Grid */}
            {selectedCategory === "All" && filteredEntries.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="card p-4">
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                    Total Entries
                  </p>
                  <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                    {stats.totalEntries}
                  </p>
                </div>
                <div className="card p-4">
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                    Favorites
                  </p>
                  <p className="text-3xl font-bold text-warning-600 dark:text-warning-400">
                    {stats.favoritesCount}
                  </p>
                </div>
                <div className="card p-4">
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                    Categories
                  </p>
                  <p className="text-3xl font-bold text-secondary-600 dark:text-secondary-400">
                    {stats.categoriesCount}
                  </p>
                </div>
                <div className="card p-4">
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                    Last Update
                  </p>
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {stats.lastModified}
                  </p>
                </div>
              </div>
            )}

            {/* Empty State */}
            {filteredEntries.length === 0 ? (
              <div className="text-center py-16 animate-fade-in">
                <div className="text-6xl mb-4">
                  {searchQuery
                    ? "🔍"
                    : selectedCategory === "Favorites"
                      ? "⭐"
                      : "🔐"}
                </div>
                <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  {searchQuery
                    ? "No results found"
                    : selectedCategory === "Favorites"
                      ? "No favorites yet"
                      : "No passwords yet"}
                </h3>
                <p className="text-slate-500 dark:text-slate-400">
                  {searchQuery
                    ? `Try searching with different keywords`
                    : `${selectedCategory === "Favorites" ? "Mark some entries as favorites" : "Create your first secure entry"}`}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => setShowNewEntry(true)}
                    className="btn-primary"
                  >
                    <Plus size={20} />
                    Create Entry
                  </button>
                )}
              </div>
            ) : (
              <VaultGrid searchQuery={searchQuery} />
            )}
          </div>
        </main>
      </div>

      {/* Entry Modal */}
      {showNewEntry && (
        <EntryModal
          onClose={() => setShowNewEntry(false)}
          onSave={() => setShowNewEntry(false)}
        />
      )}
    </div>
  );
}
