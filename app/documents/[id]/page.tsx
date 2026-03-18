import { DocumentDetailsPageContent } from "./document-details-page"

export default async function DocumentDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = await params

  return <DocumentDetailsPageContent id={resolvedParams.id} />
}
