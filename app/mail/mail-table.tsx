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
import { Trash2, Mail, Shield } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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

async function apiAction(method: string, path: string) {
  const res = await fetch(`/api/proxy/${path}`, { method })
  if (!res.ok) throw new Error(`API call failed: ${res.statusText}`)
}

const SECURITY_LABELS: Record<number, string> = {
  1: "None",
  2: "SSL",
  3: "STARTTLS",
}

export function MailTable({ accounts, rules }: { accounts: MailAccount[]; rules: MailRule[] }) {
  const router = useRouter()
  const [accountList, setAccountList] = React.useState(accounts)
  const [ruleList, setRuleList] = React.useState(rules)
  const [deleteTarget, setDeleteTarget] = React.useState<{ type: "account" | "rule"; id: number } | null>(null)

  const accountMap: Record<number, string> = {}
  accountList.forEach((a) => { accountMap[a.id] = a.name })

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      const path = deleteTarget.type === "account"
        ? `mail_accounts/${deleteTarget.id}/`
        : `mail_rules/${deleteTarget.id}/`
      await apiAction("DELETE", path)
      if (deleteTarget.type === "account") {
        setAccountList((prev) => prev.filter((a) => a.id !== deleteTarget.id))
      } else {
        setRuleList((prev) => prev.filter((r) => r.id !== deleteTarget.id))
      }
      toast.success(`${deleteTarget.type === "account" ? "Account" : "Rule"} deleted`)
    } catch (e: any) {
      toast.error("Failed to delete", { description: e.message })
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
        </TabsList>

        <TabsContent value="accounts" className="mt-4">
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
      </Tabs>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(o: boolean) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type === "account" ? "mail account" : "mail rule"}?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
