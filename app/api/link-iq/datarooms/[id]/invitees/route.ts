import { NextResponse } from "next/server"
import { invokeLinkIQAction } from "@/lib/link-iq"
import type { DataroomInvitee } from "@/lib/link-iq-types"
import { requireDataroomActor } from "../../auth"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_: Request, { params }: RouteParams) {
  const actor = await requireDataroomActor()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  try {
    const result = await invokeLinkIQAction<{ invitees?: DataroomInvitee[] }>(
      {
        capability: "dataroom.invitee.list",
        resource_id: id,
        input: { dataroom_id: id },
      },
      { id: actor.actorId, type: "user" }
    )
    return NextResponse.json({ invitees: result.invitees ?? [] })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load invitees" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  const actor = await requireDataroomActor()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  try {
    const body = (await request.json()) as DataroomInvitee
    const result = await invokeLinkIQAction<{ invitee?: DataroomInvitee }>(
      {
        capability: "dataroom.invitee.upsert",
        resource_id: id,
        input: {
          ...(body as unknown as Record<string, unknown>),
          dataroom_id: id,
        },
      },
      { id: actor.actorId, type: "user" }
    )
    return NextResponse.json(result.invitee ?? {})
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save invitee" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const actor = await requireDataroomActor()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  try {
    const body = (await request.json()) as { invitee_id?: string }
    await invokeLinkIQAction(
      {
        capability: "dataroom.invitee.delete",
        resource_id: body.invitee_id,
        input: { dataroom_id: id, invitee_id: body.invitee_id },
      },
      { id: actor.actorId, type: "user" }
    )
    return NextResponse.json({ deleted: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete invitee" },
      { status: 500 }
    )
  }
}
