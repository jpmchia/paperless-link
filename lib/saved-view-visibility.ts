export type SavedViewVisibilitySettings = {
  dashboard_views_visible_ids: number[]
  sidebar_views_visible_ids: number[]
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function asIdList(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === "number" ? item : Number(item)))
    .filter((item) => Number.isFinite(item))
}

export function readSavedViewVisibility(
  settings: Record<string, unknown> | null | undefined
): SavedViewVisibilitySettings {
  const savedViews = asRecord(settings?.saved_views)
  return {
    dashboard_views_visible_ids: asIdList(savedViews?.dashboard_views_visible_ids),
    sidebar_views_visible_ids: asIdList(savedViews?.sidebar_views_visible_ids),
  }
}

export function applySavedViewVisibilityFlags<T extends { id: number }>(
  views: T[],
  visibility: SavedViewVisibilitySettings
): Array<
  T & {
    show_on_dashboard: boolean
    show_in_sidebar: boolean
  }
> {
  const dashboard = new Set(visibility.dashboard_views_visible_ids)
  const sidebar = new Set(visibility.sidebar_views_visible_ids)
  return views.map((view) => ({
    ...view,
    show_on_dashboard: dashboard.has(view.id),
    show_in_sidebar: sidebar.has(view.id),
  }))
}

export function patchSavedViewVisibilitySettings(
  settings: Record<string, unknown>,
  viewId: number,
  patch: { show_on_dashboard?: boolean; show_in_sidebar?: boolean }
): Record<string, unknown> {
  const current = readSavedViewVisibility(settings)
  const dashboard = new Set(current.dashboard_views_visible_ids)
  const sidebar = new Set(current.sidebar_views_visible_ids)

  if (patch.show_on_dashboard === true) dashboard.add(viewId)
  if (patch.show_on_dashboard === false) dashboard.delete(viewId)
  if (patch.show_in_sidebar === true) sidebar.add(viewId)
  if (patch.show_in_sidebar === false) sidebar.delete(viewId)

  const existingSavedViews = asRecord(settings.saved_views) ?? {}
  return {
    ...settings,
    saved_views: {
      ...existingSavedViews,
      dashboard_views_visible_ids: Array.from(dashboard).sort((a, b) => a - b),
      sidebar_views_visible_ids: Array.from(sidebar).sort((a, b) => a - b),
    },
  }
}

export function stripLegacyVisibilityFields<T extends Record<string, unknown>>(
  data: T
): Omit<T, "show_on_dashboard" | "show_in_sidebar"> & {
  show_on_dashboard?: boolean
  show_in_sidebar?: boolean
} {
  const {
    show_on_dashboard: _dashboard,
    show_in_sidebar: _sidebar,
    ...rest
  } = data
  return rest as Omit<T, "show_on_dashboard" | "show_in_sidebar">
}
