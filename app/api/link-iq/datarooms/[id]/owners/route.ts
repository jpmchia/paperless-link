import { NextResponse } from "next/server"
import { invokeLinkIQAction } from "@/lib/link-iq"
import type { DataroomOwner } from "@/lib/link-iq-types"
import { requireDataroomActor } from "../../auth"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_: Request, { params }: RouteParams) {
  const actor = await requireDataroomActor()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  try {
    const result = await invokeLinkIQAction<{ owners?: DataroomOwner[] }>(
      {
        capability: "dataroom.owner.list",
        resource_id: id,
        input: { dataroom_id: id },
      },
      { id: actor.actorId, type: "user" }
    )
    return NextResponse.json({ owners: result.owners ?? [] })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load owners" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  const actor = await requireDataroomActor()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  try {
    const body = (await request.json()) as { subject_id?: string }
    const result = await invokeLinkIQAction<{ owners?: DataroomOwner[] }>(
      {
        capability: "dataroom.owner.upsert",
        resource_id: id,
        input: { dataroom_id: id, subject_id: body.subject_id },
      },
      { id: actor.actorId, type: "user" }
    )
    return NextResponse.json({ owners: result.owners ?? [] })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update owners" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const actor = await requireDataroomActor()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  try {
    const body = (await request.json()) as { subject_id?: string }
    await invokeLinkIQAction(
      {
        capability: "dataroom.owner.delete",
        resource_id: id,
        input: { dataroom_id: id, subject_id: body.subject_id },
      },
      { id: actor.actorId, type: "user" }
    )
    return NextResponse.json({ deleted: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete owner" },
      { status: 500 }
    )
  }
}
