/**
 * Multi-tenant support utilities
 * 
 * When MULTI_TENANT=true:
 * - All notes/keys are scoped to a userId
 * - Users must authenticate to access their data
 * 
 * When MULTI_TENANT=false (default):
 * - Single-tenant mode (self-hosted)
 * - No user authentication required
 * - All data is global
 */

export const isMultiTenant = () => process.env.MULTI_TENANT === 'true'

/**
 * Get the where clause for scoping queries by user
 * Returns empty object in single-tenant mode
 */
export function scopeByUser(userId: string | null | undefined) {
  if (!isMultiTenant()) {
    return {} // Single-tenant: no scoping
  }
  
  if (!userId) {
    throw new Error('User ID required in multi-tenant mode')
  }
  
  return { userId }
}

/**
 * Get the data clause for creating records with userId
 * Returns empty object in single-tenant mode
 */
export function withUserId(userId: string | null | undefined) {
  if (!isMultiTenant()) {
    return {} // Single-tenant: no userId
  }
  
  if (!userId) {
    throw new Error('User ID required in multi-tenant mode')
  }
  
  return { userId }
}

/**
 * Plan limits
 */
export const PLAN_LIMITS = {
  free: {
    maxNotes: 100,
    maxApiCallsPerDay: 100,
    maxApiKeys: 2,
    embeddingProvider: 'ollama', // Free tier uses Ollama only
  },
  pro: {
    maxNotes: 10000,
    maxApiCallsPerDay: 10000,
    maxApiKeys: 10,
    embeddingProvider: 'openai', // Pro can use OpenAI
  },
  team: {
    maxNotes: -1, // Unlimited
    maxApiCallsPerDay: -1,
    maxApiKeys: -1,
    embeddingProvider: 'openai',
  },
} as const

export type Plan = keyof typeof PLAN_LIMITS

/**
 * Check if user is within their plan limits
 */
export function checkPlanLimits(
  plan: Plan,
  current: { notesCount?: number; apiCallsCount?: number; apiKeysCount?: number }
) {
  const limits = PLAN_LIMITS[plan]
  
  const errors: string[] = []
  
  if (limits.maxNotes !== -1 && (current.notesCount ?? 0) >= limits.maxNotes) {
    errors.push(`Note limit reached (${limits.maxNotes} notes on ${plan} plan)`)
  }
  
  if (limits.maxApiCallsPerDay !== -1 && (current.apiCallsCount ?? 0) >= limits.maxApiCallsPerDay) {
    errors.push(`API call limit reached (${limits.maxApiCallsPerDay}/day on ${plan} plan)`)
  }
  
  if (limits.maxApiKeys !== -1 && (current.apiKeysCount ?? 0) >= limits.maxApiKeys) {
    errors.push(`API key limit reached (${limits.maxApiKeys} keys on ${plan} plan)`)
  }
  
  return {
    allowed: errors.length === 0,
    errors,
  }
}
