import { redirect } from "next/navigation"

/** Document detail is inline on `/dataroom/[slug]/view` with `?doc=` and the PDF panel. */
export default async function DataroomDocumentDetailsPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>
}) {
  const { slug, id } = await params
  redirect(`/dataroom/${slug}/view?doc=${encodeURIComponent(id)}`)
}

