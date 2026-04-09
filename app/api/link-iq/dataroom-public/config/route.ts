import { NextResponse } from "next/server"
import { invokeLinkIQAction } from "@/lib/link-iq"

type PublicDataroomConfig = {
  dataroom_id?: string
  slug?: string
  title?: string
  login_logo_url?: string
  login_logo_dark_url?: string
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const slug = (url.searchParams.get("slug") || "").trim()
    if (!slug) {
      return NextResponse.json({ error: "Missing slug" }, { status: 400 })
    }

    const result = await invokeLinkIQAction<{ dataroom?: PublicDataroomConfig }>({
      capability: "dataroom.public.get",
      input: { slug },
    })

    return NextResponse.json({ dataroom: result.dataroom ?? null })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load dataroom config" },
      { status: 500 },
    )
  }
}
