import { NextResponse } from "next/server"
import {
  getCorrespondents,
  getDocumentStatistics,
  getDocumentTypes,
  getRecentDocuments,
  getSavedViews,
} from "@/lib/api"

export async function GET() {
  const [statistics, recentDocuments, savedViews, correspondents, documentTypes] =
    await Promise.all([
      getDocumentStatistics(),
      getRecentDocuments(8),
      getSavedViews(),
      getCorrespondents(),
      getDocumentTypes(),
    ])

  return NextResponse.json({
    correspondents,
    documentTypes,
    recentDocuments,
    savedViews,
    statistics,
  })
}
