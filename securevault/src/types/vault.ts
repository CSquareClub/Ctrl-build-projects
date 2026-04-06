export interface DecryptedEntry {
  id: string;
  title: string;
  category: 'login' | 'email' | 'banking' | 'social' | 'work' | 'shopping' | 'gaming' | 'other';
  username?: string;
  email?: string;
  password: string;
  url?: string;
  notes?: string;
  tags: string[];
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
  lastAccessedAt?: number;
  customFields?: Record<string, string>;
}

export interface VaultEntry {
  id: string;
  title: string;
  category: DecryptedEntry['category'];
  encryptedData: string; // AES-256-GCM encrypted
  iv: string;
  salt: string;
  isFavorite: boolean;
  passwordStrength: number;
  createdAt: number;
  updatedAt: number;
  lastAccessedAt?: number;
}

export interface VaultMetadata {
  version: number;
  createdAt: number;
  updatedAt: number;
  entryCount: number;
  lastBackup?: number;
  encryptionVersion: 'v1' | 'v2';
}

export interface PasswordStrength {
  score: number; // 0-4
  label: 'very weak' | 'weak' | 'fair' | 'good' | 'strong' | 'very strong';
  color: string;
  suggestions: string[];
  entropy: number;
}

export interface GeneratorOptions {
  length: number;
  useUppercase: boolean;
  useLowercase: boolean;
  useNumbers: boolean;
  useSymbols: boolean;
  excludeAmbiguous: boolean;
  customSymbols?: string;
}

export interface GeneratorResult {
  password: string;
  strength: PasswordStrength;
  entropy: number;
}

export interface VaultStats {
  totalEntries: number;
  entriesByCategory: Record<string, number>;
  weakPasswords: number;
  reusedPasswords: number;
  oldPasswords: number;
  favoriteCount: number;
}

export interface AuditLog {
  id: string;
  action: 'created' | 'updated' | 'deleted' | 'viewed' | 'copied' | 'exported' | 'imported' | 'locked' | 'unlocked';
  entryId?: string;
  timestamp: number;
  details?: Record<string, unknown>;
}

export interface ExportData {
  version: number;
  exportedAt: number;
  entries: DecryptedEntry[];
  metadata: VaultMetadata;
}

export interface VaultSettings {
  lockTimeout: number; // minutes
  requireMasterPasswordOnLaunch: boolean;
  autofillEnabled: boolean;
  showPasswordHints: boolean;
  enableBiometric: boolean;
  theme: 'light' | 'dark' | 'system';
  language: string;
}

export interface CryptoKeyPair {
  privateKey: CryptoKey;
  salt: ArrayBuffer;
  iterations: number;
}

export type CategoryType = DecryptedEntry['category'];

export const CATEGORIES: CategoryType[] = [
  'login',
  'email',
  'banking',
  'social',
  'work',
  'shopping',
  'gaming',
  'other',
];

export const CATEGORY_ICONS: Record<CategoryType, string> = {
  login: '🔑',
  email: '📧',
  banking: '🏦',
  social: '💬',
  work: '💼',
  shopping: '🛒',
  gaming: '🎮',
  other: '📄',
};
