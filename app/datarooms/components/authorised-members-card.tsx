"use client"

import * as React from "react"
import type { DataroomInvitee, DataroomInviteeStats } from "@/lib/link-iq-types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CheckCircle2Icon, CircleIcon, Clock3Icon, MoreHorizontalIcon, Trash2Icon } from "lucide-react"

type Props = {
  pendingInviteCount: number
  inviteeDraft: Partial<DataroomInvitee>
  setInviteeDraft: React.Dispatch<React.SetStateAction<Partial<DataroomInvitee>>>
  accessPresets: string[]
  saveInvitee: () => void
  selectedId: string
  invitees: DataroomInvitee[]
  inviteeStatsByKey: Map<string, DataroomInviteeStats>
  formatDateTime: (value?: string) => string
  scheduledInviteDates: Record<string, string>
  scheduleInviteDate: (invitee: DataroomInvitee, localValue: string) => void
  sendingInviteKey: string | null
  roomSlug?: string
  sendInviteNow: (invitee: DataroomInvitee) => void
  getSummaryCount: (...keys: string[]) => number
  memberActionKey: string | null
  toggleInviteeDisabled: (invitee: DataroomInvitee) => void
  removeInvitee: (invitee: DataroomInvitee) => void
  setMemberDetailKey: (key: string) => void
}

export function AuthorisedMembersCard({
  pendingInviteCount,
  inviteeDraft,
  setInviteeDraft,
  accessPresets,
  saveInvitee,
  selectedId,
  invitees,
  inviteeStatsByKey,
  formatDateTime,
  scheduledInviteDates,
  scheduleInviteDate,
  sendingInviteKey,
  roomSlug,
  sendInviteNow,
  getSummaryCount,
  memberActionKey,
  toggleInviteeDisabled,
  removeInvitee,
  setMemberDetailKey,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Authorised members <span className="font-normal text-xs">(pending: {pendingInviteCount})</span>
        </CardTitle>
        <CardDescription>Email-only users with access windows and magic-link policy.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-4">
          <Input
            placeholder="Invitee email"
            value={inviteeDraft.email ?? ""}
            className="h-8 text-xs"
            onChange={(event) => setInviteeDraft((previous) => ({ ...previous, email: event.target.value }))}
          />
          <div className="flex items-center gap-2">
            <Label className="min-w-[56px] text-xs pl-5">Access</Label>
            <Select
              value={inviteeDraft.access_preset ?? "24 hours"}
              onValueChange={(value) => setInviteeDraft((previous) => ({ ...previous, access_preset: value }))}
            >
              <SelectTrigger className="h-8 text-xs w-[10rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accessPresets.map((preset) => (
                  <SelectItem key={preset} value={preset}>
                    {preset}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="min-w-[56px] text-xs">Mode</Label>
            <Select
              value={inviteeDraft.magic_link_mode ?? "one_time"}
              onValueChange={(value) =>
                setInviteeDraft((previous) => ({
                  ...previous,
                  magic_link_mode: value as "one_time" | "ttl_minutes",
                }))
              }
            >
              <SelectTrigger className="h-8 text-xs w-[10rem]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="one_time">One-time</SelectItem>
                <SelectItem value="ttl_minutes">TTL minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="h-8 text-xs w-[15rem]" onClick={saveInvitee} disabled={!selectedId}>
            Add invitee and sent invite
          </Button>
        </div>
        {inviteeDraft.magic_link_mode === "ttl_minutes" ? (
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Magic link TTL (minutes)</Label>
            <Input
              type="number"
              min={1}
              className="h-8 w-28 text-xs"
              value={inviteeDraft.magic_link_ttl_minutes ?? 15}
              onChange={(event) =>
                setInviteeDraft((previous) => ({
                  ...previous,
                  magic_link_ttl_minutes: Number(event.target.value || 15),
                }))
              }
            />
          </div>
        ) : null}

        <div className="overflow-hidden rounded-md border">
          {invitees.length === 0 ? (
            <div className="px-4 py-3 text-muted-foreground text-xs">No invitees yet.</div>
          ) : (
            <div className="overflow-auto my-2.5">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member email</TableHead>
                    <TableHead>Invite issued</TableHead>
                    <TableHead>Send</TableHead>
                    <TableHead>Valid until</TableHead>
                    <TableHead>Invite #</TableHead>
                    <TableHead>First activation</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead>Used</TableHead>
                    <TableHead>Last login</TableHead>
                    <TableHead>Viewed</TableHead>
                    <TableHead>D/L</TableHead>
                    <TableHead>Printed</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[200px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitees.map((invitee) => {
                    const rowKey = invitee.invitee_id || invitee.email
                    const stats =
                      (invitee.invitee_id && inviteeStatsByKey.get(invitee.invitee_id)) ||
                      inviteeStatsByKey.get(`email:${invitee.email.toLowerCase()}`)
                    const invitedAt = stats?.invited_at || invitee.created_at
                    const activationAt = stats?.activated_at || invitee.activated_at
                    const validUntil = invitee.access_end
                    const isExpired = validUntil != null && new Date(validUntil).getTime() < Date.now()
                    const scheduledValue = scheduledInviteDates[rowKey] || ""
                    const isActioning = memberActionKey === rowKey

                    return (
                      <TableRow key={rowKey}>
                        <TableCell className="font-mono text-xs">{invitee.email}</TableCell>
                        <TableCell>
                          {invitedAt ? (
                            <div className="flex items-center gap-1 text-xs">
                              <CheckCircle2Icon className="size-3.5 text-emerald-500" />
                              <span>{formatDateTime(invitedAt)}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Clock3Icon className="size-3.5 text-amber-500" />
                              <Input
                                type="datetime-local"
                                value={scheduledValue}
                                className="h-8 w-[180px] text-xs"
                                onChange={(event) => scheduleInviteDate(invitee, event.target.value)}
                              />
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            disabled={sendingInviteKey === rowKey || !roomSlug}
                            onClick={() => sendInviteNow(invitee)}
                          >
                            {sendingInviteKey === rowKey ? "Sending..." : "Send now"}
                          </Button>
                        </TableCell>
                        <TableCell>
                          {validUntil ? (
                            <div className="flex items-center gap-1 text-xs">
                              <CircleIcon
                                className={`size-3 fill-current ${
                                  isExpired ? "text-red-500" : "text-amber-500"
                                }`}
                              />
                              <span>{formatDateTime(validUntil)}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">No expiry</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{stats?.links_issued ?? 0}</TableCell>
                        <TableCell>
                          {activationAt ? (
                            <div className="flex items-center gap-1 text-xs">
                              <CheckCircle2Icon className="size-3.5 text-emerald-500" />
                              <span>{formatDateTime(activationAt)}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">Pending</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{stats?.links_issued ?? 0}</TableCell>
                        <TableCell className="text-xs">{stats?.access_count ?? 0}</TableCell>
                        <TableCell className="text-xs">
                          {stats?.last_access_at ? formatDateTime(stats.last_access_at) : "n/a"}
                        </TableCell>
                        <TableCell className="text-xs">{stats?.documents_viewed ?? 0}</TableCell>
                        <TableCell className="text-xs">
                          {getSummaryCount("document_downloaded", "dataroom.document.downloaded")}
                        </TableCell>
                        <TableCell className="text-xs">
                          {getSummaryCount("document_printed", "dataroom.document.printed")}
                        </TableCell>
                        <TableCell>
                          <Badge variant={invitee.disabled ? "secondary" : "outline"} className="text-xs">
                            {invitee.disabled ? "Disabled" : "Active"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              disabled={isActioning}
                              onClick={() => toggleInviteeDisabled(invitee)}
                            >
                              {invitee.disabled ? "Enable" : "Disable"}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-destructive hover:text-destructive"
                              disabled={isActioning || !invitee.invitee_id}
                              onClick={() => removeInvitee(invitee)}
                            >
                              <Trash2Icon className="size-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => setMemberDetailKey(rowKey)}
                              aria-label={`Open ${invitee.email} details`}
                            >
                              <MoreHorizontalIcon className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
