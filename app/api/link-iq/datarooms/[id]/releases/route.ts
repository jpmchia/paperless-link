import { NextResponse } from "next/server"
import { invokeLinkIQAction } from "@/lib/link-iq"
import type { DataroomRelease, DataroomReleaseItem } from "@/lib/link-iq-types"
import { requireDataroomActor } from "../../auth"

type RouteParams = { params: Promise<{ id: string }> }

type ReleaseCreateInput = {
  items?: DataroomReleaseItem[]
  scheduled_at?: string
}

export async function GET(request: Request, { params }: RouteParams) {
  const actor = await requireDataroomActor()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const url = new URL(request.url)
  const status = url.searchParams.get("status") || ""
  try {
    const result = await invokeLinkIQAction<{ releases?: DataroomRelease[] }>(
      {
        capability: "dataroom.release.list",
        resource_id: id,
        input: { dataroom_id: id, status },
      },
      { id: actor.actorId, type: "user" },
    )
    return NextResponse.json({ releases: result.releases ?? [] })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list releases" },
      { status: 500 },
    )
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  const actor = await requireDataroomActor()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  try {
    const body = (await request.json()) as ReleaseCreateInput
    const result = await invokeLinkIQAction<{ release?: DataroomRelease }>(
      {
        capability: "dataroom.release.create",
        resource_id: id,
        input: {
          dataroom_id: id,
          items: body.items ?? [],
          scheduled_at: body.scheduled_at,
        },
      },
      { id: actor.actorId, type: "user" },
    )
    return NextResponse.json(result.release ?? {})
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create release" },
      { status: 500 },
    )
  }
}
