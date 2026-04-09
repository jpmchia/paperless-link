import { DocumentDetailsPageContent } from "../document-details-page"

export default async function DataroomDocumentDetailsSectionPage({
  params,
}: {
  params: Promise<{ slug: string; id: string; section: string }>
}) {
  const resolvedParams = await params
  return (
    <DocumentDetailsPageContent
      id={resolvedParams.id}
      slug={resolvedParams.slug}
      requestedSection={resolvedParams.section}
    />
  )
}

