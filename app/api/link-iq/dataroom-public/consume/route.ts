import { NextResponse } from "next/server"
import { invokeLinkIQAction } from "@/lib/link-iq"

type ConsumeInput = {
  token?: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ConsumeInput
    const result = await invokeLinkIQAction<{
      dataroom?: Record<string, unknown>
      invitee?: Record<string, unknown>
      session?: string
      session_expiry?: string
    }>({
      capability: "dataroom.magic_link.consume",
      input: {
        token: body.token,
      },
    })

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to consume magic link" },
      { status: 500 }
    )
  }
}
