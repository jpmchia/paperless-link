import { NextResponse } from "next/server"
import { invokeLinkIQAction } from "@/lib/link-iq"
import type { DataroomDocumentPlacement } from "@/lib/link-iq-types"
import { requireDataroomActor } from "../../auth"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_: Request, { params }: RouteParams) {
  const actor = await requireDataroomActor()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  try {
    const result = await invokeLinkIQAction<{ placements?: DataroomDocumentPlacement[] }>(
      {
        capability: "dataroom.document.list",
        resource_id: id,
        input: { dataroom_id: id },
      },
      { id: actor.actorId, type: "user" }
    )
    return NextResponse.json({ placements: result.placements ?? [] })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list placements" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  const actor = await requireDataroomActor()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  try {
    const body = (await request.json()) as DataroomDocumentPlacement
    const result = await invokeLinkIQAction<{ placement?: DataroomDocumentPlacement }>(
      {
        capability: "dataroom.document.place",
        input: {
          ...(body as unknown as Record<string, unknown>),
          dataroom_id: id,
        },
      },
      { id: actor.actorId, type: "user" }
    )
    return NextResponse.json(result.placement ?? {})
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to place document" },
      { status: 500 }
    )
  }
}
