import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { randomUUID } from "node:crypto"
import type {
  ThemePresetDraft,
  ThemePresetRecord,
  ThemePresetSummary,
} from "@/lib/theme-preset-types"

const THEME_PRESETS_PATH = process.env.PAPERLESS_LINK_THEME_PRESETS_PATH
  ? path.resolve(process.env.PAPERLESS_LINK_THEME_PRESETS_PATH)
  : path.join(process.cwd(), ".data", "theme-presets.json")

interface ThemePresetStorePayload {
  presets: ThemePresetRecord[]
}

const APPLIED_THEME_VARIABLE_ALLOWLIST = new Set([
  "--background",
  "--foreground",
  "--card",
  "--card-foreground",
  "--popover",
  "--popover-foreground",
  "--primary",
  "--primary-foreground",
  "--secondary",
  "--secondary-foreground",
  "--muted",
  "--muted-foreground",
  "--accent",
  "--accent-foreground",
  "--border",
  "--input",
  "--ring",
  "--brand",
  "--brand-foreground",
  "--destructive",
  "--chart-1",
  "--chart-2",
  "--chart-3",
  "--chart-4",
  "--chart-5",
  "--sidebar",
  "--sidebar-foreground",
  "--sidebar-border",
  "--sidebar-ring",
  "--sidebar-primary",
  "--sidebar-primary-foreground",
  "--sidebar-accent",
  "--sidebar-accent-foreground",
  "--inner-padding",
  "--field-spacing",
  "--field-separation",
  "--field-label-offset",
  "--text-page-font",
  "--text-page-size",
  "--text-page-weight",
  "--text-page-color",
  "--text-page-line-height",
  "--text-page-tracking",
  "--text-page-transform",
  "--text-section-font",
  "--text-section-size",
  "--text-section-weight",
  "--text-section-color",
  "--text-section-line-height",
  "--text-section-tracking",
  "--text-section-transform",
  "--text-card-font",
  "--text-card-size",
  "--text-card-weight",
  "--text-card-color",
  "--text-card-line-height",
  "--text-card-tracking",
  "--text-card-transform",
  "--text-field-font",
  "--text-field-size",
  "--text-field-weight",
  "--text-field-color",
  "--text-field-line-height",
  "--text-field-tracking",
  "--text-field-transform",
  "--text-help-font",
  "--text-help-size",
  "--text-help-weight",
  "--text-help-color",
  "--text-help-line-height",
  "--text-help-tracking",
  "--text-help-transform",
  "--text-caption-font",
  "--text-caption-size",
  "--text-caption-weight",
  "--text-caption-color",
  "--text-caption-line-height",
  "--text-caption-tracking",
  "--text-caption-transform",
  "--text-subtext-font",
  "--text-subtext-size",
  "--text-subtext-weight",
  "--text-subtext-color",
  "--text-subtext-line-height",
  "--text-subtext-tracking",
  "--text-subtext-transform",
])

function sanitizeAppliedThemeVariables(
  variables: Record<string, string>
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(variables).flatMap(([key, value]) => {
      if (!APPLIED_THEME_VARIABLE_ALLOWLIST.has(key)) {
        return []
      }
      if (value === `var(${key})`) {
        return []
      }
      return [[key, value] as const]
    })
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function normalizeThemePresetRecord(value: unknown): ThemePresetRecord | null {
  if (!isRecord(value)) return null
  if (typeof value.id !== "string" || typeof value.name !== "string") return null
  if (!isRecord(value.draft) || !isRecord(value.variables)) return null
  if (typeof value.createdAt !== "string" || typeof value.updatedAt !== "string") return null

  return {
    id: value.id,
    name: value.name,
    description: typeof value.description === "string" ? value.description : undefined,
    draft: value.draft as unknown as ThemePresetDraft,
    variables: sanitizeAppliedThemeVariables(
      Object.fromEntries(
      Object.entries(value.variables).flatMap(([key, entryValue]) =>
        key.startsWith("--") && typeof entryValue === "string"
          ? [[key, entryValue] as const]
          : []
      )
    ) as Record<string, string>),
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  }
}

async function ensureStoreDirectory() {
  await mkdir(path.dirname(THEME_PRESETS_PATH), { recursive: true })
}

async function readThemePresetStore(): Promise<ThemePresetStorePayload> {
  try {
    const raw = await readFile(THEME_PRESETS_PATH, "utf8")
    const parsed = JSON.parse(raw) as { presets?: unknown }
    const presets = Array.isArray(parsed?.presets)
      ? parsed.presets
          .map((preset) => normalizeThemePresetRecord(preset))
          .filter((preset): preset is ThemePresetRecord => preset !== null)
          .sort((left, right) => left.name.localeCompare(right.name))
      : []

    return { presets }
  } catch (error) {
    const code = error instanceof Error && "code" in error ? (error as NodeJS.ErrnoException).code : null
    if (code === "ENOENT") {
      return { presets: [] }
    }
    throw error
  }
}

async function writeThemePresetStore(payload: ThemePresetStorePayload) {
  await ensureStoreDirectory()
  await writeFile(
    THEME_PRESETS_PATH,
    JSON.stringify(
      {
        presets: payload.presets.sort((left, right) => left.name.localeCompare(right.name)),
      },
      null,
      2
    ),
    "utf8"
  )
}

export async function listThemePresets(): Promise<ThemePresetRecord[]> {
  const store = await readThemePresetStore()
  return store.presets
}

export async function listThemePresetSummaries(): Promise<ThemePresetSummary[]> {
  const presets = await listThemePresets()
  return presets.map(({ id, name, description, updatedAt }) => ({
    id,
    name,
    description,
    updatedAt,
  }))
}

export async function getThemePresetById(id: string) {
  const presets = await listThemePresets()
  return presets.find((preset) => preset.id === id) ?? null
}

export async function saveThemePreset(input: {
  id?: string
  name: string
  description?: string
  draft: ThemePresetDraft
  variables: Record<string, string>
}) {
  const name = input.name.trim()
  if (!name) {
    throw new Error("Theme name is required")
  }

  const normalizedVariables = sanitizeAppliedThemeVariables(
    Object.fromEntries(
      Object.entries(input.variables).filter(
        ([key, value]) => key.startsWith("--") && typeof value === "string" && value.length > 0
      )
    )
  )

  const store = await readThemePresetStore()
  const now = new Date().toISOString()
  const existingIndex = input.id
    ? store.presets.findIndex((preset) => preset.id === input.id)
    : -1

  if (existingIndex >= 0) {
    const existing = store.presets[existingIndex]
    const updated: ThemePresetRecord = {
      ...existing,
      name,
      description: input.description?.trim() || undefined,
      draft: input.draft,
      variables: normalizedVariables,
      updatedAt: now,
    }
    store.presets.splice(existingIndex, 1, updated)
    await writeThemePresetStore(store)
    return updated
  }

  const created: ThemePresetRecord = {
    id: randomUUID(),
    name,
    description: input.description?.trim() || undefined,
    draft: input.draft,
    variables: normalizedVariables,
    createdAt: now,
    updatedAt: now,
  }

  store.presets.push(created)
  await writeThemePresetStore(store)
  return created
}
