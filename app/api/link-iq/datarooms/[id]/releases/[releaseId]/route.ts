import { NextResponse } from "next/server"
import { invokeLinkIQAction } from "@/lib/link-iq"
import type { DataroomRelease } from "@/lib/link-iq-types"
import { requireDataroomActor } from "../../../auth"

type RouteParams = { params: Promise<{ id: string; releaseId: string }> }

export async function GET(_request: Request, { params }: RouteParams) {
  const actor = await requireDataroomActor()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id, releaseId } = await params
  try {
    const result = await invokeLinkIQAction<{ releases?: DataroomRelease[] }>(
      {
        capability: "dataroom.release.list",
        resource_id: id,
        input: { dataroom_id: id },
      },
      { id: actor.actorId, type: "user" },
    )
    const release = (result.releases ?? []).find((entry) => entry.release_id === releaseId)
    if (!release) {
      return NextResponse.json({ error: "Release not found" }, { status: 404 })
    }
    return NextResponse.json(release)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch release detail" },
      { status: 500 },
    )
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const actor = await requireDataroomActor()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id, releaseId } = await params
  try {
    await invokeLinkIQAction(
      {
        capability: "dataroom.release.cancel",
        resource_id: releaseId,
        input: { dataroom_id: id, release_id: releaseId },
      },
      { id: actor.actorId, type: "user" },
    )
    return NextResponse.json({ cancelled: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to cancel release" },
      { status: 500 },
    )
  }
}
