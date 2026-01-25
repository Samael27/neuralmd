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

export async function updateNote(
  noteId: string,
  data: { title: string; content: string; tags: string[] }
) {
  try {
    const res = await fetch(`${baseUrl}/api/notes/${noteId}`, {
      method: 'PUT',
      headers: getInternalHeaders(),
      body: JSON.stringify(data),
      cache: 'no-store'
    })

    if (!res.ok) {
      const error = await res.json()
      return { success: false, error: error.error || 'Erreur lors de la mise à jour' }
    }

    revalidatePath(`/notes/${noteId}`)
    revalidatePath('/notes')
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Erreur de connexion au serveur' }
  }
}

export async function deleteNote(noteId: string) {
  try {
    const res = await fetch(`${baseUrl}/api/notes/${noteId}`, {
      method: 'DELETE',
      headers: getInternalHeaders(),
      cache: 'no-store'
    })

    if (!res.ok) {
      const error = await res.json()
      return { success: false, error: error.error || 'Erreur lors de la suppression' }
    }

    revalidatePath('/notes')
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Erreur de connexion au serveur' }
  }
}

export async function createNote(data: { 
  title: string
  content: string
  tags: string[]
  source?: string 
}) {
  try {
    const res = await fetch(`${baseUrl}/api/notes`, {
      method: 'POST',
      headers: getInternalHeaders(),
      body: JSON.stringify({ ...data, source: data.source || 'human' }),
      cache: 'no-store'
    })

    if (!res.ok) {
      const error = await res.json()
      return { success: false, error: error.error || 'Erreur lors de la création' }
    }

    const note = await res.json()
    revalidatePath('/notes')
    return { success: true, noteId: note.id }
  } catch (error) {
    return { success: false, error: 'Erreur de connexion au serveur' }
  }
}
