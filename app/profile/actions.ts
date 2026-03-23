"use server"

import { getPaperlessApi } from "@/lib/api"
import type { TotpSettings } from "./types"

export async function updateProfile(data: {
  first_name?: string
  last_name?: string
  email?: string
  password?: string
  current_password?: string
}) {
  const payload: Record<string, string> = {}
  if (data.first_name !== undefined) payload.first_name = data.first_name
  if (data.last_name !== undefined) payload.last_name = data.last_name
  if (data.email !== undefined) payload.email = data.email
  if (data.password) {
    payload.password = data.password
    if (data.current_password) payload.current_password = data.current_password
  }

  return getPaperlessApi("profile/", {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
}

export async function generateAuthToken() {
  return getPaperlessApi("profile/generate_auth_token/", {
    method: "POST",
    body: JSON.stringify({}),
  }) as Promise<string>
}

export async function disconnectSocialAccount(id: number) {
  return getPaperlessApi("profile/disconnect_social_account/", {
    method: "POST",
    body: JSON.stringify({ id }),
  }) as Promise<number>
}

export async function getTotpSettings() {
  return getPaperlessApi("profile/totp/") as Promise<TotpSettings>
}

export async function activateTotp(secret: string, code: string) {
  return getPaperlessApi("profile/totp/", {
    method: "POST",
    body: JSON.stringify({ secret, code }),
  }) as Promise<{ success: boolean; recovery_codes: string[] }>
}

export async function deactivateTotp() {
  return getPaperlessApi("profile/totp/", {
    method: "DELETE",
  }) as Promise<boolean>
}
