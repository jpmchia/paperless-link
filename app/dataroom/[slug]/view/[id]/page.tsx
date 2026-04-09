import { DocumentDetailsPageContent } from "./document-details-page"

export default async function DataroomDocumentDetailsPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>
}) {
  const resolvedParams = await params
  return <DocumentDetailsPageContent id={resolvedParams.id} slug={resolvedParams.slug} />
}

