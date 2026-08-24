import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { requireDataroomActor } from "../auth"
import { paperlessJsonAccept } from "@/lib/paperless-transport"

type PaperlessUser = {
  id: number
  username?: string
  first_name?: string
  last_name?: string
  email?: string
  last_login?: string
}

type PaginatedUsers = {
  results?: PaperlessUser[]
}

export async function GET() {
  const actor = await requireDataroomActor()
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const session = (await getServerSession(authOptions)) as { accessToken?: string } | null
  const token = process.env.PAPERLESS_API_TOKEN?.trim() || session?.accessToken
  if (!token) {
    return NextResponse.json({ error: "Missing Paperless API token" }, { status: 500 })
  }

  const baseUrl = process.env.PAPERLESS_API_URL || "http://localhost:8000/"
  try {
    const response = await fetch(`${baseUrl}api/users/?page_size=100000`, {
      headers: {
        Authorization: `Token ${token}`,
        Accept: paperlessJsonAccept(),
      },
      cache: "no-store",
    })
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to load users: ${response.status} ${response.statusText}` },
        { status: response.status },
      )
    }
    const payload = (await response.json()) as PaginatedUsers | PaperlessUser[]
    const users = Array.isArray(payload) ? payload : payload.results ?? []
    return NextResponse.json({ users })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load users" },
      { status: 500 },
    )
  }
}
