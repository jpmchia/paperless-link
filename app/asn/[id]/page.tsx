import { redirect, notFound } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { getPaperlessApi } from "@/lib/api"

export default async function ASNLookupPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession(authOptions as any)
  if (!session) redirect("/login")

  const resolvedParams = await params
  const asn = resolvedParams.id

  try {
    const data = await getPaperlessApi(`documents/?archive_serial_number=${asn}&page_size=1`)
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
