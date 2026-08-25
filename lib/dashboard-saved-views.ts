import { filterParamsFromSavedView, getDocuments } from "@/lib/api"
import { orderSavedViewsBySortOrder, readSavedViewVisibility } from "@/lib/saved-view-visibility"

export const DASHBOARD_SAVED_VIEW_ROW_LIMIT = 5

export interface DashboardSavedView {
  filter_rules?: Array<{
    rule_type?: number
    value?: string | number | boolean | null
  }>
  icon?: string
  id: number
  name: string
  page_size?: number | null
  show_in_sidebar?: boolean
  show_on_dashboard?: boolean
  sort_field?: string | null
  sort_reverse?: boolean | null
}

export interface DashboardSavedViewDocument {
  correspondent?: number | null
  created: string
  document_type?: number | null
  id: number
  title: string
}

export interface DashboardSavedViewWidget<
  TView extends DashboardSavedView = DashboardSavedView,
  TDocument extends DashboardSavedViewDocument = DashboardSavedViewDocument,
> {
  count: number
  documents: TDocument[]
  error: string | null
  view: TView
}

function normalizePageSize(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DASHBOARD_SAVED_VIEW_ROW_LIMIT
  }

  return Math.min(Math.max(Math.floor(value), 1), DASHBOARD_SAVED_VIEW_ROW_LIMIT)
}

export function orderDashboardSavedViews<T extends DashboardSavedView>(
  views: T[],
  settings: Record<string, unknown> | null | undefined
): T[] {
  const visibility = readSavedViewVisibility(settings)
  return orderSavedViewsBySortOrder(
    views.filter((view) => view.show_on_dashboard),
    visibility.dashboard_views_sort_order
  )
}

export function normalizeDashboardSavedViewWidget<
  TView extends DashboardSavedView,
  TDocument extends DashboardSavedViewDocument,
>(payload: {
  count?: number | null
  documents?: TDocument[] | null
  error?: string | null
  view: TView
}): DashboardSavedViewWidget<TView, TDocument> {
  const documents = Array.isArray(payload.documents) ? payload.documents : []
  return {
    count:
      typeof payload.count === "number" && Number.isFinite(payload.count)
        ? payload.count
        : documents.length,
    documents,
    error: payload.error ?? null,
    view: payload.view,
  }
}

export async function loadDashboardSavedViewWidgets<
  TView extends DashboardSavedView,
  TDocument extends DashboardSavedViewDocument,
>(
  views: TView[],
  settings: Record<string, unknown> | null | undefined,
  fetchDocuments: (
    view: TView,
    pageSize: number
  ) => Promise<{ count?: number | null; documents?: TDocument[] | null }> = async (
    view,
    pageSize
  ) => {
    const result = await getDocuments<TDocument>(
      1,
      pageSize,
      filterParamsFromSavedView(view)
    )

    return {
      count: result.count,
      documents: result.results,
    }
  }
): Promise<DashboardSavedViewWidget<TView, TDocument>[]> {
  const orderedViews = orderDashboardSavedViews(views, settings)

  return Promise.all(
    orderedViews.map(async (view) => {
      try {
        const result = await fetchDocuments(view, normalizePageSize(view.page_size))
        return normalizeDashboardSavedViewWidget({
          count: result.count,
          documents: result.documents,
          view,
        })
      } catch (error) {
        console.error(`Failed to load dashboard widget for saved view ${view.id}:`, error)
        return normalizeDashboardSavedViewWidget({
          count: 0,
          documents: [],
          error: "Failed to load documents",
          view,
        })
      }
    })
  )
}
