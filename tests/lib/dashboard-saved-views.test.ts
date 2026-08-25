import { describe, expect, it, vi } from "vitest"
import {
  loadDashboardSavedViewWidgets,
  normalizeDashboardSavedViewWidget,
  orderDashboardSavedViews,
} from "@/lib/dashboard-saved-views"

describe("dashboard saved view helpers", () => {
  const savedViews = [
    {
      id: 5,
      name: "Inbox",
      show_in_sidebar: true,
      show_on_dashboard: true,
    },
    {
      id: 2,
      name: "Needs review",
      show_in_sidebar: false,
      show_on_dashboard: true,
    },
    {
      id: 3,
      name: "Hidden",
      show_in_sidebar: false,
      show_on_dashboard: false,
    },
    {
      id: 4,
      name: "Recent",
      show_in_sidebar: false,
      show_on_dashboard: true,
    },
  ]

  it("orders dashboard views from nested ui settings and appends new ones deterministically", () => {
    expect(
      orderDashboardSavedViews(savedViews, {
        saved_views: {
          dashboard_views_sort_order: [2],
        },
      }).map((view) => view.id)
    ).toEqual([2, 4, 5])
  })

  it("normalizes widget payloads without losing total count", () => {
    expect(
      normalizeDashboardSavedViewWidget({
        count: 12,
        documents: [
          {
            created: "2026-03-17T10:00:00Z",
            id: 9,
            title: "Invoice 9",
          },
        ],
        view: savedViews[0],
      })
    ).toEqual({
      count: 12,
      documents: [
        {
          created: "2026-03-17T10:00:00Z",
          id: 9,
          title: "Invoice 9",
        },
      ],
      error: null,
      view: savedViews[0],
    })
  })

  it("loads first-page widget data in dashboard order", async () => {
    const fetchDocuments = vi.fn(
      async (view: (typeof savedViews)[number], pageSize: number) => ({
        count: view.id * 10,
        documents: [
          {
            created: "2026-03-17T10:00:00Z",
            document_type: null,
            id: view.id * 100,
            correspondent: null,
            title: `${view.name} doc`,
          },
        ],
        pageSize,
      })
    )

    const widgets = await loadDashboardSavedViewWidgets(
      savedViews,
      {
        saved_views: {
          dashboard_views_sort_order: [2],
        },
      },
      fetchDocuments
    )

    expect(fetchDocuments.mock.calls.map(([view]) => view.id)).toEqual([2, 4, 5])
    expect(widgets).toEqual([
      expect.objectContaining({
        count: 20,
        documents: [expect.objectContaining({ id: 200, title: "Needs review doc" })],
        view: expect.objectContaining({ id: 2 }),
      }),
      expect.objectContaining({
        count: 40,
        documents: [expect.objectContaining({ id: 400, title: "Recent doc" })],
        view: expect.objectContaining({ id: 4 }),
      }),
      expect.objectContaining({
        count: 50,
        documents: [expect.objectContaining({ id: 500, title: "Inbox doc" })],
        view: expect.objectContaining({ id: 5 }),
      }),
    ])
  })
})
