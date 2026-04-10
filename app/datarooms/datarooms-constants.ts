export const STANDARD_METADATA_FIELDS = [
  { key: "title", label: "Title" },
  { key: "content", label: "Content" },
  { key: "created", label: "Created date" },
  { key: "correspondent", label: "Correspondent" },
  { key: "document_type", label: "Document type" },
  { key: "tags", label: "Tags" },
  { key: "archive_serial_number", label: "Archive serial number" },
  { key: "storage_path", label: "Storage path" },
  { key: "original_md5", label: "Original MD5 checksum" },
  { key: "archive_md5", label: "Archive MD5 checksum" },
  { key: "original_file_size", label: "Original file size (bytes)" },
  { key: "archive_file_size", label: "Archive file size (bytes)" },
] as const

export const ACCESS_PRESETS = [
  "one-time access",
  "12 hours",
  "24 hours",
  "48 hours",
  "5 days",
  "1 week",
  "2 weeks",
  "1 month",
  "3 months",
  "indefinitely",
]

export const EMAIL_TEMPLATE_DEFINITIONS = [
  {
    key: "activation",
    name: "Activation",
    variables: [
      "{{MagicURL}}",
      "{{DataroomTitle}}",
      "{{InviteeEmail}}",
      "{{BrandingLogoURL}}",
      "{{LoginUrl}}",
      "{{ValidityText}}",
      "{{ValidUntil}}",
    ],
  },
  {
    key: "magic_link_login",
    name: "Magic Link Login",
    variables: [
      "{{MagicURL}}",
      "{{DataroomTitle}}",
      "{{InviteeEmail}}",
      "{{BrandingLogoURL}}",
      "{{LoginUrl}}",
      "{{ValidityText}}",
      "{{ValidUntil}}",
    ],
  },
] as const

export const AUTO_PUBLISH_TIMES = Array.from({ length: 48 }, (_, index) => {
  const hour = String(Math.floor(index / 2)).padStart(2, "0")
  const minute = index % 2 === 0 ? "00" : "30"
  return `${hour}:${minute}`
})
