'use server'

import { revalidatePath } from 'next/cache'

// Internal headers for server-side API calls
function getInternalHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  }
  const internalToken = process.env.INTERNAL_API_TOKEN
  if (internalToken) {
    headers['X-Internal-Token'] = internalToken
  }
  return headers
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function createNote(data: { 
  title: string
  content: string
  tags: string[]
  source: string
  sanitizeSecrets?: boolean
  allowSecrets?: boolean
}) {
  try {
    const res = await fetch(`${baseUrl}/api/notes`, {
      method: 'POST',
      headers: getInternalHeaders(),
      body: JSON.stringify(data),
      cache: 'no-store'
    })

    const responseData = await res.json()

    if (!res.ok) {
      return { 
        success: false, 
        error: responseData.error || 'Erreur lors de la création',
        secrets: responseData.secrets
      }
    }

    revalidatePath('/notes')
    return { success: true, noteId: responseData.note?.id || responseData.id }
  } catch (error) {
    return { success: false, error: 'Erreur de connexion au serveur' }
  }
}

export async function checkSecrets(content: string) {
  try {
    const res = await fetch(`${baseUrl}/api/check-secrets`, {
      method: 'POST',
      headers: getInternalHeaders(),
      body: JSON.stringify({ content }),
      cache: 'no-store'
    })

    if (res.ok) {
      const data = await res.json()
      return { secrets: data.secrets || [] }
    }
    return { secrets: [] }
  } catch {
    return { secrets: [] }
  }
}
