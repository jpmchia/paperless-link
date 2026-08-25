export interface DocumentEmailPayload {
  documents: number[]
  addresses: string
  subject: string
  message: string
  use_archive_version: boolean
}

interface BuildDocumentEmailPayloadInput {
  documentIds: number[]
  addresses: string
  subject: string
  message: string
  useArchiveVersion: boolean
}

const EMAIL_ADDRESS_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function parseDocumentEmailAddresses(value: string): string[] {
  const uniqueAddresses = new Map<string, string>()

  value
    .split(/[,;\n]+/)
    .map((address) => address.trim())
    .filter(Boolean)
    .forEach((address) => {
      const key = address.toLowerCase()
      if (!uniqueAddresses.has(key)) uniqueAddresses.set(key, address)
    })

  return [...uniqueAddresses.values()]
}

export function validateDocumentEmailAddresses(value: string): string[] {
  return parseDocumentEmailAddresses(value).filter(
    (address) => !EMAIL_ADDRESS_PATTERN.test(address)
  )
}

export function buildDocumentEmailPayload({
  documentIds,
  addresses,
  subject,
  message,
  useArchiveVersion,
}: BuildDocumentEmailPayloadInput): DocumentEmailPayload {
  return {
    documents: [...new Set(documentIds.filter(Number.isInteger))],
    addresses: parseDocumentEmailAddresses(addresses).join(","),
    subject: subject.trim(),
    message: message.trim(),
    use_archive_version: useArchiveVersion,
  }
}
