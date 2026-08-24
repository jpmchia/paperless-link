import { postJson } from "@/lib/paperless-client"

export type MergeAsVersionsPayload = {
  documents: number[]
  root_document_id: number
  version_label?: string
}

export function validateMergeAsVersionsPayload(
  payload: MergeAsVersionsPayload
): string | null {
  const documents = Array.from(new Set(payload.documents))
  if (documents.length < 2) {
    return "Select at least two documents"
  }
  if (!documents.includes(payload.root_document_id)) {
    return "Root document must be one of the selected documents"
  }
  const sourceCount = documents.length - 1
  if (payload.version_label && sourceCount !== 1) {
    return "Version label is only allowed when merging one source document"
  }
  return null
}

export function buildMergeAsVersionsPayload(options: {
  rootDocumentId: number
  sourceDocumentIds: number[]
  versionLabel?: string
}): MergeAsVersionsPayload {
  const sources = options.sourceDocumentIds.filter(
    (id) => id !== options.rootDocumentId
  )
  const documents = [options.rootDocumentId, ...sources]
  const label = options.versionLabel?.trim()
  return {
    documents,
    root_document_id: options.rootDocumentId,
    ...(label && sources.length === 1 ? { version_label: label } : {}),
  }
}

export async function mergeDocumentsAsVersions(
  payload: MergeAsVersionsPayload
): Promise<unknown> {
  const error = validateMergeAsVersionsPayload(payload)
  if (error) throw new Error(error)
  return postJson("/api/proxy/documents/merge_as_versions/", payload)
}
