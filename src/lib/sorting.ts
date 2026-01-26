export type SortOption = 'newest' | 'oldest' | 'title-asc' | 'title-desc' | 'updated'

export function sortNotes<T extends { createdAt: string; updatedAt: string; title: string }>(
  notes: T[],
  sort: SortOption
): T[] {
  const sorted = [...notes]
  
  switch (sort) {
    case 'newest':
      return sorted.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
    case 'oldest':
      return sorted.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
    case 'updated':
      return sorted.sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
    case 'title-asc':
      return sorted.sort((a, b) => 
        a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' })
      )
    case 'title-desc':
      return sorted.sort((a, b) => 
        b.title.localeCompare(a.title, 'fr', { sensitivity: 'base' })
      )
    default:
      return sorted
  }
}
