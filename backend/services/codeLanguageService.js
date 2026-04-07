const EXTENSION_LANGUAGE_MAP = new Map([
  ['.js', 'javascript'],
  ['.jsx', 'javascript'],
  ['.mjs', 'javascript'],
  ['.cjs', 'javascript'],
  ['.ts', 'typescript'],
  ['.tsx', 'typescript'],
  ['.py', 'python'],
  ['.java', 'java'],
  ['.go', 'go'],
  ['.rb', 'ruby'],
  ['.php', 'php'],
  ['.rs', 'rust'],
  ['.c', 'c'],
  ['.h', 'c'],
  ['.cc', 'cpp'],
  ['.cpp', 'cpp'],
  ['.cxx', 'cpp'],
  ['.hpp', 'cpp'],
  ['.cs', 'csharp'],
  ['.swift', 'swift'],
  ['.kt', 'kotlin'],
  ['.kts', 'kotlin'],
  ['.scala', 'scala'],
  ['.sql', 'sql'],
  ['.html', 'html'],
  ['.htm', 'html'],
  ['.css', 'css'],
  ['.scss', 'scss'],
  ['.sass', 'scss'],
  ['.less', 'less'],
  ['.json', 'json'],
  ['.yaml', 'yaml'],
  ['.yml', 'yaml'],
  ['.xml', 'xml'],
  ['.md', 'markdown'],
  ['.sh', 'bash'],
  ['.bash', 'bash'],
  ['.zsh', 'bash'],
  ['.ps1', 'powershell'],
  ['.dockerfile', 'docker'],
  ['.vue', 'vue'],
  ['.svelte', 'svelte'],
]);

const DISPLAY_NAME_MAP = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  java: 'Java',
  go: 'Go',
  ruby: 'Ruby',
  php: 'PHP',
  rust: 'Rust',
  c: 'C',
  cpp: 'C++',
  csharp: 'C#',
  swift: 'Swift',
  kotlin: 'Kotlin',
  scala: 'Scala',
  sql: 'SQL',
  html: 'HTML',
  css: 'CSS',
  scss: 'SCSS',
  less: 'Less',
  json: 'JSON',
  yaml: 'YAML',
  xml: 'XML',
  markdown: 'Markdown',
  bash: 'Bash',
  powershell: 'PowerShell',
  docker: 'Dockerfile',
  vue: 'Vue',
  svelte: 'Svelte',
  text: 'Text',
};

function normalizeLanguage(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9#+-]/g, '');
}

function extractExtension(filePath) {
  const normalized = String(filePath || '').trim().toLowerCase();
  if (!normalized) return '';
  if (normalized.endsWith('dockerfile')) return '.dockerfile';
  const match = normalized.match(/(\.[a-z0-9]+)$/i);
  return match?.[1] || '';
}

function detectLanguageFromPath(filePath) {
  return EXTENSION_LANGUAGE_MAP.get(extractExtension(filePath)) || null;
}

function detectLanguageFromCode(code) {
  const text = String(code || '');
  const trimmed = text.trim();
  if (!trimmed) return 'text';

  if (/^#!/.test(trimmed) || /\becho\b.+\$/m.test(text) || /\bfi\b|\besac\b/.test(text)) {
    return 'bash';
  }
  if (/^\s*<\?php/.test(trimmed)) return 'php';
  if (/^\s*(import|from)\s+[\w.]+/.test(trimmed) && /\bdef\b|\bprint\(/.test(text)) return 'python';
  if (/\bdef\s+\w+\s*\(|\bself\b|:\s*\n\s+/.test(text) && /\bimport\s+\w+/.test(text)) return 'python';
  if (/\binterface\s+\w+|\btype\s+\w+\s*=|:\s*(string|number|boolean|unknown|any)\b/.test(text)) return 'typescript';
  if (/<template>|<script setup|<script lang=/.test(text)) return 'vue';
  if (/<script>|<style>|<\/[a-z]+>/.test(text) && /<html|<div|<span|<body/i.test(text)) return 'html';
  if (/^\s*[{[]/.test(trimmed)) {
    try {
      JSON.parse(trimmed);
      return 'json';
    } catch {
      // Ignore invalid JSON and continue.
    }
  }
  if (/^\s*[\w-]+:\s+\S+/m.test(text) && !/[;{}()]/.test(text)) return 'yaml';
  if (/\bpublic\s+class\b|\bSystem\.out\.println\b|\bpackage\s+[a-z0-9_.]+;/i.test(text)) return 'java';
  if (/\bfunc\s+\w+\s*\(|\bpackage\s+main\b|\bfmt\./.test(text)) return 'go';
  if (/\bfn\s+\w+\s*\(|\blet\s+mut\b|\bimpl\b/.test(text)) return 'rust';
  if (/\busing\s+System\b|\bnamespace\b|\bpublic\s+(class|record)\b/.test(text)) return 'csharp';
  if (/\bfunc\s+\w+\s*\(|\bguard\b|\blet\s+\w+\s*=/.test(text) && /\bimport\s+\w+/.test(text)) return 'swift';
  if (/\bfun\s+\w+\s*\(|\bval\s+\w+\s*=|\bvar\s+\w+\s*=/.test(text)) return 'kotlin';
  if (/\bSELECT\b|\bFROM\b|\bWHERE\b|\bJOIN\b/i.test(text)) return 'sql';
  if (/\basync\b|\bawait\b|\bfunction\b|\bconst\b|\blet\b|\bexport\b|\bimport\b/.test(text)) return 'javascript';
  if (/^\s*[.#]?[a-z0-9_-]+\s*\{/.test(text) || /:\s*[^;]+;/.test(text)) return 'css';
  if (/^\s*#\s+/.test(text) || /\n##\s+/.test(text)) return 'markdown';

  return 'text';
}

function detectCodeLanguage({ code, filePath = '', hint = '' }) {
  const hinted = normalizeLanguage(hint);
  if (DISPLAY_NAME_MAP[hinted]) {
    return hinted;
  }

  return detectLanguageFromPath(filePath) || detectLanguageFromCode(code);
}

function getLanguageDisplayName(language) {
  return DISPLAY_NAME_MAP[normalizeLanguage(language)] || 'Text';
}

function supportsAstAnalysis(language) {
  const normalized = normalizeLanguage(language);
  return normalized === 'javascript' || normalized === 'typescript';
}

module.exports = {
  detectCodeLanguage,
  detectLanguageFromCode,
  detectLanguageFromPath,
  getLanguageDisplayName,
  normalizeLanguage,
  supportsAstAnalysis,
};
