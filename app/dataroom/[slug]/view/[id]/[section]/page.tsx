import { redirect } from "next/navigation"

export default async function DataroomDocumentDetailsSectionPage({
  params,
}: {
  params: Promise<{ slug: string; id: string; section: string }>
}) {
  const { slug, id } = await params
  redirect(`/dataroom/${slug}/view?doc=${encodeURIComponent(id)}`)
}

