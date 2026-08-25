import { describe, expect, it } from "vitest"
import { GlobalSearchType, SETTINGS_KEYS } from "@/data/ui-settings"
import {
  formatUserPreferenceDate,
  readUserPreferences,
  serializeUserPreferencesPatch,
} from "@/lib/user-preferences"

describe("user preferences", () => {
  it("reads legacy flat keys and link aliases", () => {
    expect(
      readUserPreferences({
        date_locale: "en-US",
        date_format: "shortDate",
        default_page_size: 100,
        slim_sidebar: true,
        dark_mode_thumb_inverted: false,
        theme_color: "#112233",
        theme_preset_id: "preset-1",
        search_db_only: true,
        search_full_type: GlobalSearchType.ADVANCED,
        notifications_consumer_new_document: false,
        notifications_document_added: false,
        notifications_consumer_failed: false,
        notifications_consumer_suppress_on_dashboard: false,
        notifications_document_updated: true,
      })
    ).toMatchObject({
      dateFormat: "shortDate",
      dateLocale: "en-US",
      darkModeThumbInverted: false,
      notifications: {
        consumerFailed: false,
        consumerNewDocument: false,
        consumerSuccess: false,
        documentUpdated: true,
        suppressOnDashboard: false,
      },
      pageSize: 100,
      searchDbOnly: true,
      searchFullType: GlobalSearchType.ADVANCED,
      slimSidebar: true,
      themeColor: "#112233",
      themePresetId: "preset-1",
    })
  })

  it("reads nested NGX settings and canonical keys", () => {
    expect(
      readUserPreferences({
        documentListSize: 50,
        dark_mode: {
          thumb_inverted: "false",
        },
        date_display: {
          date_format: "longDate",
          date_locale: "de-DE",
        },
        notifications: {
          consumer_failed: true,
          consumer_new_documents: false,
          consumer_success: false,
          consumer_suppress_on_dashboard: false,
        },
        search: {
          db_only: "true",
          more_link: GlobalSearchType.ADVANCED,
        },
        theme: {
          color: "#abcdef",
        },
        theme_preset_id: "preset-2",
        [SETTINGS_KEYS.DATE_FORMAT]: "mediumDate",
      })
    ).toMatchObject({
      dateFormat: "longDate",
      dateLocale: "de-DE",
      darkModeThumbInverted: false,
      notifications: {
        consumerFailed: true,
        consumerNewDocument: false,
        consumerSuccess: false,
        suppressOnDashboard: false,
      },
      pageSize: 50,
      searchDbOnly: true,
      searchFullType: GlobalSearchType.ADVANCED,
      themeColor: "#abcdef",
      themePresetId: "preset-2",
    })
  })

  it("writes NGX nested shapes and link aliases", () => {
    expect(
      serializeUserPreferencesPatch({
        dateFormat: "shortDate",
        dateLocale: "en-GB",
        darkModeThumbInverted: false,
        notifications: {
          consumerFailed: false,
          consumerNewDocument: true,
          consumerSuccess: false,
          documentUpdated: true,
          suppressOnDashboard: false,
        },
        pageSize: 25,
        searchDbOnly: true,
        searchFullType: GlobalSearchType.ADVANCED,
        slimSidebar: true,
        themeColor: "#ff0000",
        themePresetId: null,
      })
    ).toEqual({
      dark_mode: {
        thumb_inverted: false,
      },
      date_display: {
        date_format: "shortDate",
        date_locale: "en-GB",
      },
      default_page_size: 25,
      notifications: {
        consumer_failed: false,
        consumer_new_documents: true,
        consumer_success: false,
        consumer_suppress_on_dashboard: false,
      },
      notifications_document_added: false,
      notifications_document_updated: true,
      search: {
        db_only: true,
        more_link: GlobalSearchType.ADVANCED,
      },
      slim_sidebar: true,
      theme: {
        color: "#ff0000",
      },
      theme_preset_id: null,
    })
  })

  it("formats dates with the active user preference style", () => {
    expect(
      formatUserPreferenceDate(
        "2026-08-25T00:00:00.000Z",
        {
          dateFormat: "shortDate",
          dateLocale: "en-GB",
        },
        { timeZone: "UTC" }
      )
    ).toBe("25/08/2026")
  })
})
