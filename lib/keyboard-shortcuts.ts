export type ShortcutScope = "global" | "documents"

export interface KeyboardShortcut {
  id: string
  label: string
  keyChord: string
  scope: ShortcutScope
  description: string
}

export const KEYBOARD_SHORTCUTS = [
  {
    id: "global.search",
    label: "Open global search",
    keyChord: "Mod+K",
    scope: "global",
    description: "Search documents, saved views, and navigation targets.",
  },
  {
    id: "global.shortcut-help",
    label: "Open keyboard shortcuts",
    keyChord: "Shift+?",
    scope: "global",
    description:
      "Show the keyboard shortcut reference from anywhere in the app.",
  },
  {
    id: "documents.focus-search",
    label: "Focus document search",
    keyChord: "/",
    scope: "documents",
    description: "Jump to the document search field.",
  },
  {
    id: "documents.display-mode.table",
    label: "Switch to table view",
    keyChord: "Alt+1",
    scope: "documents",
    description: "Show documents in the table layout.",
  },
  {
    id: "documents.display-mode.small-cards",
    label: "Switch to small cards",
    keyChord: "Alt+2",
    scope: "documents",
    description: "Show documents in the compact card layout.",
  },
  {
    id: "documents.display-mode.large-cards",
    label: "Switch to large cards",
    keyChord: "Alt+3",
    scope: "documents",
    description: "Show documents in the spacious card layout.",
  },
  {
    id: "documents.columns",
    label: "Open columns picker",
    keyChord: "Alt+C",
    scope: "documents",
    description: "Open the visible columns menu.",
  },
  {
    id: "documents.filters",
    label: "Open date filters",
    keyChord: "Alt+F",
    scope: "documents",
    description: "Open the date filter controls.",
  },
  {
    id: "documents.saved-views",
    label: "Open saved views",
    keyChord: "Alt+V",
    scope: "documents",
    description: "Open the saved views menu.",
  },
  {
    id: "documents.page.previous",
    label: "Previous page",
    keyChord: "Alt+ArrowLeft",
    scope: "documents",
    description: "Move to the previous page of results.",
  },
  {
    id: "documents.page.next",
    label: "Next page",
    keyChord: "Alt+ArrowRight",
    scope: "documents",
    description: "Move to the next page of results.",
  },
  {
    id: "documents.preview.previous",
    label: "Previous preview document",
    keyChord: "ArrowLeft",
    scope: "documents",
    description: "Move to the previous document while preview is open.",
  },
  {
    id: "documents.preview.next",
    label: "Next preview document",
    keyChord: "ArrowRight",
    scope: "documents",
    description: "Move to the next document while preview is open.",
  },
] as const satisfies readonly KeyboardShortcut[]

export const SHORTCUT_SCOPE_LABELS: Record<ShortcutScope, string> = {
  global: "Global",
  documents: "Document workspace",
}

export function getKeyboardShortcut(id: string) {
  const shortcut = KEYBOARD_SHORTCUTS.find((entry) => entry.id === id)
  if (!shortcut) {
    throw new Error(`Unknown keyboard shortcut: ${id}`)
  }
  return shortcut
}

export function groupKeyboardShortcuts(
  shortcuts: readonly KeyboardShortcut[] = KEYBOARD_SHORTCUTS
) {
  return (Object.keys(SHORTCUT_SCOPE_LABELS) as ShortcutScope[]).map(
    (scope) => ({
      scope,
      label: SHORTCUT_SCOPE_LABELS[scope],
      shortcuts: shortcuts.filter((shortcut) => shortcut.scope === scope),
    })
  )
}

export function isEditableElement(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false

  const tagName = target.tagName
  return (
    target.isContentEditable ||
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT"
  )
}

export function isMacPlatform(platform?: string) {
  const resolvedPlatform =
    platform ?? (typeof navigator !== "undefined" ? navigator.platform : "")
  return /mac|iphone|ipad|ipod/i.test(resolvedPlatform)
}

export function formatShortcutChord(keyChord: string, platform?: string) {
  const mac = isMacPlatform(platform)

  return keyChord
    .split("+")
    .map((part) => {
      if (part === "Mod") {
        return mac ? "Cmd" : "Ctrl"
      }
      return part
    })
    .join("+")
}

export function matchesShortcutEvent(event: KeyboardEvent, keyChord: string) {
  const parts = keyChord.split("+")
  let expectedKey: string | null = null
  let expectedAlt = false
  let expectedShift = false
  let expectedMod = false

  for (const part of parts) {
    if (part === "Alt") {
      expectedAlt = true
      continue
    }
    if (part === "Shift") {
      expectedShift = true
      continue
    }
    if (part === "Mod") {
      expectedMod = true
      continue
    }
    expectedKey = part
  }

  const hasMod = event.metaKey || event.ctrlKey

  if (event.altKey !== expectedAlt) return false
  if (event.shiftKey !== expectedShift) return false
  if (hasMod !== expectedMod) return false

  if (!expectedKey) return false

  if (expectedKey.length === 1 && /[a-z]/i.test(expectedKey)) {
    return event.key.toLowerCase() === expectedKey.toLowerCase()
  }

  if (expectedKey === "?") {
    return event.key === "?" || (event.key === "/" && event.shiftKey)
  }

  return event.key === expectedKey
}
