import { NextResponse } from "next/server"
import { invokeLinkIQAction } from "@/lib/link-iq"
import type { DataroomInviteeStats, DataroomSummaryCount } from "@/lib/link-iq-types"
import { requireDataroomActor } from "../../auth"

type RouteParams = { params: Promise<{ id: string }> }

export async function GET(_: Request, { params }: RouteParams) {
  const actor = await requireDataroomActor()
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { id } = await params

  try {
    const [summaryResult, inviteesResult] = await Promise.all([
      invokeLinkIQAction<{ summary?: DataroomSummaryCount[] }>(
        {
          capability: "dataroom.audit.summary",
          resource_id: id,
          input: { dataroom_id: id },
        },
        { id: actor.actorId, type: "user" }
      ),
      invokeLinkIQAction<{ invitees?: DataroomInviteeStats[] }>(
        {
          capability: "dataroom.audit.invitees",
          resource_id: id,
          input: { dataroom_id: id },
        },
        { id: actor.actorId, type: "user" }
      ),
    ])

    return NextResponse.json({
      summary: summaryResult.summary ?? [],
      invitees: inviteesResult.invitees ?? [],
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load analytics" },
      { status: 500 }
    )
  }
}
