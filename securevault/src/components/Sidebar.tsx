import { useVaultStore } from "@stores/vaultStore";
import {
  Heart,
  Lock,
  Download,
  Upload,
  LogOut,
  Home,
  Mail,
  Building,
  Gamepad2,
  ShoppingCart,
  Briefcase,
  Tag,
  X,
} from "lucide-react";
import { useMemo } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  entriesByCategory: Record<string, number>;
}

const CATEGORIES = [
  { name: "All", icon: Home, color: "text-slate-600" },
  { name: "Favorites", icon: Heart, color: "text-warning-500" },
  { name: "login", icon: Lock, color: "text-primary-600" },
  { name: "email", icon: Mail, color: "text-blue-500" },
  { name: "banking", icon: Building, color: "text-success-600" },
  { name: "social", icon: Gamepad2, color: "text-secondary-600" },
  { name: "shopping", icon: ShoppingCart, color: "text-warning-600" },
  { name: "work", icon: Briefcase, color: "text-slate-600" },
  { name: "gaming", icon: Gamepad2, color: "text-secondary-500" },
  { name: "other", icon: Tag, color: "text-slate-500" },
];

export default function Sidebar({
  isOpen,
  onClose,
  selectedCategory,
  onSelectCategory,
  entriesByCategory,
}: Props) {
  const { logout } = useVaultStore();

  const totalEntries = useMemo(
    () => Object.values(entriesByCategory).reduce((a, b) => a + b, 0),
    [entriesByCategory],
  );

  const handleLogout = () => {
    if (
      window.confirm(
        "Are you sure you want to lock your vault? You'll need to enter your password to access it again.",
      )
    ) {
      logout();
    }
  };

  const handleCategorySelect = (category: string) => {
    onSelectCategory(category);
    onClose();
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 md:hidden z-30 animate-fade-in"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col transition-transform duration-300 ease-out z-40 md:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              VaultMaster
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {totalEntries} {totalEntries === 1 ? "entry" : "entries"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="md:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="Close sidebar"
          >
            <X size={20} className="text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        {/* Categories */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 uppercase tracking-wider">
            Categories
          </p>

          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const count = entriesByCategory[cat.name] || 0;
            const isSelected = selectedCategory === cat.name;

            return (
              <button
                key={cat.name}
                onClick={() => handleCategorySelect(cat.name)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg font-medium transition-all duration-200 group ${
                  isSelected
                    ? "bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 border border-primary-200 dark:border-primary-800 shadow-sm"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Icon
                    size={18}
                    className={`flex-shrink-0 ${isSelected ? "text-primary-600" : cat.color}`}
                  />
                  <span className="truncate">{cat.name}</span>
                </div>

                {count > 0 && (
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ml-2 transition-colors ${
                      isSelected
                        ? "bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Actions */}
        <div className="border-t border-slate-200 dark:border-slate-700 p-3 space-y-2">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 px-4 py-2 uppercase tracking-wider">
            Actions
          </p>

          <button
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg font-medium transition-all duration-200 group"
            title="Import passwords from file"
          >
            <Download
              size={18}
              className="flex-shrink-0 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-400"
            />
            <span>Import</span>
          </button>

          <button
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg font-medium transition-all duration-200 group"
            title="Export vault to file"
          >
            <Upload
              size={18}
              className="flex-shrink-0 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-400"
            />
            <span>Export</span>
          </button>

          <div className="border-t border-slate-200 dark:border-slate-700 my-1" />

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-slate-700 rounded-lg font-medium transition-all duration-200 group"
            title="Lock your vault"
          >
            <LogOut
              size={18}
              className="flex-shrink-0 group-hover:text-danger-700 dark:group-hover:text-danger-400"
            />
            <span>Lock Vault</span>
          </button>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 dark:border-slate-700 p-4">
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center leading-relaxed">
            💡 Tip: Use keyboard shortcuts to quickly access your vault
          </p>
        </div>
      </aside>
    </>
  );
}
