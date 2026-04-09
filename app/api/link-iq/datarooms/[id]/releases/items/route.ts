import { NextResponse } from "next/server"
import { invokeLinkIQAction } from "@/lib/link-iq"
import type { DataroomReleaseItem } from "@/lib/link-iq-types"
import { requireDataroomActor } from "../../../auth"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(request: Request, { params }: RouteParams) {
  const actor = await requireDataroomActor()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  const url = new URL(request.url)
  const status = url.searchParams.get("status") || ""
  try {
    const result = await invokeLinkIQAction<{ items?: DataroomReleaseItem[] }>(
      {
        capability: "dataroom.release.items",
        resource_id: id,
        input: { dataroom_id: id, status },
      },
      { id: actor.actorId, type: "user" },
    )
    return NextResponse.json({ items: result.items ?? [] })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list release items" },
      { status: 500 },
    )
  }
}
