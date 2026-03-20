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
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { HasObjectPermission } from "@/components/permissions/has-object-permission"
import { OpenDocumentLink } from "@/components/open-document-link"
import { Trash2, Mail, Shield, History, ChromeIcon, Plus, Pencil, Play, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAsyncAction } from "@/hooks/use-async-action"
import { deleteJson, patchJson, postJson } from "@/lib/paperless-client"
import type { PermissionedObject } from "@/lib/permissions"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { toErrorMessage } from "@/lib/errors"

interface MailAccount extends PermissionedObject {
  id: number
  name: string
  imap_server?: string
  imap_port?: number
  imap_security?: number
  username?: string
  is_token?: boolean
  character_set?: string
  account_type?: number
}

interface MailRule extends PermissionedObject {
  id: number
  name: string
  account: number
  folder?: string
  filter_from?: string
  filter_subject?: string
  order?: number
  action?: number
  enabled?: boolean
  filter_to?: string
  filter_body?: string
  filter_attachment_filename_include?: string
  filter_attachment_filename_exclude?: string
  maximum_age?: number
  action_parameter?: string
  assign_title_from?: number
  assign_tags?: number[]
  assign_correspondent_from?: number
  assign_correspondent?: number | null
  assign_document_type?: number | null
  assign_owner_from_rule?: boolean
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
  tags: Array<{ id: number; name: string }>
  correspondents: Array<{ id: number; name: string }>
  documentTypes: Array<{ id: number; name: string }>
}

const SECURITY_LABELS: Record<number, string> = {
  1: "None",
  2: "SSL",
  3: "STARTTLS",
}

const ACCOUNT_TYPE_LABELS: Record<number, string> = {
  1: "Generic IMAP",
  2: "Gmail OAuth",
  3: "Outlook OAuth",
}

const MAIL_RULE_ACTION_LABELS: Record<number, string> = {
  1: "Tag",
  2: "Move",
  3: "Delete",
  4: "Mark read",
  5: "Flag",
}

const ASSIGN_TITLE_FROM_LABELS: Record<number, string> = {
  0: "None",
  1: "Subject",
  2: "Filename",
}

const ASSIGN_CORRESPONDENT_FROM_LABELS: Record<number, string> = {
  0: "None",
  1: "From",
  2: "To",
  3: "Cc",
}

const STATUS_LABELS: Record<number, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  0: { label: "Processed", variant: "secondary" },
  1: { label: "Error", variant: "destructive" },
  2: { label: "No match", variant: "outline" },
}

type MailAccountDraft = {
  name: string
  imap_server: string
  imap_port: string
  imap_security: string
  username: string
  password: string
  character_set: string
  is_token: boolean
  account_type: string
}

type MailRuleDraft = {
  name: string
  account: string
  enabled: boolean
  folder: string
  filter_from: string
  filter_to: string
  filter_subject: string
  filter_body: string
  filter_attachment_filename_include: string
  filter_attachment_filename_exclude: string
  maximum_age: string
  action: string
  action_parameter: string
  assign_title_from: string
  assign_correspondent_from: string
  assign_correspondent: string
  assign_document_type: string
  assign_tags: number[]
  assign_owner_from_rule: boolean
  order: string
}

function createMailAccountDraft(account?: MailAccount | null): MailAccountDraft {
  return {
    name: account?.name ?? "",
    imap_server: account?.imap_server ?? "",
    imap_port: account?.imap_port != null ? String(account.imap_port) : "993",
    imap_security: String(account?.imap_security ?? 2),
    username: account?.username ?? "",
    password: "",
    character_set: account?.character_set ?? "UTF-8",
    is_token: Boolean(account?.is_token),
    account_type: String(account?.account_type ?? 1),
  }
}

function createMailRuleDraft(rule?: MailRule | null): MailRuleDraft {
  return {
    name: rule?.name ?? "",
    account: rule?.account != null ? String(rule.account) : "",
    enabled: rule?.enabled ?? true,
    folder: rule?.folder ?? "INBOX",
    filter_from: rule?.filter_from ?? "",
    filter_to: rule?.filter_to ?? "",
    filter_subject: rule?.filter_subject ?? "",
    filter_body: rule?.filter_body ?? "",
    filter_attachment_filename_include: rule?.filter_attachment_filename_include ?? "",
    filter_attachment_filename_exclude: rule?.filter_attachment_filename_exclude ?? "",
    maximum_age: rule?.maximum_age != null ? String(rule.maximum_age) : "",
    action: String(rule?.action ?? 1),
    action_parameter: rule?.action_parameter ?? "",
    assign_title_from: String(rule?.assign_title_from ?? 0),
    assign_correspondent_from: String(rule?.assign_correspondent_from ?? 0),
    assign_correspondent: rule?.assign_correspondent != null ? String(rule.assign_correspondent) : "",
    assign_document_type: rule?.assign_document_type != null ? String(rule.assign_document_type) : "",
    assign_tags: rule?.assign_tags ?? [],
    assign_owner_from_rule: Boolean(rule?.assign_owner_from_rule),
    order: rule?.order != null ? String(rule.order) : "",
  }
}

export function MailTable({
  accounts,
  rules,
  processedMail = [],
  gmailOAuthUrl,
  outlookOAuthUrl,
  tags,
  correspondents,
  documentTypes,
}: MailTableProps) {
  const [accountList, setAccountList] = React.useState(accounts)
  const [ruleList, setRuleList] = React.useState(rules)
  const [deleteTarget, setDeleteTarget] = React.useState<{ type: "account" | "rule"; id: number } | null>(null)
  const [accountDialogOpen, setAccountDialogOpen] = React.useState(false)
  const [ruleDialogOpen, setRuleDialogOpen] = React.useState(false)
  const [editingAccount, setEditingAccount] = React.useState<MailAccount | null>(null)
  const [editingRule, setEditingRule] = React.useState<MailRule | null>(null)
  const [accountDraft, setAccountDraft] = React.useState<MailAccountDraft>(createMailAccountDraft())
  const [ruleDraft, setRuleDraft] = React.useState<MailRuleDraft>(createMailRuleDraft())
  const [savingAccount, setSavingAccount] = React.useState(false)
  const [savingRule, setSavingRule] = React.useState(false)
  const [processingAccountId, setProcessingAccountId] = React.useState<number | null>(null)

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

  const openCreateAccountDialog = React.useCallback(() => {
    setEditingAccount(null)
    setAccountDraft(createMailAccountDraft())
    setAccountDialogOpen(true)
  }, [])

  const openEditAccountDialog = React.useCallback((account: MailAccount) => {
    setEditingAccount(account)
    setAccountDraft(createMailAccountDraft(account))
    setAccountDialogOpen(true)
  }, [])

  const openCreateRuleDialog = React.useCallback(() => {
    setEditingRule(null)
    setRuleDraft(createMailRuleDraft())
    setRuleDialogOpen(true)
  }, [])

  const openEditRuleDialog = React.useCallback((rule: MailRule) => {
    setEditingRule(rule)
    setRuleDraft(createMailRuleDraft(rule))
    setRuleDialogOpen(true)
  }, [])

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

  const handleAccountDraftChange = React.useCallback(
    <K extends keyof MailAccountDraft>(key: K, value: MailAccountDraft[K]) => {
      setAccountDraft((prev) => ({ ...prev, [key]: value }))
    },
    []
  )

  const handleRuleDraftChange = React.useCallback(
    <K extends keyof MailRuleDraft>(key: K, value: MailRuleDraft[K]) => {
      setRuleDraft((prev) => ({ ...prev, [key]: value }))
    },
    []
  )

  const handleSaveAccount = async () => {
    if (!accountDraft.name.trim() || !accountDraft.imap_server.trim() || !accountDraft.username.trim()) {
      toast.error("Name, IMAP server, and username are required")
      return
    }
    if (!editingAccount && !accountDraft.password.trim()) {
      toast.error("Password is required for a new mail account")
      return
    }

    setSavingAccount(true)
    try {
      const payload = {
        name: accountDraft.name.trim(),
        imap_server: accountDraft.imap_server.trim(),
        imap_port: accountDraft.imap_port ? Number(accountDraft.imap_port) : null,
        imap_security: Number(accountDraft.imap_security),
        username: accountDraft.username.trim(),
        ...(accountDraft.password.trim() ? { password: accountDraft.password } : {}),
        character_set: accountDraft.character_set.trim() || "UTF-8",
        is_token: accountDraft.is_token,
        account_type: Number(accountDraft.account_type),
      }

      const saved = editingAccount
        ? await patchJson<MailAccount>(`/api/proxy/mail_accounts/${editingAccount.id}/`, payload)
        : await postJson<MailAccount>("/api/proxy/mail_accounts/", payload)

      setAccountList((prev) => {
        if (editingAccount) {
          return prev.map((account) => (account.id === saved.id ? saved : account))
        }
        return [...prev, saved]
      })
      toast.success(`Mail account ${editingAccount ? "updated" : "created"}`)
      setAccountDialogOpen(false)
    } catch (error) {
      toast.error(`Failed to ${editingAccount ? "update" : "create"} mail account`, {
        description: toErrorMessage(error),
      })
    } finally {
      setSavingAccount(false)
    }
  }

  const handleProcessAccount = async (account: MailAccount) => {
    setProcessingAccountId(account.id)
    try {
      await postJson(`/api/proxy/mail_accounts/${account.id}/process/`, {})
      toast.success(`Started processing ${account.name}`)
    } catch (error) {
      toast.error("Failed to process mail account", {
        description: toErrorMessage(error),
      })
    } finally {
      setProcessingAccountId(null)
    }
  }

  const handleSaveRule = async () => {
    if (!ruleDraft.name.trim() || !ruleDraft.account) {
      toast.error("Name and account are required")
      return
    }

    setSavingRule(true)
    try {
      const payload = {
        name: ruleDraft.name.trim(),
        account: Number(ruleDraft.account),
        enabled: ruleDraft.enabled,
        folder: ruleDraft.folder.trim() || "INBOX",
        filter_from: ruleDraft.filter_from.trim() || null,
        filter_to: ruleDraft.filter_to.trim() || null,
        filter_subject: ruleDraft.filter_subject.trim() || null,
        filter_body: ruleDraft.filter_body.trim() || null,
        filter_attachment_filename_include:
          ruleDraft.filter_attachment_filename_include.trim() || null,
        filter_attachment_filename_exclude:
          ruleDraft.filter_attachment_filename_exclude.trim() || null,
        maximum_age: ruleDraft.maximum_age ? Number(ruleDraft.maximum_age) : 30,
        action: Number(ruleDraft.action),
        action_parameter: ruleDraft.action_parameter.trim(),
        assign_title_from: Number(ruleDraft.assign_title_from),
        assign_tags: ruleDraft.assign_tags,
        assign_correspondent_from: Number(ruleDraft.assign_correspondent_from),
        assign_correspondent: ruleDraft.assign_correspondent ? Number(ruleDraft.assign_correspondent) : null,
        assign_document_type: ruleDraft.assign_document_type ? Number(ruleDraft.assign_document_type) : null,
        assign_owner_from_rule: ruleDraft.assign_owner_from_rule,
        order: ruleDraft.order ? Number(ruleDraft.order) : ruleList.length + 1,
      }

      const saved = editingRule
        ? await patchJson<MailRule>(`/api/proxy/mail_rules/${editingRule.id}/`, payload)
        : await postJson<MailRule>("/api/proxy/mail_rules/", payload)

      setRuleList((prev) => {
        const next = editingRule
          ? prev.map((rule) => (rule.id === saved.id ? saved : rule))
          : [...prev, saved]
        return [...next].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      })
      toast.success(`Mail rule ${editingRule ? "updated" : "created"}`)
      setRuleDialogOpen(false)
    } catch (error) {
      toast.error(`Failed to ${editingRule ? "update" : "create"} mail rule`, {
        description: toErrorMessage(error),
      })
    } finally {
      setSavingRule(false)
    }
  }

  return (
    <>
      <Tabs defaultValue="accounts" className="gap-4">
        <div className="overflow-x-auto">
          <TabsList variant="line" className="min-w-max justify-start border-b p-0">
            <TabsTrigger value="accounts" className="gap-1.5 px-3">
              <Mail className="h-3.5 w-3.5" />Accounts ({accountList.length})
            </TabsTrigger>
            <TabsTrigger value="rules" className="gap-1.5 px-3">
              <Shield className="h-3.5 w-3.5" />Rules ({ruleList.length})
            </TabsTrigger>
            <TabsTrigger value="processed" className="gap-1.5 px-3">
              <History className="h-3.5 w-3.5" />Processed ({processedMail.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="accounts" className="m-0 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Manage inbound mail accounts used by Paperless for consumption.
            </p>
            <Button size="sm" className="h-8 gap-1.5" onClick={openCreateAccountDialog}>
              <Plus className="h-3.5 w-3.5" />
              New account
            </Button>
          </div>
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
                  <TableHead className="w-32 text-right">Actions</TableHead>
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => void handleProcessAccount(acct)}
                          disabled={processingAccountId === acct.id}
                        >
                          {processingAccountId === acct.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Play className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditAccountDialog(acct)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <HasObjectPermission action="delete" object={acct} type="mailAccount">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ type: "account", id: acct.id })}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </HasObjectPermission>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="rules" className="m-0">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Define how incoming mail should be filtered and classified.
            </p>
            <Button size="sm" className="h-8 gap-1.5" onClick={openCreateRuleDialog}>
              <Plus className="h-3.5 w-3.5" />
              New rule
            </Button>
          </div>
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
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditRuleDialog(rule)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <HasObjectPermission action="delete" object={rule} type="mailRule">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ type: "rule", id: rule.id })}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </HasObjectPermission>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="processed" className="m-0">
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
                              <OpenDocumentLink
                                documentId={entry.document}
                                title={entry.subject || `Document ${entry.document}`}
                              >
                                View doc
                              </OpenDocumentLink>
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

      <Dialog open={accountDialogOpen} onOpenChange={setAccountDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingAccount ? "Edit mail account" : "New mail account"}</DialogTitle>
            <DialogDescription>
              Configure how Paperless connects to and consumes a mailbox.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={accountDraft.name} onChange={(e) => handleAccountDraftChange("name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Account type</Label>
              <Select value={accountDraft.account_type} onValueChange={(value) => handleAccountDraftChange("account_type", value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>IMAP server</Label>
              <Input value={accountDraft.imap_server} onChange={(e) => handleAccountDraftChange("imap_server", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Port</Label>
              <Input value={accountDraft.imap_port} onChange={(e) => handleAccountDraftChange("imap_port", e.target.value)} inputMode="numeric" />
            </div>
            <div className="space-y-2">
              <Label>Security</Label>
              <Select value={accountDraft.imap_security} onValueChange={(value) => handleAccountDraftChange("imap_security", value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SECURITY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Character set</Label>
              <Input value={accountDraft.character_set} onChange={(e) => handleAccountDraftChange("character_set", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Username</Label>
              <Input value={accountDraft.username} onChange={(e) => handleAccountDraftChange("username", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{editingAccount ? "Password or token (leave blank to keep)" : "Password or token"}</Label>
              <Input type="password" value={accountDraft.password} onChange={(e) => handleAccountDraftChange("password", e.target.value)} />
            </div>
            <div className="md:col-span-2 flex items-center gap-3 rounded-md border px-3 py-2">
              <Checkbox checked={accountDraft.is_token} onCheckedChange={(checked) => handleAccountDraftChange("is_token", Boolean(checked))} />
              <div>
                <p className="text-sm font-medium">Use token authentication</p>
                <p className="text-xs text-muted-foreground">Enable this for OAuth/app-password style credentials.</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAccountDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleSaveAccount()} disabled={savingAccount}>
              {savingAccount ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingAccount ? "Save account" : "Create account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{editingRule ? "Edit mail rule" : "New mail rule"}</DialogTitle>
            <DialogDescription>
              Set mailbox filters and default classification for matching mail.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={ruleDraft.name} onChange={(e) => handleRuleDraftChange("name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Account</Label>
              <Select value={ruleDraft.account} onValueChange={(value) => handleRuleDraftChange("account", value)}>
                <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {accountList.map((account) => (
                    <SelectItem key={account.id} value={String(account.id)}>{account.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Folder</Label>
              <Input value={ruleDraft.folder} onChange={(e) => handleRuleDraftChange("folder", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Order</Label>
              <Input value={ruleDraft.order} onChange={(e) => handleRuleDraftChange("order", e.target.value)} inputMode="numeric" />
            </div>
            <div className="space-y-2">
              <Label>Filter from</Label>
              <Input value={ruleDraft.filter_from} onChange={(e) => handleRuleDraftChange("filter_from", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Filter to</Label>
              <Input value={ruleDraft.filter_to} onChange={(e) => handleRuleDraftChange("filter_to", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Filter subject</Label>
              <Input value={ruleDraft.filter_subject} onChange={(e) => handleRuleDraftChange("filter_subject", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Filter body</Label>
              <Input value={ruleDraft.filter_body} onChange={(e) => handleRuleDraftChange("filter_body", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Attachment include</Label>
              <Input value={ruleDraft.filter_attachment_filename_include} onChange={(e) => handleRuleDraftChange("filter_attachment_filename_include", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Attachment exclude</Label>
              <Input value={ruleDraft.filter_attachment_filename_exclude} onChange={(e) => handleRuleDraftChange("filter_attachment_filename_exclude", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Maximum age (days)</Label>
              <Input value={ruleDraft.maximum_age} onChange={(e) => handleRuleDraftChange("maximum_age", e.target.value)} inputMode="numeric" />
            </div>
            <div className="space-y-2">
              <Label>Action</Label>
              <Select value={ruleDraft.action} onValueChange={(value) => handleRuleDraftChange("action", value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(MAIL_RULE_ACTION_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Action parameter</Label>
              <Input value={ruleDraft.action_parameter} onChange={(e) => handleRuleDraftChange("action_parameter", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Assign title from</Label>
              <Select value={ruleDraft.assign_title_from} onValueChange={(value) => handleRuleDraftChange("assign_title_from", value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ASSIGN_TITLE_FROM_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assign correspondent from</Label>
              <Select value={ruleDraft.assign_correspondent_from} onValueChange={(value) => handleRuleDraftChange("assign_correspondent_from", value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ASSIGN_CORRESPONDENT_FROM_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assign correspondent</Label>
              <Select value={ruleDraft.assign_correspondent || "__none"} onValueChange={(value) => handleRuleDraftChange("assign_correspondent", value === "__none" ? "" : value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">None</SelectItem>
                  {correspondents.map((correspondent) => (
                    <SelectItem key={correspondent.id} value={String(correspondent.id)}>{correspondent.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assign document type</Label>
              <Select value={ruleDraft.assign_document_type || "__none"} onValueChange={(value) => handleRuleDraftChange("assign_document_type", value === "__none" ? "" : value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">None</SelectItem>
                  {documentTypes.map((documentType) => (
                    <SelectItem key={documentType.id} value={String(documentType.id)}>{documentType.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Assign tags</Label>
              <div className="grid gap-2 rounded-md border p-3 md:grid-cols-2">
                {tags.map((tag) => {
                  const checked = ruleDraft.assign_tags.includes(tag.id)
                  return (
                    <label key={tag.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(nextChecked) =>
                          handleRuleDraftChange(
                            "assign_tags",
                            nextChecked
                              ? [...ruleDraft.assign_tags, tag.id]
                              : ruleDraft.assign_tags.filter((id) => id !== tag.id)
                          )
                        }
                      />
                      <span>{tag.name}</span>
                    </label>
                  )
                })}
              </div>
            </div>
            <div className="md:col-span-2 flex items-center justify-between rounded-md border px-3 py-2">
              <div>
                <p className="text-sm font-medium">Rule enabled</p>
                <p className="text-xs text-muted-foreground">Only enabled rules will process incoming mail.</p>
              </div>
              <Switch checked={ruleDraft.enabled} onCheckedChange={(checked) => handleRuleDraftChange("enabled", checked)} />
            </div>
            <div className="md:col-span-2 flex items-center justify-between rounded-md border px-3 py-2">
              <div>
                <p className="text-sm font-medium">Assign rule owner to documents</p>
                <p className="text-xs text-muted-foreground">When enabled, consumed documents inherit the rule owner.</p>
              </div>
              <Switch checked={ruleDraft.assign_owner_from_rule} onCheckedChange={(checked) => handleRuleDraftChange("assign_owner_from_rule", checked)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRuleDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleSaveRule()} disabled={savingRule}>
              {savingRule ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {editingRule ? "Save rule" : "Create rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
