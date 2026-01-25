/**
 * Secrets Detector - Détecte les informations sensibles avant stockage
 */

export interface SecretMatch {
  type: string
  pattern: string
  match: string
  masked: string
  startIndex: number
  endIndex: number
}

export interface DetectionResult {
  hasSensitiveData: boolean
  matches: SecretMatch[]
  sanitizedContent: string
  originalContent: string
}

// Patterns de détection
const SECRET_PATTERNS: { type: string; pattern: RegExp; description: string }[] = [
  // API Keys génériques
  {
    type: 'api_key',
    pattern: /(?:api[_-]?key|apikey)[\s:="']+([a-zA-Z0-9_\-]{20,})/gi,
    description: 'API Key générique'
  },
  // OpenAI
  {
    type: 'openai_key',
    pattern: /sk-[a-zA-Z0-9]{20,}/g,
    description: 'OpenAI API Key'
  },
  // Anthropic
  {
    type: 'anthropic_key',
    pattern: /sk-ant-[a-zA-Z0-9\-]{20,}/g,
    description: 'Anthropic API Key'
  },
  // GitHub
  {
    type: 'github_token',
    pattern: /gh[pousr]_[a-zA-Z0-9]{36,}/g,
    description: 'GitHub Token'
  },
  {
    type: 'github_token',
    pattern: /github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59}/g,
    description: 'GitHub Personal Access Token'
  },
  // AWS
  {
    type: 'aws_key',
    pattern: /AKIA[0-9A-Z]{16}/g,
    description: 'AWS Access Key ID'
  },
  {
    type: 'aws_secret',
    pattern: /(?:aws[_-]?secret|secret[_-]?key)[\s:="']+([a-zA-Z0-9/+=]{40})/gi,
    description: 'AWS Secret Key'
  },
  // Discord
  {
    type: 'discord_token',
    pattern: /[MN][A-Za-z\d]{23,}\.[\w-]{6}\.[\w-]{27}/g,
    description: 'Discord Bot Token'
  },
  // Slack
  {
    type: 'slack_token',
    pattern: /xox[baprs]-[0-9]{10,13}-[0-9]{10,13}-[a-zA-Z0-9]{24}/g,
    description: 'Slack Token'
  },
  // Stripe
  {
    type: 'stripe_key',
    pattern: /sk_live_[a-zA-Z0-9]{24,}/g,
    description: 'Stripe Secret Key'
  },
  {
    type: 'stripe_key',
    pattern: /sk_test_[a-zA-Z0-9]{24,}/g,
    description: 'Stripe Test Key'
  },
  // Generic secrets
  {
    type: 'password',
    pattern: /(?:password|passwd|pwd)[\s:="']+([^\s"']{8,})/gi,
    description: 'Password'
  },
  {
    type: 'secret',
    pattern: /(?:secret|token)[\s:="']+([a-zA-Z0-9_\-]{16,})/gi,
    description: 'Secret/Token générique'
  },
  // Private keys
  {
    type: 'private_key',
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
    description: 'Private Key'
  },
  // Bearer tokens
  {
    type: 'bearer_token',
    pattern: /Bearer\s+[a-zA-Z0-9_\-\.]{20,}/g,
    description: 'Bearer Token'
  },
  // JWT
  {
    type: 'jwt',
    pattern: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g,
    description: 'JWT Token'
  },
  // Database URLs with passwords
  {
    type: 'database_url',
    pattern: /(?:postgres|mysql|mongodb)(?:ql)?:\/\/[^:]+:([^@]+)@/gi,
    description: 'Database URL with password'
  },
]

/**
 * Masque une valeur sensible
 */
function maskSecret(value: string): string {
  if (value.length <= 8) {
    return '*'.repeat(value.length)
  }
  const visibleChars = Math.min(4, Math.floor(value.length / 4))
  return value.slice(0, visibleChars) + '*'.repeat(value.length - visibleChars * 2) + value.slice(-visibleChars)
}

/**
 * Détecte les secrets dans un texte
 */
export function detectSecrets(content: string): DetectionResult {
  const matches: SecretMatch[] = []
  let sanitizedContent = content

  for (const { type, pattern, description } of SECRET_PATTERNS) {
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0
    
    let match
    while ((match = pattern.exec(content)) !== null) {
      const fullMatch = match[0]
      // Use capture group if available, otherwise full match
      const secretValue = match[1] || fullMatch
      const masked = maskSecret(secretValue)
      
      matches.push({
        type,
        pattern: description,
        match: secretValue,
        masked,
        startIndex: match.index,
        endIndex: match.index + fullMatch.length
      })
      
      // Sanitize the content
      sanitizedContent = sanitizedContent.replace(secretValue, masked)
    }
  }

  // Deduplicate matches by position
  const uniqueMatches = matches.filter((match, index, self) =>
    index === self.findIndex(m => m.startIndex === match.startIndex && m.match === match.match)
  )

  return {
    hasSensitiveData: uniqueMatches.length > 0,
    matches: uniqueMatches,
    sanitizedContent,
    originalContent: content
  }
}

/**
 * Vérifie si le contenu contient des secrets (rapide)
 */
export function containsSecrets(content: string): boolean {
  for (const { pattern } of SECRET_PATTERNS) {
    pattern.lastIndex = 0
    if (pattern.test(content)) {
      return true
    }
  }
  return false
}

/**
 * Types de secrets détectés (pour l'UI)
 */
export function getSecretTypes(): string[] {
  return Array.from(new Set(SECRET_PATTERNS.map(p => p.type)))
}
