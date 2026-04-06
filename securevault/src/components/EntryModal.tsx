import { useState, useMemo } from "react";
import { useVaultStore } from "@stores/vaultStore";
import { X, Eye, EyeOff, Check, AlertCircle, Zap } from "lucide-react";

interface Props {
  onClose: () => void;
  onSave: () => void;
}

interface FormData {
  title: string;
  username: string;
  email: string;
  password: string;
  url: string;
  category: string;
  notes: string;
  tags: string;
}

interface FormErrors {
  title?: string;
  password?: string;
  category?: string;
}

const CATEGORIES = [
  { value: "login", label: "Login", icon: "👤" },
  { value: "email", label: "Email Account", icon: "📧" },
  { value: "banking", label: "Banking", icon: "🏦" },
  { value: "social", label: "Social Media", icon: "👥" },
  { value: "work", label: "Work", icon: "💼" },
  { value: "shopping", label: "Shopping", icon: "🛍️" },
  { value: "gaming", label: "Gaming", icon: "🎮" },
  { value: "other", label: "Other", icon: "📦" },
];

export default function EntryModal({ onClose, onSave }: Props) {
  const { addEntry } = useVaultStore();

  const [formData, setFormData] = useState<FormData>({
    title: "",
    username: "",
    email: "",
    password: "",
    url: "",
    category: "login",
    notes: "",
    tags: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate password strength
  const passwordStrength = useMemo(() => {
    const pwd = formData.password;
    if (!pwd) return { score: 0, label: "No password", color: "bg-slate-300" };

    let score = 0;
    if (pwd.length >= 8) score += 15;
    if (pwd.length >= 12) score += 15;
    if (pwd.length >= 16) score += 10;
    if (/[a-z]/.test(pwd)) score += 15;
    if (/[A-Z]/.test(pwd)) score += 15;
    if (/[0-9]/.test(pwd)) score += 15;
    if (/[^a-zA-Z0-9]/.test(pwd)) score += 20;

    if (score <= 20)
      return { score, label: "Very Weak", color: "bg-danger-500" };
    if (score <= 40) return { score, label: "Weak", color: "bg-danger-400" };
    if (score <= 60) return { score, label: "Fair", color: "bg-warning-500" };
    if (score <= 80) return { score, label: "Good", color: "bg-primary-500" };
    return { score: 100, label: "Strong", color: "bg-success-500" };
  }, [formData.password]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }

    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 300));

      addEntry({
        title: formData.title.trim(),
        username: formData.username.trim(),
        password: formData.password,
        url: formData.url.trim(),
        category: formData.category,
        notes: formData.notes.trim(),
        tags: formData.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        isFavorite: false,
        lastModifiedBy: "user",
        passwordStrength: passwordStrength.score,
      });

      onSave();
    } catch (error) {
      console.error("Failed to create entry:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const generatePassword = () => {
    const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lowercase = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";
    const allChars = uppercase + lowercase + numbers + symbols;

    let password = "";
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    for (let i = password.length; i < 16; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle password
    password = password
      .split("")
      .sort(() => Math.random() - 0.5)
      .join("");

    setFormData((prev) => ({ ...prev, password }));
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field if user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Create New Entry
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Add a new password to your vault
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex-shrink-0"
            disabled={isSubmitting}
            title="Close modal"
          >
            <X size={24} className="text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Title Field */}
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
            >
              Title <span className="text-danger-500">*</span>
            </label>
            <input
              type="text"
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange("title", e.target.value)}
              placeholder="e.g., Gmail Account"
              className={`input-field ${errors.title ? "border-danger-500 focus:ring-danger-500/20" : ""}`}
              disabled={isSubmitting}
            />
            {errors.title && (
              <p className="text-sm text-danger-600 dark:text-danger-400 mt-2 flex items-center gap-1">
                <AlertCircle size={16} />
                {errors.title}
              </p>
            )}
          </div>

          {/* Category Selection */}
          <div>
            <label
              htmlFor="category"
              className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
            >
              Category
            </label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => handleInputChange("category", e.target.value)}
              className="input-field"
              disabled={isSubmitting}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.icon} {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
              >
                Username
              </label>
              <input
                type="text"
                id="username"
                value={formData.username}
                onChange={(e) => handleInputChange("username", e.target.value)}
                placeholder="your.email@example.com"
                className="input-field"
                disabled={isSubmitting}
                autoComplete="username"
              />
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                placeholder="your@email.com"
                className="input-field"
                disabled={isSubmitting}
                autoComplete="email"
              />
            </div>
          </div>

          {/* Website URL */}
          <div>
            <label
              htmlFor="url"
              className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
            >
              Website URL
            </label>
            <input
              type="url"
              id="url"
              value={formData.url}
              onChange={(e) => handleInputChange("url", e.target.value)}
              placeholder="https://example.com"
              className="input-field"
              disabled={isSubmitting}
            />
          </div>

          {/* Password Field with Generator */}
          <div>
            <div className="flex items-end justify-between mb-2">
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-slate-700"
              >
                Password <span className="text-danger-500">*</span>
              </label>
              <button
                type="button"
                onClick={generatePassword}
                className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1 px-3 py-1 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded transition-colors"
                disabled={isSubmitting}
                title="Generate secure password"
              >
                <Zap size={14} />
                Generate
              </button>
            </div>
            <div className="relative mb-3">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                placeholder="Enter or generate a password"
                className={`input-field pr-10 ${errors.password ? "border-danger-500 focus:ring-danger-500/20" : ""}`}
                disabled={isSubmitting}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 transition-colors"
                tabIndex={-1}
                disabled={isSubmitting}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* Error Message */}
            {errors.password && (
              <p className="text-sm text-danger-600 dark:text-danger-400 mb-3 flex items-center gap-1">
                <AlertCircle size={16} />
                {errors.password}
              </p>
            )}

            {/* Password Strength Indicator */}
            {formData.password && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                    Strength
                  </span>
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded ${
                      passwordStrength.score <= 20
                        ? "bg-danger-50 dark:bg-danger-900/20 text-danger-600 dark:text-danger-400"
                        : passwordStrength.score <= 40
                          ? "bg-danger-50 dark:bg-danger-900/20 text-danger-600 dark:text-danger-400"
                          : passwordStrength.score <= 60
                            ? "bg-warning-50 dark:bg-warning-900/20 text-warning-600 dark:text-warning-400"
                            : passwordStrength.score <= 80
                              ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
                              : "bg-success-50 dark:bg-success-900/20 text-success-600 dark:text-success-400"
                    }`}
                  >
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="flex gap-1 h-2">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className={`flex-1 rounded-full transition-all duration-300 ${
                        i < passwordStrength.score / 20
                          ? passwordStrength.color
                          : "bg-slate-200 dark:bg-slate-700"
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="notes"
              className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
            >
              Notes
            </label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              placeholder="Add any notes or additional information (optional)"
              className="input-field resize-none"
              rows={3}
              disabled={isSubmitting}
            />
          </div>

          {/* Tags */}
          <div>
            <label
              htmlFor="tags"
              className="block text-sm font-semibold text-slate-700 mb-2"
            >
              Tags
            </label>
            <input
              type="text"
              id="tags"
              value={formData.tags}
              onChange={(e) => handleInputChange("tags", e.target.value)}
              placeholder="work, important, 2fa (comma-separated)"
              className="input-field"
              disabled={isSubmitting}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Separate tags with commas for easy organization and searching
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-6 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 btn-outline"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.title || !formData.password}
              className="flex-1 btn-primary flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check size={20} />
                  Create Entry
                </>
              )}
            </button>
          </div>
        </form>

        {/* Footer Info */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-700 border-t border-slate-200 dark:border-slate-600 rounded-b-2xl">
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            💡 <strong>Security Tip:</strong> Use unique, strong passwords for
            each account. Consider using the password generator above to create
            strong, random passwords.
          </p>
        </div>
      </div>
    </div>
  );
}
