"use client"

import { AnimatePresence, motion } from "framer-motion"
import {
  CheckIcon,
  CopyIcon,
  LinkIcon,
  MailIcon,
  PlusIcon,
  RefreshCwIcon,
  XIcon,
} from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

interface PendingInvite {
  id: string
  email: string
  role: string
  sentAt: string
  status: "pending" | "expired"
}

interface InviteConfig {
  linkEnabled: boolean
  linkExpiry: string
  domainRestriction: boolean
  autoJoin: boolean
  defaultRole: string
  maxMembers: string
  requireApproval: boolean
}

const inviteLink = "https://app.acme.com/join/ws_8f3k2n4p"

const initialDomains = ["acme.com", "acme.io"]

const pendingInvites: PendingInvite[] = [
  {
    id: "1",
    email: "sarah.miller@acme.com",
    role: "editor",
    sentAt: "2 hours ago",
    status: "pending",
  },
  {
    id: "2",
    email: "james.wong@acme.com",
    role: "viewer",
    sentAt: "Yesterday",
    status: "pending",
  },
  {
    id: "3",
    email: "priya.sharma@acme.io",
    role: "admin",
    sentAt: "3 days ago",
    status: "pending",
  },
  {
    id: "4",
    email: "mike.johnson@external.com",
    role: "viewer",
    sentAt: "5 days ago",
    status: "expired",
  },
]

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
}

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

export default function SettingsWorkspaceInvites() {
  const [config, setConfig] = useState<InviteConfig>({
    linkEnabled: true,
    linkExpiry: "7d",
    domainRestriction: true,
    autoJoin: false,
    defaultRole: "viewer",
    maxMembers: "50",
    requireApproval: false,
  })
  const [domains, setDomains] = useState<string[]>(initialDomains)
  const [invites, setInvites] = useState<PendingInvite[]>(pendingInvites)
  const [newDomain, setNewDomain] = useState("")
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const addDomain = () => {
    if (!newDomain.trim() || domains.includes(newDomain.trim())) return
    setDomains(prev => [...prev, newDomain.trim()])
    setNewDomain("")
  }

  const removeDomain = (domain: string) => {
    setDomains(prev => prev.filter(d => d !== domain))
  }

  const revokeInvite = (id: string) => {
    setInvites(prev => prev.filter(i => i.id !== id))
  }

  return (
    <section className="mx-auto w-full max-w-2xl p-4">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="overflow-hidden rounded-lg border bg-card"
      >
        {/* Header */}
        <motion.div variants={item} className="border-b px-4 py-3">
          <p className="font-medium text-sm">Workspace Invites</p>
          <p className="mt-0.5 text-muted-foreground text-xs">
            Invite link, domain restrictions, and pending invitations
          </p>
        </motion.div>

        {/* Invite link */}
        <motion.div variants={item} className="border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LinkIcon className="size-3.5 text-muted-foreground" />
              <span className="font-medium text-sm">Invite link</span>
            </div>
            <Switch
              checked={config.linkEnabled}
              onCheckedChange={checked => setConfig({ ...config, linkEnabled: checked })}
            />
          </div>
          {config.linkEnabled && (
            <div className="mt-3 space-y-3">
              <div className="flex items-center gap-2">
                <Input value={inviteLink} readOnly className="h-8 flex-1 font-mono text-xs" />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 text-xs"
                  onClick={handleCopyLink}
                >
                  {copied ? (
                    <>
                      <CheckIcon className="size-3" />
                      Copied
                    </>
                  ) : (
                    <>
                      <CopyIcon className="size-3" />
                      Copy
                    </>
                  )}
                </Button>
                <Button variant="ghost" size="sm" className="h-8 px-2" title="Regenerate link">
                  <RefreshCwIcon className="size-3.5" />
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-muted-foreground text-xs">Link expiration</p>
                <Select
                  value={config.linkExpiry}
                  onValueChange={value => setConfig({ ...config, linkExpiry: value })}
                >
                  <SelectTrigger className="h-7 w-28 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1d">1 day</SelectItem>
                    <SelectItem value="7d">7 days</SelectItem>
                    <SelectItem value="30d">30 days</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </motion.div>

        {/* Domain restrictions */}
        <motion.div variants={item} className="border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Domain restriction</p>
              <p className="mt-0.5 text-muted-foreground text-xs">
                Only allow signups from approved email domains
              </p>
            </div>
            <Switch
              checked={config.domainRestriction}
              onCheckedChange={checked => setConfig({ ...config, domainRestriction: checked })}
            />
          </div>

          {config.domainRestriction && (
            <div className="mt-3">
              <div className="space-y-1.5">
                {domains.map(domain => (
                  <div
                    key={domain}
                    className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-1.5"
                  >
                    <span className="font-mono text-xs">@{domain}</span>
                    <button
                      type="button"
                      onClick={() => removeDomain(domain)}
                      className="rounded p-0.5 text-muted-foreground transition-colors hover:text-red-600"
                    >
                      <XIcon className="size-3" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-2 flex items-center gap-2">
                <Input
                  value={newDomain}
                  onChange={e => setNewDomain(e.target.value)}
                  placeholder="company.com"
                  className="h-7 flex-1 text-xs"
                  onKeyDown={e => e.key === "Enter" && addDomain()}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={addDomain}
                >
                  <PlusIcon className="size-3" />
                  Add
                </Button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Auto-join and defaults */}
        <motion.div variants={item} className="border-b px-4 py-3">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Auto-join</p>
                <p className="mt-0.5 text-muted-foreground text-xs">
                  Users with matching domains join automatically
                </p>
              </div>
              <Switch
                checked={config.autoJoin}
                onCheckedChange={checked => setConfig({ ...config, autoJoin: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Default role</p>
                <p className="mt-0.5 text-muted-foreground text-xs">Role assigned to new members</p>
              </div>
              <Select
                value={config.defaultRole}
                onValueChange={value => setConfig({ ...config, defaultRole: value })}
              >
                <SelectTrigger className="h-8 w-28 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Max members</p>
                <p className="mt-0.5 text-muted-foreground text-xs">
                  Maximum workspace members allowed
                </p>
              </div>
              <Input
                value={config.maxMembers}
                onChange={e => setConfig({ ...config, maxMembers: e.target.value })}
                className="h-8 w-20 text-center text-xs"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Require admin approval</p>
                <p className="mt-0.5 text-muted-foreground text-xs">
                  New members need approval before joining
                </p>
              </div>
              <Switch
                checked={config.requireApproval}
                onCheckedChange={checked => setConfig({ ...config, requireApproval: checked })}
              />
            </div>
          </div>
        </motion.div>

        {/* Pending invitations */}
        <motion.div variants={item} className="border-b">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <MailIcon className="size-3.5 text-muted-foreground" />
              <span className="font-medium text-sm">Pending invitations</span>
              <Badge variant="secondary" className="font-normal text-xs">
                {invites.filter(i => i.status === "pending").length}
              </Badge>
            </div>
          </div>

          {invites.map((invite, index) => {
            const isLast = index === invites.length - 1
            return (
              <div
                key={invite.id}
                className={`flex items-center justify-between px-4 py-2.5 ${isLast ? "" : "border-t"}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-xs">{invite.email}</p>
                  <p className="mt-0.5 text-muted-foreground text-xs">
                    {invite.role} · Sent {invite.sentAt}
                    {invite.status === "expired" && (
                      <span className="ml-1 text-amber-600 dark:text-amber-400">· Expired</span>
                    )}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-red-600 text-xs hover:text-red-700"
                  onClick={() => revokeInvite(invite.id)}
                >
                  Revoke
                </Button>
              </div>
            )
          })}
        </motion.div>

        {/* Save */}
        <motion.div variants={item} className="flex items-center justify-end gap-2 px-4 py-3">
          <AnimatePresence>
            {saved && (
              <motion.span
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                className="flex items-center gap-1 text-emerald-600 text-xs dark:text-emerald-400"
              >
                <CheckIcon className="size-3" />
                Saved
              </motion.span>
            )}
          </AnimatePresence>
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={handleSave}>
            Save changes
          </Button>
        </motion.div>
      </motion.div>
    </section>
  )
}
