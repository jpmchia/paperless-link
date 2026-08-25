import { GlobalSearchType, SETTINGS_KEYS } from "@/data/ui-settings"

export interface UserNotificationPreferences {
  consumerFailed: boolean
  consumerNewDocument: boolean
  consumerSuccess: boolean
  documentUpdated: boolean
  suppressOnDashboard: boolean
}

export interface UserPreferences {
  dateFormat: string
  dateLocale: string
  darkModeThumbInverted: boolean
  notifications: UserNotificationPreferences
  pageSize: number
  searchDbOnly: boolean
  searchFullType: GlobalSearchType
  slimSidebar: boolean
  themeColor: string
  themePresetId: string | null
}

export const defaultNotificationPreferences: UserNotificationPreferences = {
  consumerFailed: true,
  consumerNewDocument: true,
  consumerSuccess: true,
  documentUpdated: false,
  suppressOnDashboard: true,
}

export const defaultUserPreferences: UserPreferences = {
  dateFormat: "mediumDate",
  dateLocale: "",
  darkModeThumbInverted: true,
  notifications: defaultNotificationPreferences,
  pageSize: 25,
  searchDbOnly: false,
  searchFullType: GlobalSearchType.TITLE_CONTENT,
  slimSidebar: false,
  themeColor: "",
  themePresetId: null,
}

type SettingsRecord = Record<string, unknown>

function isRecord(value: unknown): value is SettingsRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function hasOwn(value: unknown, key: string): boolean {
  return isRecord(value) && Object.prototype.hasOwnProperty.call(value, key)
}

function coerceBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value
  if (value === "true") return true
  if (value === "false") return false
  return undefined
}

function coerceNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

function coerceString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined
}

function getNestedValue(settings: SettingsRecord, path: string[]): unknown {
  let current: unknown = settings
  for (const segment of path) {
    if (!isRecord(current) || !hasOwn(current, segment)) {
      return undefined
    }
    current = current[segment]
  }
  return current
}

function getCanonicalValue(settings: SettingsRecord, key: string): unknown {
  const normalizedPath = key
    .replace("general-settings:", "")
    .split(":")
    .map((segment) => segment.replace(/-/g, "_"))

  const nestedValue = getNestedValue(settings, normalizedPath)
  if (nestedValue !== undefined) {
    return nestedValue
  }

  if (hasOwn(settings, key)) {
    return settings[key]
  }

  return undefined
}

function getFirstDefined(settings: SettingsRecord, candidates: unknown[]): unknown {
  for (const candidate of candidates) {
    if (candidate !== undefined) {
      return candidate
    }
  }
  return undefined
}

function readBoolean(
  settings: SettingsRecord,
  candidates: unknown[],
  fallback: boolean
): boolean {
  const value = coerceBoolean(getFirstDefined(settings, candidates))
  return value ?? fallback
}

function readNumber(
  settings: SettingsRecord,
  candidates: unknown[],
  fallback: number
): number {
  const value = coerceNumber(getFirstDefined(settings, candidates))
  return value ?? fallback
}

function readString(
  settings: SettingsRecord,
  candidates: unknown[],
  fallback: string
): string {
  const value = coerceString(getFirstDefined(settings, candidates))
  return value ?? fallback
}

function isGlobalSearchType(value: unknown): value is GlobalSearchType {
  return value === GlobalSearchType.ADVANCED || value === GlobalSearchType.TITLE_CONTENT
}

export function readUserPreferences(
  settings?: Record<string, unknown> | null
): UserPreferences {
  const values = isRecord(settings) ? settings : {}

  const consumerSuccessValue = getFirstDefined(values, [
    getCanonicalValue(values, SETTINGS_KEYS.NOTIFICATIONS_CONSUMER_SUCCESS),
    values.notifications_consumer_success,
    values.notifications_document_added,
    getNestedValue(values, ["notifications", "consumer_success"]),
  ])

  const searchFullTypeValue = getFirstDefined(values, [
    getCanonicalValue(values, SETTINGS_KEYS.SEARCH_FULL_TYPE),
    values.search_full_type,
  ])

  return {
    dateFormat: readString(
      values,
      [
        getCanonicalValue(values, SETTINGS_KEYS.DATE_FORMAT),
        values.date_format,
      ],
      defaultUserPreferences.dateFormat
    ),
    dateLocale: readString(
      values,
      [
        getCanonicalValue(values, SETTINGS_KEYS.DATE_LOCALE),
        values.date_locale,
      ],
      defaultUserPreferences.dateLocale
    ),
    darkModeThumbInverted: readBoolean(
      values,
      [
        getCanonicalValue(values, SETTINGS_KEYS.DARK_MODE_THUMB_INVERTED),
        values.dark_mode_thumb_inverted,
      ],
      defaultUserPreferences.darkModeThumbInverted
    ),
    notifications: {
      consumerFailed: readBoolean(
        values,
        [
          getCanonicalValue(values, SETTINGS_KEYS.NOTIFICATIONS_CONSUMER_FAILED),
          values.notifications_consumer_failed,
          getNestedValue(values, ["notifications", "consumer_failed"]),
        ],
        defaultNotificationPreferences.consumerFailed
      ),
      consumerNewDocument: readBoolean(
        values,
        [
          getCanonicalValue(values, SETTINGS_KEYS.NOTIFICATIONS_CONSUMER_NEW_DOCUMENT),
          values.notifications_consumer_new_document,
          getNestedValue(values, ["notifications", "consumer_new_documents"]),
        ],
        defaultNotificationPreferences.consumerNewDocument
      ),
      consumerSuccess: coerceBoolean(consumerSuccessValue) ??
        defaultNotificationPreferences.consumerSuccess,
      documentUpdated: readBoolean(
        values,
        [values.notifications_document_updated],
        defaultNotificationPreferences.documentUpdated
      ),
      suppressOnDashboard: readBoolean(
        values,
        [
          getCanonicalValue(
            values,
            SETTINGS_KEYS.NOTIFICATIONS_CONSUMER_SUPPRESS_ON_DASHBOARD
          ),
          values.notifications_consumer_suppress_on_dashboard,
          getNestedValue(values, ["notifications", "consumer_suppress_on_dashboard"]),
        ],
        defaultNotificationPreferences.suppressOnDashboard
      ),
    },
    pageSize: readNumber(
      values,
      [
        values.default_page_size,
        getCanonicalValue(values, SETTINGS_KEYS.DOCUMENT_LIST_SIZE),
      ],
      defaultUserPreferences.pageSize
    ),
    searchDbOnly: readBoolean(
      values,
      [
        getCanonicalValue(values, SETTINGS_KEYS.SEARCH_DB_ONLY),
        values.search_db_only,
      ],
      defaultUserPreferences.searchDbOnly
    ),
    searchFullType: isGlobalSearchType(searchFullTypeValue)
      ? searchFullTypeValue
      : defaultUserPreferences.searchFullType,
    slimSidebar: readBoolean(
      values,
      [
        getCanonicalValue(values, SETTINGS_KEYS.SLIM_SIDEBAR),
        values.slim_sidebar,
      ],
      defaultUserPreferences.slimSidebar
    ),
    themeColor: readString(
      values,
      [
        getCanonicalValue(values, SETTINGS_KEYS.THEME_COLOR),
        values.theme_color,
      ],
      defaultUserPreferences.themeColor
    ),
    themePresetId:
      coerceString(values.theme_preset_id) ?? defaultUserPreferences.themePresetId,
  }
}

export function serializeUserPreferencesPatch(
  patch: Partial<UserPreferences>
): Record<string, unknown> {
  const serialized: Record<string, unknown> = {}

  if ("dateLocale" in patch || "dateFormat" in patch) {
    serialized.date_display = {
      ...("dateLocale" in patch ? { date_locale: patch.dateLocale ?? "" } : {}),
      ...("dateFormat" in patch ? { date_format: patch.dateFormat ?? "" } : {}),
    }
  }

  if ("slimSidebar" in patch) {
    serialized.slim_sidebar = patch.slimSidebar ?? defaultUserPreferences.slimSidebar
  }

  if ("darkModeThumbInverted" in patch) {
    serialized.dark_mode = {
      thumb_inverted:
        patch.darkModeThumbInverted ?? defaultUserPreferences.darkModeThumbInverted,
    }
  }

  if ("themeColor" in patch) {
    serialized.theme = {
      color: patch.themeColor ?? defaultUserPreferences.themeColor,
    }
  }

  if ("searchDbOnly" in patch || "searchFullType" in patch) {
    serialized.search = {
      ...("searchDbOnly" in patch
        ? { db_only: patch.searchDbOnly ?? defaultUserPreferences.searchDbOnly }
        : {}),
      ...("searchFullType" in patch
        ? {
            more_link:
              patch.searchFullType ?? defaultUserPreferences.searchFullType,
          }
        : {}),
    }
  }

  if ("pageSize" in patch) {
    serialized.default_page_size = patch.pageSize ?? defaultUserPreferences.pageSize
  }

  if ("themePresetId" in patch) {
    serialized.theme_preset_id = patch.themePresetId ?? null
  }

  if ("notifications" in patch && patch.notifications) {
    serialized.notifications = {
      consumer_failed:
        patch.notifications.consumerFailed ??
        defaultNotificationPreferences.consumerFailed,
      consumer_new_documents:
        patch.notifications.consumerNewDocument ??
        defaultNotificationPreferences.consumerNewDocument,
      consumer_success:
        patch.notifications.consumerSuccess ??
        defaultNotificationPreferences.consumerSuccess,
      consumer_suppress_on_dashboard:
        patch.notifications.suppressOnDashboard ??
        defaultNotificationPreferences.suppressOnDashboard,
    }
    serialized.notifications_document_added =
      patch.notifications.consumerSuccess ??
      defaultNotificationPreferences.consumerSuccess
    serialized.notifications_document_updated =
      patch.notifications.documentUpdated ??
      defaultNotificationPreferences.documentUpdated
  }

  return serialized
}

const DATE_STYLE_OPTIONS: Record<string, Intl.DateTimeFormatOptions> = {
  shortDate: {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  },
  mediumDate: {
    day: "numeric",
    month: "short",
    year: "numeric",
  },
  longDate: {
    day: "numeric",
    month: "long",
    year: "numeric",
  },
  fullDate: {
    day: "numeric",
    month: "long",
    weekday: "long",
    year: "numeric",
  },
}

export function formatUserPreferenceDate(
  value: string | Date | null | undefined,
  preferences: Pick<UserPreferences, "dateFormat" | "dateLocale">,
  options: Intl.DateTimeFormatOptions = {}
): string {
  if (!value) return ""

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ""

  if (preferences.dateLocale === "iso-8601") {
    return date.toISOString().slice(0, 10)
  }

  const locale = preferences.dateLocale || undefined
  const formatOptions =
    DATE_STYLE_OPTIONS[preferences.dateFormat] ?? DATE_STYLE_OPTIONS.mediumDate

  return new Intl.DateTimeFormat(locale, {
    ...formatOptions,
    ...options,
  }).format(date)
}
