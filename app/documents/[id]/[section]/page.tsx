import { DocumentDetailsPageContent } from "../document-details-page"

export default async function DocumentDetailsSectionPage({
  params,
}: {
  params: Promise<{ id: string; section: string }>
}) {
  const resolvedParams = await params

  return (
    <DocumentDetailsPageContent
      id={resolvedParams.id}
      requestedSection={resolvedParams.section}
    />
  )
}
