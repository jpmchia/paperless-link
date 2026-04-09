import { NextResponse } from "next/server"
import { invokeLinkIQAction } from "@/lib/link-iq"
import type { DataroomFolder } from "@/lib/link-iq-types"
import { requireDataroomActor } from "../../auth"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_: Request, { params }: RouteParams) {
  const actor = await requireDataroomActor()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  try {
    const [foldersResult, countsResult] = await Promise.all([
      invokeLinkIQAction<{ folders?: DataroomFolder[] }>(
        { capability: "dataroom.folder.list", resource_id: id, input: { dataroom_id: id } },
        { id: actor.actorId, type: "user" }
      ),
      invokeLinkIQAction<{ folder_counts?: Record<string, number> }>(
        { capability: "dataroom.folder.counts", resource_id: id, input: { dataroom_id: id } },
        { id: actor.actorId, type: "user" }
      ),
    ])
    return NextResponse.json({
      folders: foldersResult.folders ?? [],
      folder_counts: countsResult.folder_counts ?? {},
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load folders" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  const actor = await requireDataroomActor()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  try {
    const body = (await request.json()) as DataroomFolder
    const result = await invokeLinkIQAction<{ folder?: DataroomFolder }>(
      {
        capability: "dataroom.folder.upsert",
        input: {
          ...(body as unknown as Record<string, unknown>),
          dataroom_id: id,
        },
      },
      { id: actor.actorId, type: "user" }
    )
    return NextResponse.json(result.folder ?? {})
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save folder" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const actor = await requireDataroomActor()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params
  try {
    const body = (await request.json()) as { folder_id?: string }
    await invokeLinkIQAction(
      {
        capability: "dataroom.folder.delete",
        resource_id: body.folder_id,
        input: { dataroom_id: id, folder_id: body.folder_id },
      },
      { id: actor.actorId, type: "user" }
    )
    return NextResponse.json({ deleted: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete folder" },
      { status: 500 }
    )
  }
}
