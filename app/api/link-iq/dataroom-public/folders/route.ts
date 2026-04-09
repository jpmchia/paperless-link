import { NextResponse } from "next/server"
import { invokeLinkIQAction } from "@/lib/link-iq"
import type { DataroomFolder } from "@/lib/link-iq-types"

type FolderInput = {
  token?: string
  slug?: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FolderInput
    const token = body.token?.trim()
    const slug = body.slug?.trim()
    if (!token || !slug) {
      return NextResponse.json({ error: "token and slug are required" }, { status: 400 })
    }

    const sessionResult = await invokeLinkIQAction<{
      dataroom?: { dataroom_id?: string }
    }>({
      capability: "dataroom.session.validate",
      input: { token, slug },
    })

    const dataroomID = sessionResult.dataroom?.dataroom_id?.trim()
    if (!dataroomID) {
      return NextResponse.json({ error: "Unable to resolve dataroom" }, { status: 401 })
    }

    const folderResult = await invokeLinkIQAction<{ folders?: DataroomFolder[] }>({
      capability: "dataroom.folder.list",
      input: { dataroom_id: dataroomID },
    })

    return NextResponse.json({ folders: folderResult.folders ?? [] })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load dataroom folders" },
      { status: 500 },
    )
  }
}
