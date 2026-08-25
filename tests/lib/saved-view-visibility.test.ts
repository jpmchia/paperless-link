import { describe, expect, it } from "vitest"
import {
  applySavedViewVisibilityFlags,
  patchSavedViewOrderSettings,
  patchSavedViewVisibilitySettings,
  readSavedViewVisibility,
} from "@/lib/saved-view-visibility"

describe("saved view visibility helpers", () => {
  it("reads visibility ids from ui_settings", () => {
    expect(
      readSavedViewVisibility({
        saved_views: {
          dashboard_views_visible_ids: [1, "2"],
          dashboard_views_sort_order: ["2", 1],
          sidebar_views_visible_ids: [3],
          sidebar_views_sort_order: [3, "1"],
        },
      })
    ).toEqual({
      dashboard_views_visible_ids: [1, 2],
      dashboard_views_sort_order: [2, 1],
      sidebar_views_visible_ids: [3],
      sidebar_views_sort_order: [3, 1],
    })
  })

  it("applies visibility flags onto saved views", () => {
    const views = applySavedViewVisibilityFlags(
      [{ id: 1, name: "A" }, { id: 2, name: "B" }],
      {
        dashboard_views_sort_order: [],
        dashboard_views_visible_ids: [1],
        sidebar_views_sort_order: [],
        sidebar_views_visible_ids: [2],
      }
    )
    expect(views[0]).toMatchObject({
      id: 1,
      show_on_dashboard: true,
      show_in_sidebar: false,
    })
    expect(views[1]).toMatchObject({
      id: 2,
      show_on_dashboard: false,
      show_in_sidebar: true,
    })
  })

  it("patches visibility settings without dropping other keys", () => {
    const next = patchSavedViewVisibilitySettings(
      {
        theme: "dark",
        saved_views: {
          dashboard_views_visible_ids: [1],
          sidebar_views_visible_ids: [1],
          extra: true,
        },
      },
      2,
      { show_on_dashboard: true, show_in_sidebar: false }
    )
    expect(next).toEqual({
      theme: "dark",
      saved_views: {
        dashboard_views_visible_ids: [1, 2],
        dashboard_views_sort_order: [],
        sidebar_views_visible_ids: [1],
        sidebar_views_sort_order: [],
        extra: true,
      },
    })
  })

  it("patches sort order settings without dropping other keys", () => {
    const next = patchSavedViewOrderSettings(
      {
        theme: "dark",
        saved_views: {
          dashboard_views_visible_ids: [1, 2],
          dashboard_views_sort_order: [2, 1],
          sidebar_views_visible_ids: [1],
          sidebar_views_sort_order: [1],
          extra: true,
        },
      },
      {
        dashboard_views_sort_order: [2, 3, 1],
      }
    )

    expect(next).toEqual({
      theme: "dark",
      saved_views: {
        dashboard_views_visible_ids: [1, 2],
        dashboard_views_sort_order: [2, 3, 1],
        sidebar_views_visible_ids: [1],
        sidebar_views_sort_order: [1],
        extra: true,
      },
    })
  })
})
