import { useVaultStore } from "@stores/vaultStore";
import {
  Star,
  Copy,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  Calendar,
  Lock,
} from "lucide-react";
import { useState } from "react";

interface Props {
  searchQuery: string;
}

export default function VaultGrid({ searchQuery }: Props) {
  const { entries, selectedCategory, toggleFavorite, deleteEntry } =
    useVaultStore();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<Set<string>>(
    new Set(),
  );

  // Filter entries by category and search
  const filtered = entries.filter((e) => {
    // Apply category filter
    if (selectedCategory !== "All") {
      if (selectedCategory === "Favorites") {
        if (!e.isFavorite) return false;
      } else if (e.category !== selectedCategory) {
        return false;
      }
    }

    // Apply search filter
    if (searchQuery === "") return true;
    const query = searchQuery.toLowerCase();
    return (
      e.title.toLowerCase().includes(query) ||
      e.username.toLowerCase().includes(query) ||
      e.url.toLowerCase().includes(query) ||
      e.tags.some((tag) => tag.toLowerCase().includes(query))
    );
  });

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const togglePasswordReveal = (id: string) => {
    setRevealedPasswords((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getPasswordStrengthColor = (strength: number): string => {
    if (strength < 30) return "bg-danger-500";
    if (strength < 50) return "bg-warning-500";
    if (strength < 70) return "bg-primary-500";
    return "bg-success-500";
  };

  const getPasswordStrengthLabel = (strength: number): string => {
    if (strength < 30) return "Weak";
    if (strength < 50) return "Fair";
    if (strength < 70) return "Good";
    return "Strong";
  };

  const getPasswordStrengthTextColor = (strength: number): string => {
    if (strength < 30) return "text-danger-600";
    if (strength < 50) return "text-warning-600";
    if (strength < 70) return "text-primary-600";
    return "text-success-600";
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
      {filtered.map((entry) => (
        <div
          key={entry.id}
          className="card dark:shadow-lg dark:shadow-slate-900/50 p-6 hover:shadow-lg transition-all duration-300 group flex flex-col overflow-hidden"
        >
          {/* Header with Title and Favorite Button */}
          <div className="flex items-start justify-between mb-4 gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-primary-600 transition-colors">
                {entry.title}
              </h3>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-full">
                  {entry.category === "login" && "👤"}
                  {entry.category === "email" && "📧"}
                  {entry.category === "banking" && "🏦"}
                  {entry.category === "social" && "👥"}
                  {entry.category === "work" && "💼"}
                  {entry.category === "shopping" && "🛍️"}
                  {entry.category === "gaming" && "🎮"}
                  {entry.category === "other" && "📦"}
                  {entry.category.charAt(0).toUpperCase() +
                    entry.category.slice(1)}
                </span>
              </div>
            </div>
            <button
              onClick={() => toggleFavorite(entry.id)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
              title={
                entry.isFavorite ? "Remove from favorites" : "Add to favorites"
              }
            >
              <Star
                size={20}
                className={
                  entry.isFavorite
                    ? "fill-warning-500 text-warning-500"
                    : "text-slate-400 hover:text-warning-500"
                }
              />
            </button>
          </div>

          {/* Password Strength Indicator */}
          <div className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Strength
              </span>
              <span
                className={`text-xs font-bold ${getPasswordStrengthTextColor(entry.passwordStrength)}`}
              >
                {getPasswordStrengthLabel(entry.passwordStrength)}
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${getPasswordStrengthColor(entry.passwordStrength)}`}
                style={{ width: `${Math.min(entry.passwordStrength, 100)}%` }}
              />
            </div>
          </div>

          {/* Username */}
          {entry.username && (
            <div className="mb-3">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1 uppercase tracking-wide">
                Username
              </p>
              <p className="font-mono text-sm text-slate-700 dark:text-slate-300 break-all line-clamp-2">
                {entry.username}
              </p>
            </div>
          )}

          {/* Password Field */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">
                Password
              </p>
              <Lock size={14} className="text-slate-400 dark:text-slate-500" />
            </div>
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden">
              <input
                type={revealedPasswords.has(entry.id) ? "text" : "password"}
                value={entry.password}
                readOnly
                className="font-mono text-sm bg-transparent text-slate-700 dark:text-slate-300 px-3 py-2 flex-1 truncate focus:outline-none"
              />
              <button
                onClick={() => togglePasswordReveal(entry.id)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors flex-shrink-0 border-l border-slate-200 dark:border-slate-600"
                title={
                  revealedPasswords.has(entry.id)
                    ? "Hide password"
                    : "Show password"
                }
              >
                {revealedPasswords.has(entry.id) ? (
                  <EyeOff
                    size={16}
                    className="text-slate-600 dark:text-slate-400"
                  />
                ) : (
                  <Eye
                    size={16}
                    className="text-slate-400 dark:text-slate-500"
                  />
                )}
              </button>
            </div>
          </div>

          {/* URL */}
          {entry.url && (
            <div className="mb-3">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1 uppercase tracking-wide">
                Website
              </p>
              <a
                href={entry.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:underline truncate block"
              >
                {new URL(entry.url).hostname}
              </a>
            </div>
          )}

          {/* Tags */}
          {entry.tags.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-2 uppercase tracking-wide">
                Tags
              </p>
              <div className="flex flex-wrap gap-1">
                {entry.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-block px-2 py-1 bg-secondary-50 dark:bg-secondary-900/20 text-secondary-700 dark:text-secondary-300 text-xs rounded font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Last Modified */}
          <div className="mb-4 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Calendar size={14} className="flex-shrink-0" />
            <span>Updated {formatDate(entry.updatedAt)}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t border-slate-200 dark:border-slate-700 mt-auto">
            <button
              onClick={() => copyToClipboard(entry.password, entry.id)}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/40 active:bg-primary-200 dark:active:bg-primary-900/60 rounded-lg font-medium transition-all duration-200 text-sm"
            >
              <Copy size={16} />
              {copiedId === entry.id ? "Copied!" : "Copy"}
            </button>
            <button
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0"
              title="Edit entry"
            >
              <Edit2 size={18} className="text-slate-600 dark:text-slate-400" />
            </button>
            <button
              onClick={() => {
                if (
                  window.confirm(
                    "Are you sure you want to delete this entry? This action cannot be undone.",
                  )
                ) {
                  deleteEntry(entry.id);
                }
              }}
              className="p-2 hover:bg-danger-50 dark:hover:bg-danger-900/20 rounded-lg transition-colors flex-shrink-0"
              title="Delete entry"
            >
              <Trash2
                size={18}
                className="text-danger-600 dark:text-danger-400"
              />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
