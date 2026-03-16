"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Trash2, Mail, Shield, History, ChromeIcon } from "lucide-react"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { useAsyncAction } from "@/hooks/use-async-action"
import { deleteJson } from "@/lib/paperless-client"

interface MailAccount {
  id: number
  name: string
  imap_server?: string
  imap_port?: number
  imap_security?: number
  username?: string
  is_token?: boolean
  character_set?: string
}

interface MailRule {
  id: number
  name: string
  account: number
  folder?: string
  filter_from?: string
  filter_subject?: string
  order?: number
  action?: number
  assign_title_from?: number
  assign_correspondent_from?: number
}

interface ProcessedMailEntry {
  id: number
  received: string
  subject?: string
  status?: number
  rule?: number | null
  rule_name?: string | null
  document?: number | null
  error?: string | null
}

interface MailTableProps {
  accounts: MailAccount[]
  rules: MailRule[]
  processedMail?: ProcessedMailEntry[]
  gmailOAuthUrl?: string | null
  outlookOAuthUrl?: string | null
}

const SECURITY_LABELS: Record<number, string> = {
  1: "None",
  2: "SSL",
  3: "STARTTLS",
}

const STATUS_LABELS: Record<number, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  0: { label: "Processed", variant: "secondary" },
  1: { label: "Error", variant: "destructive" },
  2: { label: "No match", variant: "outline" },
}

export function MailTable({ accounts, rules, processedMail = [], gmailOAuthUrl, outlookOAuthUrl }: MailTableProps) {
  const [accountList, setAccountList] = React.useState(accounts)
  const [ruleList, setRuleList] = React.useState(rules)
  const [deleteTarget, setDeleteTarget] = React.useState<{ type: "account" | "rule"; id: number } | null>(null)

  const accountMap: Record<number, string> = {}
  accountList.forEach((a) => { accountMap[a.id] = a.name })

  const ruleMap: Record<number, string> = {}
  ruleList.forEach((r) => { ruleMap[r.id] = r.name })

  const { pending: deleting, run: deleteMailResource } = useAsyncAction({
    action: async (target: { type: "account" | "rule"; id: number }) => {
      const path =
        target.type === "account"
          ? `/api/proxy/mail_accounts/${target.id}/`
          : `/api/proxy/mail_rules/${target.id}/`
      await deleteJson<void>(path)
      return target
    },
    errorMessage: "Failed to delete",
  })

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      const deleted = await deleteMailResource(deleteTarget)
      if (deleted.type === "account") {
        setAccountList((prev) => prev.filter((account) => account.id !== deleted.id))
      } else {
        setRuleList((prev) => prev.filter((rule) => rule.id !== deleted.id))
      }
      toast.success(`${deleted.type === "account" ? "Account" : "Rule"} deleted`)
    } catch {
      // Error toast is handled by useAsyncAction.
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <>
      <Tabs defaultValue="accounts">
        <TabsList>
          <TabsTrigger value="accounts" className="gap-1.5">
            <Mail className="h-3.5 w-3.5" />Accounts ({accountList.length})
          </TabsTrigger>
          <TabsTrigger value="rules" className="gap-1.5">
            <Shield className="h-3.5 w-3.5" />Rules ({ruleList.length})
          </TabsTrigger>
          <TabsTrigger value="processed" className="gap-1.5">
            <History className="h-3.5 w-3.5" />Processed ({processedMail.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="mt-4 space-y-4">
          {/* OAuth connect buttons */}
          {(gmailOAuthUrl || outlookOAuthUrl) && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Connect via OAuth:</span>
              {gmailOAuthUrl && (
                <Button size="sm" variant="outline" className="h-8 gap-1.5" asChild>
                  <a href={gmailOAuthUrl}>
                    <ChromeIcon className="h-3.5 w-3.5" />
                    Connect Gmail
                  </a>
                </Button>
              )}
              {outlookOAuthUrl && (
                <Button size="sm" variant="outline" className="h-8 gap-1.5" asChild>
                  <a href={outlookOAuthUrl}>
                    <Mail className="h-3.5 w-3.5" />
                    Connect Outlook
                  </a>
                </Button>
              )}
            </div>
          )}

          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>IMAP Server</TableHead>
                  <TableHead>Port</TableHead>
                  <TableHead>Security</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead className="w-20 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accountList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                      No mail accounts configured.
                    </TableCell>
                  </TableRow>
                ) : (
                  accountList.map((acct) => (
                    <TableRow key={acct.id}>
                      <TableCell className="font-medium">{acct.name}</TableCell>
                      <TableCell className="text-muted-foreground">{acct.imap_server || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{acct.imap_port || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs font-normal">
                          {SECURITY_LABELS[acct.imap_security ?? 1] ?? "None"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{acct.username || "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ type: "account", id: acct.id })}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="rules" className="mt-4">
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Folder</TableHead>
                  <TableHead>Filter From</TableHead>
                  <TableHead>Filter Subject</TableHead>
                  <TableHead className="w-16 text-center">Order</TableHead>
                  <TableHead className="w-20 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ruleList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground h-24">
                      No mail rules configured.
                    </TableCell>
                  </TableRow>
                ) : (
                  ruleList.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">{rule.name}</TableCell>
                      <TableCell className="text-muted-foreground">{accountMap[rule.account] ?? `#${rule.account}`}</TableCell>
                      <TableCell className="text-muted-foreground">{rule.folder || "INBOX"}</TableCell>
                      <TableCell className="text-muted-foreground">{rule.filter_from || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{rule.filter_subject || "—"}</TableCell>
                      <TableCell className="text-center text-muted-foreground">{rule.order ?? "—"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ type: "rule", id: rule.id })}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="processed" className="mt-4">
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Received</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Rule</TableHead>
                  <TableHead className="w-28">Status</TableHead>
                  <TableHead className="w-28 text-right">Document</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedMail.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                      No processed mail records yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  processedMail.map((entry) => {
                    const status = STATUS_LABELS[entry.status ?? 0] ?? { label: "Unknown", variant: "outline" as const }
                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(entry.received).toLocaleString()}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm">
                          {entry.subject || <em className="text-muted-foreground">No subject</em>}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {entry.rule_name ?? (entry.rule != null ? ruleMap[entry.rule] ?? `#${entry.rule}` : "—")}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant} className="text-xs">
                            {status.label}
                          </Badge>
                          {entry.error && (
                            <p className="text-[10px] text-destructive mt-0.5 truncate max-w-[160px]" title={entry.error}>
                              {entry.error}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {entry.document != null ? (
                            <Button size="sm" variant="ghost" className="h-7 text-xs" asChild>
                              <Link href={`/documents/${entry.document}`}>View doc</Link>
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o: boolean) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type === "account" ? "mail account" : "mail rule"}?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void handleDelete()}
              disabled={deleting}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
