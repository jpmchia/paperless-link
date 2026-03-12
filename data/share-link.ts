import { ObjectWithPermissions } from './object-with-permissions'

export enum FileVersion {
  Archive = 'archive',
  Original = 'original',
}

export interface ShareLinkExpirationOption {
  label: string
  value: number | null
}

export const SHARE_LINK_EXPIRATION_OPTIONS: ShareLinkExpirationOption[] = [
  { label: '1 day', value: 1 },
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: 'Never', value: null },
]

export interface ShareLink extends ObjectWithPermissions {
  created: string // Date

  expiration?: string // Date

  slug: string

  document: number // Document

  file_version: string
}
