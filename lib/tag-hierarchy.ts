export const MAX_TAG_DEPTH = 5

export type HierarchicalTag = {
  id: number
  name: string
  parent?: number | null
}

export type FlattenedTag<T extends HierarchicalTag> = T & {
  depth: number
  orderIndex: number
}

function compareTags(left: HierarchicalTag, right: HierarchicalTag) {
  return left.name.localeCompare(right.name, undefined, { sensitivity: "base" }) || left.id - right.id
}

function createTagMap<T extends HierarchicalTag>(tags: T[]) {
  return new Map(tags.map((tag) => [tag.id, tag]))
}

export function detectTagHierarchyCycles<T extends HierarchicalTag>(tags: T[]): number[] {
  const byId = createTagMap(tags)
  const cycleIds = new Set<number>()

  for (const tag of tags) {
    const path: number[] = []
    const pathIndexes = new Map<number, number>()
    let current: T | undefined = tag

    while (current) {
      const cycleStart = pathIndexes.get(current.id)
      if (cycleStart !== undefined) {
        path.slice(cycleStart).forEach((id) => cycleIds.add(id))
        break
      }

      pathIndexes.set(current.id, path.length)
      path.push(current.id)
      current = current.parent == null ? undefined : byId.get(current.parent)
    }
  }

  return [...cycleIds].sort((left, right) => left - right)
}

export function flattenTagHierarchy<T extends HierarchicalTag>(tags: T[]): Array<FlattenedTag<T>> {
  const byId = createTagMap(tags)
  const children = new Map<number, T[]>()
  const roots: T[] = []

  for (const tag of tags) {
    if (tag.parent == null || !byId.has(tag.parent)) {
      roots.push(tag)
      continue
    }
    children.set(tag.parent, [...(children.get(tag.parent) ?? []), tag])
  }

  roots.sort(compareTags)
  children.forEach((items) => items.sort(compareTags))

  const flattened: Array<FlattenedTag<T>> = []
  const visited = new Set<number>()
  const visit = (tag: T, depth: number) => {
    if (visited.has(tag.id)) return
    visited.add(tag.id)
    flattened.push({ ...tag, depth, orderIndex: flattened.length })
    for (const child of children.get(tag.id) ?? []) {
      visit(child, depth + 1)
    }
  }

  roots.forEach((tag) => visit(tag, 0))
  tags
    .filter((tag) => !visited.has(tag.id))
    .sort(compareTags)
    .forEach((tag) => visit(tag, 0))

  return flattened
}

export function getTagAncestors<T extends HierarchicalTag>(tags: T[], tagId: number): T[] {
  const byId = createTagMap(tags)
  const ancestors: T[] = []
  const visited = new Set<number>([tagId])
  let current = byId.get(tagId)

  while (current?.parent != null) {
    if (visited.has(current.parent)) break
    const parent = byId.get(current.parent)
    if (!parent) break
    visited.add(parent.id)
    ancestors.unshift(parent)
    current = parent
  }

  return ancestors
}

export function getTagDescendants<T extends HierarchicalTag>(tags: T[], tagId: number): T[] {
  const flattened = flattenTagHierarchy(tags)
  const result: T[] = []
  const visited = new Set<number>([tagId])
  const children = new Map<number, T[]>()

  for (const tag of flattened) {
    if (tag.parent != null) {
      children.set(tag.parent, [...(children.get(tag.parent) ?? []), tag])
    }
  }

  const visit = (parentId: number) => {
    for (const child of children.get(parentId) ?? []) {
      if (visited.has(child.id)) continue
      visited.add(child.id)
      result.push(child)
      visit(child.id)
    }
  }

  visit(tagId)
  return result
}

export function getTagPath<T extends HierarchicalTag>(tags: T[], tagId: number): string {
  const tag = tags.find((candidate) => candidate.id === tagId)
  if (!tag) return ""
  return [...getTagAncestors(tags, tagId), tag].map((item) => item.name).join(" / ")
}

export function getValidTagParents<T extends HierarchicalTag>(tags: T[], tagId?: number): T[] {
  const excluded = new Set<number>()
  let subtreeHeight = 0

  if (tagId !== undefined) {
    excluded.add(tagId)
    const descendants = getTagDescendants(tags, tagId)
    descendants.forEach((tag) => excluded.add(tag.id))
    subtreeHeight = descendants.reduce(
      (height, tag) => Math.max(height, getTagAncestors(tags, tag.id).length - getTagAncestors(tags, tagId).length),
      0
    )
  }

  return flattenTagHierarchy(tags)
    .filter((tag) => !excluded.has(tag.id))
    .filter((tag) => tag.depth + 1 + subtreeHeight < MAX_TAG_DEPTH)
}
