import { NextResponse } from "next/server"
import { invokeLinkIQAction } from "@/lib/link-iq"
import type { Dataroom } from "@/lib/link-iq-types"
import { requireDataroomActor } from "../auth"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_: Request, { params }: RouteParams) {
  const actor = await requireDataroomActor()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  try {
    const result = await invokeLinkIQAction<{ dataroom?: Dataroom }>(
      { capability: "dataroom.get", resource_id: id },
      { id: actor.actorId, type: "user" }
    )
    return NextResponse.json(result.dataroom ?? {})
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load dataroom" },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  const actor = await requireDataroomActor()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  try {
    const body = (await request.json()) as Dataroom
    const result = await invokeLinkIQAction<{ dataroom?: Dataroom }>(
      {
        capability: "dataroom.update",
        resource_id: id,
        input: {
          ...(body as unknown as Record<string, unknown>),
          dataroom_id: id,
        },
      },
      { id: actor.actorId, type: "user" }
    )
    return NextResponse.json(result.dataroom ?? {})
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update dataroom" },
      { status: 500 }
    )
  }
}

export async function DELETE(_: Request, { params }: RouteParams) {
  const actor = await requireDataroomActor()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  try {
    await invokeLinkIQAction(
      { capability: "dataroom.delete", resource_id: id },
      { id: actor.actorId, type: "user" }
    )
    return NextResponse.json({ deleted: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete dataroom" },
      { status: 500 }
    )
  }
}
