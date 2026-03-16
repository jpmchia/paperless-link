"use server"

import { getPaperlessApi } from "@/lib/api"

export async function updateProfile(data: {
  first_name?: string
  last_name?: string
  email?: string
  password?: string
  current_password?: string
}) {
  const payload: Record<string, any> = {}
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
