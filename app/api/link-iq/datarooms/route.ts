import { NextResponse } from "next/server"
import { invokeLinkIQAction } from "@/lib/link-iq"
import type { Dataroom } from "@/lib/link-iq-types"
import { requireDataroomActor } from "./auth"

export async function GET() {
  const actor = await requireDataroomActor()
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const result = await invokeLinkIQAction<{ datarooms?: Dataroom[] }>(
      {
        capability: "dataroom.list",
      },
      { id: actor.actorId, type: "user" }
    )
    return NextResponse.json({ datarooms: result.datarooms ?? [] })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list datarooms" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const actor = await requireDataroomActor()
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const body = (await request.json()) as Dataroom
    const result = await invokeLinkIQAction<{ dataroom?: Dataroom }>(
      {
        capability: "dataroom.create",
        input: body as unknown as Record<string, unknown>,
      },
      { id: actor.actorId, type: "user" }
    )
    return NextResponse.json(result.dataroom ?? {})
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create dataroom" },
      { status: 500 }
    )
  }
}
