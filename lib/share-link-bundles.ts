import { deleteJson, getJson, postJson, withQuery } from "@/lib/paperless-client"
import type {
  ShareLinkBundleCreatePayload,
  ShareLinkBundleSummary,
} from "@/data/share-link-bundle"
import { ShareLinkBundleStatus } from "@/data/share-link-bundle"

export function validateShareLinkBundlePayload(
  payload: ShareLinkBundleCreatePayload
): string | null {
  const documentIds = Array.from(new Set(payload.document_ids)).filter((id) =>
    Number.isFinite(id)
  )
  if (documentIds.length === 0) {
    return "Select at least one document"
  }
  if (
    payload.expiration_days !== null &&
    (!Number.isFinite(payload.expiration_days) || payload.expiration_days < 1)
  ) {
    return "Expiration must be empty or at least 1 day"
  }
  return null
}

export function normalizeShareLinkBundlePayload(
  payload: ShareLinkBundleCreatePayload
): ShareLinkBundleCreatePayload {
  return {
    document_ids: Array.from(new Set(payload.document_ids)),
    file_version: payload.file_version,
    expiration_days: payload.expiration_days,
  }
}

export function getShareLinkBundlePublicUrl(
  slug: string,
  paperlessBaseUrl: string
): string {
  const apiURL = new URL(
    paperlessBaseUrl.endsWith("/") ? paperlessBaseUrl : `${paperlessBaseUrl}/`
  )
  const shareBase = apiURL.pathname.replace(/\/api\/?$/, "/share/")
  return `${apiURL.origin}${shareBase}${slug}`
}

export async function listShareLinkBundles(options?: {
  documentId?: number
}): Promise<ShareLinkBundleSummary[]> {
  const path = withQuery("/api/proxy/share_link_bundles/", {
    documents: options?.documentId,
    ordering: "-created",
    page_size: 1000,
  })
  const data = await getJson<
    ShareLinkBundleSummary[] | { results?: ShareLinkBundleSummary[] }
  >(path)
  return Array.isArray(data) ? data : (data.results ?? [])
}

export async function createShareLinkBundle(
  payload: ShareLinkBundleCreatePayload
): Promise<ShareLinkBundleSummary> {
  const normalized = normalizeShareLinkBundlePayload(payload)
  const error = validateShareLinkBundlePayload(normalized)
  if (error) throw new Error(error)
  return postJson<ShareLinkBundleSummary>(
    "/api/proxy/share_link_bundles/",
    normalized as unknown as Record<string, unknown>
  )
}

export async function rebuildShareLinkBundle(
  bundleId: number
): Promise<ShareLinkBundleSummary> {
  return postJson<ShareLinkBundleSummary>(
    `/api/proxy/share_link_bundles/${bundleId}/rebuild/`,
    {}
  )
}

export async function deleteShareLinkBundle(bundleId: number): Promise<void> {
  await deleteJson(`/api/proxy/share_link_bundles/${bundleId}/`)
}

export function isShareLinkBundleBusy(status: ShareLinkBundleStatus): boolean {
  return (
    status === ShareLinkBundleStatus.Pending ||
    status === ShareLinkBundleStatus.Processing
  )
}
