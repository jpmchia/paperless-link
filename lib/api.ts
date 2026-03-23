import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"

const baseUrl = process.env.PAPERLESS_API_URL || "http://localhost:8000/"

export interface PaginatedResults<T> {
  count?: number
  next?: string | null
  previous?: string | null
  results?: T[]
}

export async function getPaperlessApi<T = unknown>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const session = await getServerSession(authOptions)
  const token = session?.accessToken

  if (!token) {
    throw new Error("Unauthorized: No access token available")
  }

  const defaultHeaders = {
    Authorization: `Token ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json; version=2",
  }

  const response = await fetch(`${baseUrl}api/${endpoint}`, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
    next: { revalidate: 0 },
  })

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error(`Auth Error: ${response.statusText}`)
    }
    throw new Error(`API Error ${response.status}: ${response.statusText}`)
  }

  return response.json() as Promise<T>
}

// -----------------------------------------------------------------------
// Filter params type — mirrors all supported Paperless-NGX query params
// -----------------------------------------------------------------------
export interface FilterParams {
  // Full-text search
  query?: string
  titleContains?: string
  contentContains?: string
  titleContentContains?: string
  moreLikeId?: number | null
  // Taxonomy — single
  correspondent?: number | null
  documentType?: number | null
  storagePath?: number | null
  // Taxonomy — multi (any / none)
  correspondentAny?: number[]
  correspondentNone?: number[]
  documentTypeAny?: number[]
  documentTypeNone?: number[]
  storagePathAny?: number[]
  storagePathNone?: number[]
  // Tags
  tags?: number[]           // all of these must be present
  tagsAny?: number[]        // at least one of these
  tagsExclude?: number[]    // none of these
  hasTag?: boolean | null   // is_tagged
  isInInbox?: boolean | null
  // ASN
  asnGte?: number | null
  asnLte?: number | null
  asnIsNull?: boolean
  // Dates (ISO string yyyy-mm-dd)
  createdAfter?: string
  createdBefore?: string
  createdYear?: number
  createdMonth?: number
  createdDay?: number
  addedAfter?: string
  addedBefore?: string
  // Sorting: prefix with "-" for descending, e.g. "-created"
  ordering?: string
  // Custom fields
  customFieldQuery?: string
  customFieldsContain?: string
  // Ownership
  owner?: number | null
  ownerAny?: number[]
  ownerExclude?: number[]
  ownerIsNull?: boolean
  sharedByUser?: number
}

export function buildDocumentQueryString(
  page: number,
  pageSize: number,
  filters: FilterParams
): string {
  const params = new URLSearchParams()
  params.set("page", String(page))
  params.set("page_size", String(pageSize))

  if (filters.query) params.set("query", filters.query)
  if (filters.titleContains) params.set("title__icontains", filters.titleContains)
  if (filters.contentContains) params.set("content__icontains", filters.contentContains)
  if (filters.titleContentContains) params.set("title_content", filters.titleContentContains)
  if (filters.moreLikeId) params.set("more_like_id", String(filters.moreLikeId))

  if (filters.correspondent != null) params.set("correspondent__id", String(filters.correspondent))
  if (filters.correspondentAny?.length) params.set("correspondent__id__in", filters.correspondentAny.join(","))
  if (filters.correspondentNone?.length) params.set("correspondent__id__none", filters.correspondentNone.join(","))

  if (filters.documentType != null) params.set("document_type__id", String(filters.documentType))
  if (filters.documentTypeAny?.length) params.set("document_type__id__in", filters.documentTypeAny.join(","))
  if (filters.documentTypeNone?.length) params.set("document_type__id__none", filters.documentTypeNone.join(","))

  if (filters.storagePath != null) params.set("storage_path__id", String(filters.storagePath))
  if (filters.storagePathAny?.length) params.set("storage_path__id__in", filters.storagePathAny.join(","))
  if (filters.storagePathNone?.length) params.set("storage_path__id__none", filters.storagePathNone.join(","))

  if (filters.tags?.length) params.set("tags__id__all", filters.tags.join(","))
  if (filters.tagsAny?.length) params.set("tags__id__in", filters.tagsAny.join(","))
  if (filters.tagsExclude?.length) params.set("tags__id__none", filters.tagsExclude.join(","))
  if (filters.hasTag != null) params.set("is_tagged", String(filters.hasTag))
  if (filters.isInInbox != null) params.set("is_in_inbox", String(filters.isInInbox))

  if (filters.createdAfter) params.set("created__date__gt", filters.createdAfter)
  if (filters.createdBefore) params.set("created__date__lt", filters.createdBefore)
  if (filters.createdYear) params.set("created__year", String(filters.createdYear))
  if (filters.createdMonth) params.set("created__month", String(filters.createdMonth))
  if (filters.createdDay) params.set("created__day", String(filters.createdDay))
  if (filters.addedAfter) params.set("added__date__gt", filters.addedAfter)
  if (filters.addedBefore) params.set("added__date__lt", filters.addedBefore)

  if (filters.asnGte != null) params.set("archive_serial_number__gte", String(filters.asnGte))
  if (filters.asnLte != null) params.set("archive_serial_number__lte", String(filters.asnLte))
  if (filters.asnIsNull) params.set("archive_serial_number__isnull", "true")

  if (filters.ordering) params.set("ordering", filters.ordering)
  if (filters.customFieldQuery) params.set("custom_field_query", filters.customFieldQuery)
  if (filters.customFieldsContain) params.set("custom_fields__icontains", filters.customFieldsContain)

  if (filters.owner != null) params.set("owner__id", String(filters.owner))
  if (filters.ownerAny?.length) params.set("owner__id__in", filters.ownerAny.join(","))
  if (filters.ownerExclude?.length) params.set("owner__id__none", filters.ownerExclude.join(","))
  if (filters.ownerIsNull === true) params.set("owner__isnull", "true")
  if (filters.ownerIsNull === false) params.set("owner__isnull", "false")
  if (filters.sharedByUser != null) params.set("shared_by__id", String(filters.sharedByUser))

  return params.toString()
}

// -----------------------------------------------------------------------
// Filter rule type → FilterParams
// Rule type IDs from NGX src/app/data/filter-rule-type.ts
// -----------------------------------------------------------------------
type SavedViewLike = {
  filter_rules?: Array<{ rule_type?: number; value?: string | number | boolean | null }>
  sort_field?: string | null
  sort_reverse?: boolean | null
}

export function filterParamsFromSavedView(view: SavedViewLike): FilterParams {
  const params: FilterParams = {}

  if (view.sort_field) {
    params.ordering = view.sort_reverse ? `-${view.sort_field}` : view.sort_field
  }

  for (const rule of view.filter_rules || []) {
    const { rule_type, value } = rule
    const stringValue =
      typeof value === "string" ? value : value == null ? undefined : String(value)
    switch (rule_type) {
      // Text/content
      case 0:  params.titleContains = stringValue; break
      case 1:  params.contentContains = stringValue; break
      case 19: params.titleContentContains = stringValue; break
      case 20: params.query = stringValue; break
      case 21: params.moreLikeId = Number(value); break
      // Correspondent
      case 3:  params.correspondent = Number(value); break
      case 26: { if (!params.correspondentAny) params.correspondentAny = []; params.correspondentAny.push(Number(value)); break }
      case 27: { if (!params.correspondentNone) params.correspondentNone = []; params.correspondentNone.push(Number(value)); break }
      // Document type
      case 4:  params.documentType = Number(value); break
      case 28: { if (!params.documentTypeAny) params.documentTypeAny = []; params.documentTypeAny.push(Number(value)); break }
      case 29: { if (!params.documentTypeNone) params.documentTypeNone = []; params.documentTypeNone.push(Number(value)); break }
      // Storage path
      case 25: params.storagePath = Number(value); break
      case 30: { if (!params.storagePathAny) params.storagePathAny = []; params.storagePathAny.push(Number(value)); break }
      case 31: { if (!params.storagePathNone) params.storagePathNone = []; params.storagePathNone.push(Number(value)); break }
      // Tags
      case 6:  { if (!params.tags) params.tags = []; params.tags.push(Number(value)); break }
      case 22: { if (!params.tagsAny) params.tagsAny = []; params.tagsAny.push(Number(value)); break }
      case 17: { if (!params.tagsExclude) params.tagsExclude = []; params.tagsExclude.push(Number(value)); break }
      case 7:  params.hasTag = value !== 'false'; break
      case 5:  params.isInInbox = value !== 'false'; break
      // ASN
      case 2:  params.asnGte = Number(value); break
      case 18: params.asnIsNull = true; break
      case 23: params.asnGte = Number(value); break
      case 24: params.asnLte = Number(value); break
      // Dates — created
      case 8:  params.createdBefore = stringValue; break
      case 9:  params.createdAfter = stringValue; break
      case 43: params.createdBefore = stringValue; break
      case 44: params.createdAfter = stringValue; break
      case 10: params.createdYear = Number(value); break
      case 11: params.createdMonth = Number(value); break
      case 12: params.createdDay = Number(value); break
      // Dates — added
      case 13: params.addedBefore = stringValue; break
      case 14: params.addedAfter = stringValue; break
      case 45: params.addedBefore = stringValue; break
      case 46: params.addedAfter = stringValue; break
      // Custom fields
      case 36: params.customFieldsContain = stringValue; break
      case 42: params.customFieldQuery = stringValue; break
      // Permissions / ownership
      case 32: params.owner = Number(value); break
      case 33: { if (!params.ownerAny) params.ownerAny = []; params.ownerAny.push(Number(value)); break }
      case 34: params.ownerIsNull = value !== "false"; break
      case 35: { if (!params.ownerExclude) params.ownerExclude = []; params.ownerExclude.push(Number(value)); break }
      case 37: params.sharedByUser = Number(value); break
      default: break
    }
  }
  return params
}

// -----------------------------------------------------------------------
// Higher level abstractions
// -----------------------------------------------------------------------
export async function getDocumentStatistics<T extends object = { documents_total: number; documents_inbox: number }>() {
  try {
    return await getPaperlessApi<T>("statistics/")
  } catch (error) {
    console.error("Failed to fetch document statistics:", error)
    return { documents_total: 0, documents_inbox: 0 } as T
  }
}

export async function getRecentDocuments<T = unknown>(limit: number = 5): Promise<T[]> {
  try {
    const data = await getPaperlessApi<PaginatedResults<T>>(
      `documents/?ordering=-added&page_size=${limit}`
    )
    return data.results || []
  } catch (error) {
    console.error("Failed to fetch recent documents:", error)
    return []
  }
}

export async function getSavedViews<T = unknown>(): Promise<T[]> {
  try {
    const data = await getPaperlessApi<PaginatedResults<T>>("saved_views/")
    return data.results || []
  } catch (error) {
    console.error("Failed to fetch saved views", error)
    return [] as T[]
  }
}

export async function getSavedView<T = unknown>(id: number | string): Promise<T | null> {
  try {
    return await getPaperlessApi<T>(`saved_views/${id}/`)
  } catch (error) {
    console.error(`Failed to fetch saved view ${id}:`, error)
    return null
  }
}

export async function getUiSettings<T extends object = Record<string, unknown>>(): Promise<T> {
  try {
    return await getPaperlessApi<T>("ui_settings/")
  } catch (error) {
    console.error("Failed to fetch UI settings:", error)
    return {} as T
  }
}

export async function getDocuments(
  page: number = 1,
  pageSize: number = 25,
  filters: FilterParams = {}
) {
  try {
    const qs = buildDocumentQueryString(page, pageSize, filters)
    const data = await getPaperlessApi<PaginatedResults<unknown>>(`documents/?${qs}`)
    return {
      count: data.count,
      next: data.next,
      previous: data.previous,
      results: data.results || [],
    }
  } catch (error) {
    console.error("Failed to fetch documents:", error)
    return { count: 0, next: null, previous: null, results: [] }
  }
}

export async function getSearchAutocomplete(term: string, limit: number = 10): Promise<string[]> {
  try {
    const data = await getPaperlessApi<unknown>(
      `search/autocomplete/?term=${encodeURIComponent(term)}&limit=${limit}`
    )
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error("Failed to fetch autocomplete:", error)
    return []
  }
}

export async function getDocument<T = unknown>(id: number | string): Promise<T | null> {
  try {
    return await getPaperlessApi<T>(`documents/${id}/?full_perms=true`)
  } catch (error) {
    console.error(`Failed to fetch document ${id}:`, error)
    return null
  }
}

export async function getDocumentMetadata<T = unknown>(id: number | string): Promise<T | null> {
  try {
    return await getPaperlessApi<T>(`documents/${id}/metadata/`)
  } catch (error) {
    console.error(`Failed to fetch metadata for document ${id}:`, error)
    return null
  }
}

export async function getDocumentHistory<T = unknown>(id: number | string): Promise<T[]> {
  try {
    const data = await getPaperlessApi<unknown>(`documents/${id}/history/`)
    return Array.isArray(data) ? (data as T[]) : []
  } catch (error) {
    console.error(`Failed to fetch history for document ${id}:`, error)
    return [] as T[]
  }
}

export async function getUsers<T = unknown>(): Promise<T[]> {
  try {
    const data = await getPaperlessApi<PaginatedResults<T>>("users/?page_size=100000")
    return data.results || []
  } catch (error) {
    console.error("Failed to fetch users:", error)
    return [] as T[]
  }
}

export async function getGroups<T = unknown>(): Promise<T[]> {
  try {
    const data = await getPaperlessApi<PaginatedResults<T>>("groups/?page_size=100000")
    return data.results || []
  } catch (error) {
    console.error("Failed to fetch groups:", error)
    return [] as T[]
  }
}

export async function getCorrespondents<T = unknown>(): Promise<T[]> {
  try {
    const data = await getPaperlessApi<PaginatedResults<T>>("correspondents/?page_size=100000")
    return data.results || []
  } catch (error) {
    console.error("Failed to fetch correspondents:", error)
    return [] as T[]
  }
}

export async function getDocumentTypes<T = unknown>(): Promise<T[]> {
  try {
    const data = await getPaperlessApi<PaginatedResults<T>>("document_types/?page_size=100000")
    return data.results || []
  } catch (error) {
    console.error("Failed to fetch document types:", error)
    return [] as T[]
  }
}

export async function getStoragePaths<T = unknown>(): Promise<T[]> {
  try {
    const data = await getPaperlessApi<PaginatedResults<T>>("storage_paths/?page_size=100000")
    return data.results || []
  } catch (error) {
    console.error("Failed to fetch storage paths:", error)
    return [] as T[]
  }
}

export async function getTags<T = unknown>(): Promise<T[]> {
  try {
    const data = await getPaperlessApi<PaginatedResults<T>>("tags/?page_size=100000")
    return data.results || []
  } catch (error) {
    console.error("Failed to fetch tags:", error)
    return [] as T[]
  }
}

export async function getCustomFields<T = unknown>(): Promise<T[]> {
  try {
    const data = await getPaperlessApi<PaginatedResults<T>>("custom_fields/?page_size=100000")
    return data.results || []
  } catch (error) {
    console.error("Failed to fetch custom fields:", error)
    return [] as T[]
  }
}

export async function getProfile<T = unknown>(): Promise<T | null> {
  try {
    return await getPaperlessApi<T>("profile/")
  } catch (error) {
    console.error("Failed to fetch profile:", error)
    return null
  }
}

export async function getSocialAccountProviders<T = unknown>(): Promise<T[]> {
  try {
    const data = await getPaperlessApi<unknown>("profile/social_account_providers/")
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error("Failed to fetch social account providers:", error)
    return [] as T[]
  }
}

export async function getDocumentNotes<T = unknown>(id: string | number): Promise<T[]> {
  try {
    const data = await getPaperlessApi<unknown>(`documents/${id}/notes/`)
    return Array.isArray(data) ? (data as T[]) : []
  } catch (error) {
    console.error("Failed to fetch document notes:", error)
    return [] as T[]
  }
}
