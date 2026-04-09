"use client"

import { AnimatePresence, motion } from "framer-motion"
import { CheckIcon, ChevronRightIcon, EyeIcon, MailIcon, PencilIcon, SendIcon } from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  variables: string[]
  enabled: boolean
  lastEdited: string
}

const initialTemplates: EmailTemplate[] = [
  {
    id: "1",
    name: "Welcome Email",
    subject: "Welcome to Acme, {{user_name}}!",
    body: "Hi {{user_name}},\n\nWelcome to Acme! Your account has been created successfully.\n\nGet started by visiting your dashboard at {{dashboard_url}}.\n\nBest,\nThe Acme Team",
    variables: ["user_name", "dashboard_url"],
    enabled: true,
    lastEdited: "2 days ago",
  },
  {
    id: "2",
    name: "Password Reset",
    subject: "Reset your password",
    body: "Hi {{user_name}},\n\nWe received a request to reset your password. Click the link below to set a new password:\n\n{{reset_url}}\n\nThis link expires in {{expiry_time}}.\n\nIf you didn't request this, you can safely ignore this email.",
    variables: ["user_name", "reset_url", "expiry_time"],
    enabled: true,
    lastEdited: "1 week ago",
  },
  {
    id: "3",
    name: "Invoice Receipt",
    subject: "Invoice #{{invoice_number}} — {{amount}} paid",
    body: "Hi {{user_name}},\n\nThank you for your payment of {{amount}} for invoice #{{invoice_number}}.\n\nPlan: {{plan_name}}\nDate: {{payment_date}}\n\nView your receipt at {{receipt_url}}.",
    variables: [
      "user_name",
      "invoice_number",
      "amount",
      "plan_name",
      "payment_date",
      "receipt_url",
    ],
    enabled: true,
    lastEdited: "3 days ago",
  },
  {
    id: "4",
    name: "Team Invitation",
    subject: "{{inviter_name}} invited you to join {{workspace_name}}",
    body: "Hi,\n\n{{inviter_name}} has invited you to join the {{workspace_name}} workspace on Acme.\n\nAccept the invitation: {{invite_url}}\n\nThis invitation expires in 7 days.",
    variables: ["inviter_name", "workspace_name", "invite_url"],
    enabled: false,
    lastEdited: "2 weeks ago",
  },
  {
    id: "5",
    name: "Usage Alert",
    subject: "You've reached {{usage_percent}}% of your {{resource}} limit",
    body: "Hi {{user_name}},\n\nYou've used {{usage_percent}}% of your monthly {{resource}} allowance.\n\nCurrent usage: {{current_usage}} / {{usage_limit}}\n\nUpgrade your plan to increase your limits: {{upgrade_url}}",
    variables: [
      "user_name",
      "usage_percent",
      "resource",
      "current_usage",
      "usage_limit",
      "upgrade_url",
    ],
    enabled: false,
    lastEdited: "1 month ago",
  },
]

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

export default function SettingsEmailTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>(initialTemplates)
  const [expanded, setExpanded] = useState<string | null>("1")
  const [editing, setEditing] = useState<string | null>(null)
  const [testSent, setTestSent] = useState<string | null>(null)

  const toggleTemplate = (id: string) => {
    setTemplates(prev => prev.map(t => (t.id === id ? { ...t, enabled: !t.enabled } : t)))
  }

  const updateTemplate = (id: string, updates: Partial<EmailTemplate>) => {
    setTemplates(prev => prev.map(t => (t.id === id ? { ...t, ...updates } : t)))
  }

  const sendTest = (id: string) => {
    setTestSent(id)
    setTimeout(() => setTestSent(null), 2000)
  }

  const enabledCount = templates.filter(t => t.enabled).length

  return (
    <section className="mx-auto w-full max-w-2xl p-4">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="overflow-hidden rounded-lg border bg-card"
      >
        {/* Header */}
        <motion.div
          variants={item}
          className="flex items-center justify-between border-b px-4 py-3"
        >
          <div>
            <p className="font-medium text-sm">Email Templates</p>
            <p className="mt-0.5 text-muted-foreground text-xs">
              Manage transactional email templates and variables
            </p>
          </div>
          <div className="flex items-center gap-2">
            <MailIcon className="size-4 text-muted-foreground" />
            <span className="text-muted-foreground text-xs">
              {enabledCount} of {templates.length} active
            </span>
          </div>
        </motion.div>

        {/* Templates list */}
        <div>
          {templates.map((template, index) => {
            const isExpanded = expanded === template.id
            const isEditing = editing === template.id
            const isLast = index === templates.length - 1
            return (
              <motion.div key={template.id} variants={item} className={isLast ? "" : "border-b"}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setExpanded(isExpanded ? null : template.id)}
                  onKeyDown={e => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault()
                      setExpanded(isExpanded ? null : template.id)
                    }
                  }}
                  className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                >
                  <span
                    className={`size-1.5 shrink-0 rounded-full ${template.enabled ? "bg-emerald-500" : "bg-muted-foreground/30"}`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{template.name}</span>
                      {!template.enabled && (
                        <Badge variant="secondary" className="font-normal text-xs">
                          Disabled
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-muted-foreground text-xs">
                      {template.subject}
                    </p>
                  </div>
                  <span className="shrink-0 text-muted-foreground text-xs">
                    {template.lastEdited}
                  </span>
                  <ChevronRightIcon
                    className={`size-4 shrink-0 text-muted-foreground/60 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                  />
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-3 px-4 pb-4 pl-8">
                        {/* Subject */}
                        <div>
                          <span className="mb-1.5 block font-medium text-muted-foreground text-xs">
                            Subject
                          </span>
                          {isEditing ? (
                            <Input
                              value={template.subject}
                              onChange={e =>
                                updateTemplate(template.id, {
                                  subject: e.target.value,
                                })
                              }
                              className="h-8 text-sm"
                            />
                          ) : (
                            <p className="font-mono text-sm">{template.subject}</p>
                          )}
                        </div>

                        {/* Body */}
                        <div>
                          <span className="mb-1.5 block font-medium text-muted-foreground text-xs">
                            Body
                          </span>
                          {isEditing ? (
                            <Textarea
                              value={template.body}
                              onChange={e =>
                                updateTemplate(template.id, {
                                  body: e.target.value,
                                })
                              }
                              className="min-h-32 font-mono text-sm"
                              rows={6}
                            />
                          ) : (
                            <div className="rounded-md bg-muted/50 p-3">
                              <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed">
                                {template.body}
                              </pre>
                            </div>
                          )}
                        </div>

                        {/* Variables */}
                        <div>
                          <span className="mb-1.5 block font-medium text-muted-foreground text-xs">
                            Variables
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {template.variables.map(variable => (
                              <Badge
                                key={variable}
                                variant="secondary"
                                className="font-mono text-xs"
                              >
                                {`{{${variable}}}`}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-1">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 gap-1 px-2 text-xs"
                              onClick={e => {
                                e.stopPropagation()
                                setEditing(isEditing ? null : template.id)
                              }}
                            >
                              {isEditing ? (
                                <>
                                  <EyeIcon className="size-3" />
                                  Preview
                                </>
                              ) : (
                                <>
                                  <PencilIcon className="size-3" />
                                  Edit
                                </>
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 gap-1 px-2 text-xs"
                              onClick={e => {
                                e.stopPropagation()
                                toggleTemplate(template.id)
                              }}
                            >
                              {template.enabled ? "Disable" : "Enable"}
                            </Button>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 text-xs"
                            onClick={e => {
                              e.stopPropagation()
                              sendTest(template.id)
                            }}
                          >
                            {testSent === template.id ? (
                              <>
                                <CheckIcon className="size-3 text-emerald-600 dark:text-emerald-400" />
                                Sent
                              </>
                            ) : (
                              <>
                                <SendIcon className="size-3" />
                                Send test
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      </motion.div>
    </section>
  )
}
