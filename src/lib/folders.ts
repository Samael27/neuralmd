// Folder utilities - virtual folders based on tag naming convention (parent/child)

export interface FolderNode {
  name: string
  path: string
  children: FolderNode[]
  noteCount: number
}

export interface TagWithHierarchy {
  tag: string
  parts: string[]
  depth: number
}

/**
 * Parse a tag into its hierarchical parts
 * "IA/Claude Code/Tips" -> { tag: "IA/Claude Code/Tips", parts: ["IA", "Claude Code", "Tips"], depth: 3 }
 */
export function parseTag(tag: string): TagWithHierarchy {
  const parts = tag.split('/').map(p => p.trim()).filter(Boolean)
  return {
    tag,
    parts,
    depth: parts.length
  }
}

/**
 * Build a folder tree from a list of tags
 */
export function buildFolderTree(tags: string[]): FolderNode {
  const root: FolderNode = {
    name: 'root',
    path: '',
    children: [],
    noteCount: 0
  }

  const tagCounts = new Map<string, number>()
  
  // Count occurrences of each tag
  for (const tag of tags) {
    tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
  }

  // Get unique tags
  const uniqueTags = Array.from(new Set(tags))

  for (const tag of uniqueTags) {
    const parsed = parseTag(tag)
    let currentNode = root
    let currentPath = ''

    for (let i = 0; i < parsed.parts.length; i++) {
      const part = parsed.parts[i]
      currentPath = currentPath ? `${currentPath}/${part}` : part

      let childNode = currentNode.children.find(c => c.name === part)
      
      if (!childNode) {
        childNode = {
          name: part,
          path: currentPath,
          children: [],
          noteCount: 0
        }
        currentNode.children.push(childNode)
      }

      // Only count at the leaf level (full tag match)
      if (currentPath === tag) {
        childNode.noteCount = tagCounts.get(tag) || 0
      }

      currentNode = childNode
    }
  }

  // Sort children alphabetically at each level
  const sortChildren = (node: FolderNode) => {
    node.children.sort((a, b) => a.name.localeCompare(b.name))
    node.children.forEach(sortChildren)
  }
  sortChildren(root)

  return root
}

/**
 * Get all ancestor tags for a given tag
 * "IA/Claude Code/Tips" -> ["IA", "IA/Claude Code", "IA/Claude Code/Tips"]
 */
export function getAncestorTags(tag: string): string[] {
  const parts = tag.split('/').map(p => p.trim()).filter(Boolean)
  const ancestors: string[] = []
  
  for (let i = 0; i < parts.length; i++) {
    ancestors.push(parts.slice(0, i + 1).join('/'))
  }
  
  return ancestors
}

/**
 * Ensure a tag includes all its ancestor tags
 * If adding "IA/Claude Code", also ensure "IA" is present
 */
export function ensureAncestorTags(tags: string[]): string[] {
  const allTags = new Set<string>()
  
  for (const tag of tags) {
    const ancestors = getAncestorTags(tag)
    ancestors.forEach(a => allTags.add(a))
  }
  
  return Array.from(allTags).sort()
}

/**
 * Get the parent tag of a given tag
 * "IA/Claude Code/Tips" -> "IA/Claude Code"
 */
export function getParentTag(tag: string): string | null {
  const parts = tag.split('/').map(p => p.trim()).filter(Boolean)
  if (parts.length <= 1) return null
  return parts.slice(0, -1).join('/')
}

/**
 * Get just the leaf name of a tag
 * "IA/Claude Code/Tips" -> "Tips"
 */
export function getTagLeafName(tag: string): string {
  const parts = tag.split('/').map(p => p.trim()).filter(Boolean)
  return parts[parts.length - 1] || tag
}
