import type { PasswordStrength } from '@types/vault'

export function calculatePasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return {
      score: 0,
      label: 'very weak',
      color: '#ef4444',
      suggestions: ['Password is required'],
      entropy: 0,
    }
  }

  let score = 0
  const suggestions: string[] = []
  let entropy = 0

  // Length check
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (password.length >= 16) score += 1
  else if (password.length < 8) suggestions.push('Use at least 8 characters')

  // Character variety
  const hasLower = /[a-z]/.test(password)
  const hasUpper = /[A-Z]/.test(password)
  const hasNumbers = /\d/.test(password)
  const hasSymbols = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)

  if (hasLower) score += 1
  if (hasUpper) score += 1
  if (hasNumbers) score += 1
  if (hasSymbols) score += 1

  if (!hasUpper) suggestions.push('Add uppercase letters')
  if (!hasNumbers) suggestions.push('Add numbers')
  if (!hasSymbols) suggestions.push('Add special characters')

  // Calculate entropy (simplified)
  let charsetSize = 0
  if (hasLower) charsetSize += 26
  if (hasUpper) charsetSize += 26
  if (hasNumbers) charsetSize += 10
  if (hasSymbols) charsetSize += 32
  entropy = Math.log2(Math.pow(charsetSize, password.length))

  // Common patterns (reduce score)
  if (/(.)(\1{2,})/.test(password)) {
    score = Math.max(0, score - 1)
    suggestions.push('Avoid repeating characters')
  }

  if (/^[a-z]+$|^[A-Z]+$|^\d+$/.test(password)) {
    score = Math.max(0, score - 1)
    suggestions.push('Use a mix of character types')
  }

  // Determine label
  let label: PasswordStrength['label'] = 'very weak'
  let color = '#ef4444'

  if (score <= 1) {
    label = 'very weak'
    color = '#ef4444'
  } else if (score <= 2) {
    label = 'weak'
    color = '#f97316'
  } else if (score <= 3) {
    label = 'fair'
    color = '#eab308'
  } else if (score <= 4) {
    label = 'good'
    color = '#84cc16'
  } else if (score <= 5) {
    label = 'strong'
    color = '#22c55e'
  } else {
    label = 'very strong'
    color = '#16a34a'
  }

  return {
    score: Math.min(4, score),
    label,
    color,
    suggestions,
    entropy: Math.round(entropy),
  }
}
