import { NextResponse } from "next/server"
import { invokeLinkIQAction } from "@/lib/link-iq"

type ValidateInput = {
  token?: string
  slug?: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ValidateInput
    const result = await invokeLinkIQAction<{
      dataroom?: Record<string, unknown>
      invitee?: Record<string, unknown>
    }>({
      capability: "dataroom.session.validate",
      input: {
        token: body.token,
        slug: body.slug,
      },
    })
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to validate session" },
      { status: 401 }
    )
  }
}
