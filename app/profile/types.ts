export interface SocialAccount {
  id: number
  provider: string
  name: string
}

export interface SocialAccountProvider {
  name: string
  login_url: string
}

export interface TotpSettings {
  url: string
  qr_svg: string
  secret: string
}

export interface ProfileData {
  id: number
  username: string
  email?: string
  first_name?: string
  last_name?: string
  auth_token?: string
  social_accounts?: SocialAccount[]
  has_usable_password?: boolean
  is_mfa_enabled?: boolean
}
