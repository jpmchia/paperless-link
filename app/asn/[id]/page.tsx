import { redirect, notFound } from "next/navigation"
import { getPaperlessApi } from "@/lib/api"
import { requireRoutePermission } from "@/lib/server-permissions"

export default async function ASNLookupPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRoutePermission("/documents")

  const resolvedParams = await params
  const asn = resolvedParams.id

  try {
    const data = await getPaperlessApi<{ results?: Array<{ id: number }> }>(
      `documents/?archive_serial_number=${asn}&page_size=1`
    )
    const results = data.results || []
    if (results.length === 1) {
      redirect(`/documents/${results[0].id}`)
    }
    if (results.length === 0) {
      notFound()
    }
    // Multiple — shouldn't happen but redirect to filtered list
    redirect(`/documents?asn=${asn}`)
  } catch {
    notFound()
  }
}
