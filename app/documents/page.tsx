import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { redirect } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { getDocuments } from "@/lib/api"
import { DataTable } from "./data-table"
import { columns } from "./columns"
import { TopBar } from "./topbar"

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await getServerSession(authOptions as any)

  if (!session) {
    redirect("/login")
  }

  const resolvedParams = await searchParams
  const query = resolvedParams.query as string || ""
  const currentPage = Number(resolvedParams.page) || 1
  const pageSize = 25

  // Fetch paginated documents
  const documentsData = await getDocuments(currentPage, pageSize, query)
  const pageCount = Math.ceil((documentsData.count || 0) / pageSize)

  return (
    <AppShell topbar={<TopBar title="Documents" />}>
      <div className="flex flex-col space-y-4 p-4 h-full">
        <div className="bg-card text-card-foreground">
          <DataTable
            columns={columns}
            data={documentsData.results}
            pageCount={pageCount}
            currentPage={currentPage}
          />
        </div>
      </div>
    </AppShell>
  )
}
