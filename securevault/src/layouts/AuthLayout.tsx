import { useState } from "react";
import { useVaultStore } from "@stores/vaultStore";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import DarkModeToggle from "@components/DarkModeToggle";

export default function AuthLayout() {
  const [password, setPassword] = useState("");
  const [isNewVault, setIsNewVault] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { authenticate, masterPassword } = useVaultStore();

  const hasVault = !!masterPassword;

  // Password strength calculation
  const getPasswordStrength = (
    pwd: string,
  ): { strength: number; label: string; color: string } => {
    if (!pwd) return { strength: 0, label: "", color: "" };
    let strength = 0;
    if (pwd.length >= 8) strength += 20;
    if (pwd.length >= 12) strength += 20;
    if (/[a-z]/.test(pwd)) strength += 15;
    if (/[A-Z]/.test(pwd)) strength += 15;
    if (/[0-9]/.test(pwd)) strength += 15;
    if (/[^a-zA-Z0-9]/.test(pwd)) strength += 15;

    if (strength <= 20)
      return { strength, label: "Very Weak", color: "bg-danger-500" };
    if (strength <= 40)
      return { strength, label: "Weak", color: "bg-warning-500" };
    if (strength <= 60)
      return { strength, label: "Fair", color: "bg-warning-400" };
    if (strength <= 80)
      return { strength, label: "Good", color: "bg-success-400" };
    return { strength, label: "Strong", color: "bg-success-500" };
  };

  const passwordStrength = getPasswordStrength(password);
  const confirmPasswordMatch = !isNewVault || password === confirmPassword;
  const passwordValid = password.length >= 8;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (isNewVault && password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }

      if (password.length < 8) {
        setError("Password must be at least 8 characters");
        return;
      }

      const success = await authenticate(password);
      if (!success) {
        setError("Invalid password");
      }
    } catch (err) {
      setError("Authentication failed. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-950 flex items-center justify-center px-4 py-8">
      {/* Dark Mode Toggle - Top Right */}
      <div className="absolute top-6 right-6">
        <DarkModeToggle />
      </div>

      <div className="w-full max-w-md animate-fade-in">
        {/* Logo & Title */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-700 dark:from-primary-500 dark:to-primary-600 mb-4 shadow-lg animate-scale-in">
            <Lock className="w-8 h-8 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            VaultMaster
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg">
            Secure Password Manager
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 border border-slate-200 dark:border-slate-700">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-slate-700 dark:text-slate-300"
                >
                  {isNewVault ? "Set Master Password" : "Master Password"}
                </label>
                {isNewVault && passwordValid && (
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded ${passwordStrength.color} text-white`}
                  >
                    {passwordStrength.label}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your master password"
                  className="input-field pr-10"
                  disabled={isLoading}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {isNewVault && password && (
                <div className="mt-2 space-y-2">
                  <div className="flex gap-1 h-2">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-full transition-all ${
                          i < passwordStrength.strength / 20
                            ? passwordStrength.color
                            : "bg-slate-200 dark:bg-slate-700"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                At least 8 characters, mix of uppercase, lowercase, numbers, and
                symbols recommended
              </p>
            </div>

            {/* Confirm Password Field */}
            {isNewVault && (
              <div>
                <label
                  htmlFor="confirm"
                  className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirm"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your master password"
                    className={`input-field pr-10 ${
                      confirmPassword && !confirmPasswordMatch
                        ? "border-danger-500 focus:ring-danger-500/20"
                        : ""
                    }`}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={20} />
                    ) : (
                      <Eye size={20} />
                    )}
                  </button>
                </div>
                {confirmPassword && (
                  <div className="mt-2 flex items-center gap-2">
                    {confirmPasswordMatch ? (
                      <>
                        <CheckCircle2
                          size={16}
                          className="text-success-500 dark:text-success-400"
                        />
                        <p className="text-xs text-success-600 dark:text-success-400">
                          Passwords match
                        </p>
                      </>
                    ) : (
                      <>
                        <AlertCircle
                          size={16}
                          className="text-danger-500 dark:text-danger-400"
                        />
                        <p className="text-xs text-danger-600 dark:text-danger-400">
                          Passwords do not match
                        </p>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-800 rounded-lg p-4 flex gap-3 animate-slide-in-left">
                <AlertCircle
                  size={20}
                  className="text-danger-600 dark:text-danger-400 flex-shrink-0 mt-0.5"
                />
                <p className="text-sm text-danger-700 dark:text-danger-300 font-medium">
                  {error}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={
                isLoading || !password || (isNewVault && !confirmPasswordMatch)
              }
              className="btn-primary w-full"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Loading...
                </>
              ) : hasVault && !isNewVault ? (
                <>
                  <Lock size={20} />
                  Unlock Vault
                </>
              ) : (
                <>
                  <Lock size={20} />
                  Create Vault
                </>
              )}
            </button>

            {/* Toggle New Vault */}
            {hasVault && !isNewVault && (
              <button
                type="button"
                onClick={() => {
                  setIsNewVault(true);
                  setPassword("");
                  setConfirmPassword("");
                  setError("");
                }}
                className="w-full btn-outline"
              >
                Create New Vault
              </button>
            )}
          </form>

          {/* Footer Info */}
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center leading-relaxed">
              🔐 Your data is encrypted locally using AES-256-GCM. We never
              store or see your master password.
            </p>
          </div>
        </div>

        {/* Security Info */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div className="text-xs">
            <div className="font-semibold text-slate-900 dark:text-slate-100">
              End-to-End
            </div>
            <div className="text-slate-500 dark:text-slate-400">Encrypted</div>
          </div>
          <div className="text-xs">
            <div className="font-semibold text-slate-900 dark:text-slate-100">
              Zero-Knowledge
            </div>
            <div className="text-slate-500 dark:text-slate-400">
              Architecture
            </div>
          </div>
          <div className="text-xs">
            <div className="font-semibold text-slate-900 dark:text-slate-100">
              Local Storage
            </div>
            <div className="text-slate-500 dark:text-slate-400">Only</div>
          </div>
        </div>
      </div>
    </div>
  );
}
