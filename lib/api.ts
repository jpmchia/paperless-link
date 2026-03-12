import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"

const baseUrl = process.env.PAPERLESS_API_URL || "http://localhost:8000/"

export async function getPaperlessApi(endpoint: string, options: RequestInit = {}) {
  const session = await getServerSession(authOptions as any)
  const token = (session as any)?.accessToken

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
    // Adding Next.js revalidation/caching configuration
    next: { revalidate: 0 }, 
  })

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error(`Auth Error: ${response.statusText}`)
    }
    throw new Error(`API Error ${response.status}: ${response.statusText}`)
  }

  return response.json()
}

// Higher level abstractions
export async function getDocumentStatistics() {
  try {
    const stats = await getPaperlessApi("statistics/")
    return stats
  } catch (error) {
    console.error("Failed to fetch document statistics:", error)
    return { documents_total: 0, documents_inbox: 0 }
  }
}

export async function getRecentDocuments(limit: number = 5) {
  try {
    // Ordering by -added returns newest documents first
    const data = await getPaperlessApi(`documents/?ordering=-added&page_size=${limit}`) as any
    return data.results || []
  } catch (error) {
    console.error("Failed to fetch recent documents:", error)
    return []
  }
}

export async function getSavedViews() {
    try {
        const data = await getPaperlessApi('saved_views/') as any
        return data.results || []
    } catch (error) {
        console.error("Failed to fetch saved views", error)
        return []
    }
}

export async function getDocuments(page: number = 1, pageSize: number = 25, query: string = "") {
  try {
    const queryParam = query ? `&query=${encodeURIComponent(query)}` : ""
    const data = await getPaperlessApi(`documents/?page=${page}&page_size=${pageSize}${queryParam}`) as any
    return {
      count: data.count,
      next: data.next,
      previous: data.previous,
      results: data.results || []
    }
  } catch (error) {
    console.error("Failed to fetch documents:", error)
    return { count: 0, next: null, previous: null, results: [] }
  }
}

export async function getDocument(id: number | string) {
  try {
    const data = await getPaperlessApi(`documents/${id}/`)
    return data
  } catch (error) {
    console.error(`Failed to fetch document ${id}:`, error)
    return null
  }
}

export async function getDocumentMetadata(id: number | string) {
  try {
    const data = await getPaperlessApi(`documents/${id}/metadata/`)
    return data
  } catch (error) {
    console.error(`Failed to fetch metadata for document ${id}:`, error)
    return null
  }
}

export async function getCorrespondents() {
  try {
    const data = await getPaperlessApi('correspondents/?page_size=100000') as any
    return data.results || []
  } catch (error) {
    console.error("Failed to fetch correspondents:", error)
    return []
  }
}

export async function getDocumentTypes() {
  try {
    const data = await getPaperlessApi('document_types/?page_size=100000') as any
    return data.results || []
  } catch (error) {
    console.error("Failed to fetch document types:", error)
    return []
  }
}

export async function getStoragePaths() {
  try {
    const data = await getPaperlessApi('storage_paths/?page_size=100000') as any
    return data.results || []
  } catch (error) {
    console.error("Failed to fetch storage paths:", error)
    return []
  }
}

export async function getTags() {
  try {
    const data = await getPaperlessApi('tags/?page_size=100000') as any
    return data.results || []
  } catch (error) {
    console.error("Failed to fetch tags:", error)
    return []
  }
}

export async function getCustomFields() {
  try {
    const data = await getPaperlessApi('custom_fields/?page_size=100000') as any
    return data.results || []
  } catch (error) {
    console.error("Failed to fetch custom fields:", error)
    return []
  }
}
