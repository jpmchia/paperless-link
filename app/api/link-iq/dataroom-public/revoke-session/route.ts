import { NextResponse } from "next/server"
import { invokeLinkIQAction } from "@/lib/link-iq"

type RevokeInput = {
  token?: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RevokeInput
    await invokeLinkIQAction({
      capability: "dataroom.session.revoke",
      input: {
        token: body.token,
      },
    })
    return NextResponse.json({ revoked: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to revoke session" },
      { status: 500 }
    )
  }
}
