import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}))

vi.mock("@/auth", () => ({
  authOptions: {},
}))

vi.mock("@/lib/api", () => ({
  getPaperlessApi: vi.fn(),
}))

vi.mock("@/lib/paperless-transport", () => ({
  paperlessJsonAccept: vi.fn(() => "application/json; version=10"),
}))

import { getServerSession } from "next-auth"
import { getPaperlessApi } from "@/lib/api"
import { updateUiSettings } from "@/app/actions/ui-settings"

describe("updateUiSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getServerSession).mockResolvedValue({ accessToken: "session-token" })
    vi.mocked(getPaperlessApi).mockResolvedValue({
      settings: {
        date_display: {
          date_format: "mediumDate",
          date_locale: "en-US",
        },
        saved_views: {
          sidebar_views_visible_ids: [1, 2],
          warn_on_unsaved_change: true,
        },
      },
    })
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ settings: {} }),
      })
    )
  })

  it("deep merges nested ui setting objects before writing", async () => {
    await updateUiSettings({
      date_display: {
        date_format: "shortDate",
      },
      saved_views: {
        sidebar_views_visible_ids: [4],
      },
    })

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("api/ui_settings/"),
      expect.objectContaining({
        body: JSON.stringify({
          settings: {
            date_display: {
              date_format: "shortDate",
              date_locale: "en-US",
            },
            saved_views: {
              sidebar_views_visible_ids: [4],
              warn_on_unsaved_change: true,
            },
          },
        }),
      })
    )
  })
})
