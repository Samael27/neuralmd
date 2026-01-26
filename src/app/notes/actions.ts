'use server'

import { revalidatePath } from 'next/cache'

export async function addTagToNote(noteId: string, tag: string): Promise<{ success: boolean; error?: string }> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  
  const internalToken = process.env.INTERNAL_API_TOKEN
  if (internalToken) {
    headers['X-Internal-Token'] = internalToken
  }

  try {
    // First, get the current note
    const getRes = await fetch(`${baseUrl}/api/notes/${noteId}`, { headers })
    if (!getRes.ok) {
      return { success: false, error: 'Note not found' }
    }
    const note = await getRes.json()
    
    // Check if tag already exists
    if (note.tags.includes(tag)) {
      return { success: true } // Already has the tag
    }
    
    // Add the new tag (and any parent tags)
    const newTags = [...note.tags]
    
    // Add parent tags if needed (e.g., for "a/b/c" also add "a" and "a/b")
    const parts = tag.split('/')
    for (let i = 1; i <= parts.length; i++) {
      const parentTag = parts.slice(0, i).join('/')
      if (!newTags.includes(parentTag)) {
        newTags.push(parentTag)
      }
    }
    
    // Update the note
    const updateRes = await fetch(`${baseUrl}/api/notes/${noteId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ tags: newTags })
    })
    
    if (!updateRes.ok) {
      const error = await updateRes.text()
      return { success: false, error }
    }
    
    revalidatePath('/notes')
    return { success: true }
  } catch (err) {
    console.error('Failed to add tag:', err)
    return { success: false, error: 'Failed to add tag' }
  }
}

export async function removeTagFromNote(noteId: string, tag: string): Promise<{ success: boolean; error?: string }> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  
  const internalToken = process.env.INTERNAL_API_TOKEN
  if (internalToken) {
    headers['X-Internal-Token'] = internalToken
  }

  try {
    // Get the current note
    const getRes = await fetch(`${baseUrl}/api/notes/${noteId}`, { headers })
    if (!getRes.ok) {
      return { success: false, error: 'Note not found' }
    }
    const note = await getRes.json()
    
    // Remove the tag and any child tags
    const newTags = note.tags.filter((t: string) => t !== tag && !t.startsWith(tag + '/'))
    
    // Update the note
    const updateRes = await fetch(`${baseUrl}/api/notes/${noteId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ tags: newTags })
    })
    
    if (!updateRes.ok) {
      const error = await updateRes.text()
      return { success: false, error }
    }
    
    revalidatePath('/notes')
    return { success: true }
  } catch (err) {
    console.error('Failed to remove tag:', err)
    return { success: false, error: 'Failed to remove tag' }
  }
}
