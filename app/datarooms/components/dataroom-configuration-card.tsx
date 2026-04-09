"use client"

import * as React from "react"
import type { Dataroom, DataroomOwner } from "@/lib/link-iq-types"
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
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { PencilIcon, Trash2Icon } from "lucide-react"

type PaperlessUser = {
  id: number
  username?: string
  email?: string
  first_name?: string
  last_name?: string
  last_login?: string
}

type OwnerRow = { owner: DataroomOwner; user?: PaperlessUser }

type EmailTemplateDefinition = {
  key: string
  name: string
}

type Props = {
  selectedId: string
  rooms: Dataroom[]
  roomDraft: Partial<Dataroom>
  setSelectedId: (value: string) => void
  setRoomDraft: React.Dispatch<React.SetStateAction<Partial<Dataroom>>>
  startCreateNewDataroom: () => void
  onSave: () => void
  formatDateInputValue: (value?: string) => string
  toISODateString: (value: string) => string | undefined
  autoPublishTimes: string[]
  handleBrandingLogoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  handleBrandingLogoDarkUpload: (event: React.ChangeEvent<HTMLInputElement>) => void
  brandingLogoFileName: string
  brandingLogoDarkFileName: string
  setBrandingLogoFileName: (value: string) => void
  setBrandingLogoDarkFileName: (value: string) => void
  ownerSearch: string
  setOwnerSearch: (value: string) => void
  ownerToAdd: string
  setOwnerToAdd: (value: string) => void
  filteredUsers: PaperlessUser[]
  formatUserLabel: (user: PaperlessUser) => string
  addOwner: () => void
  ownerRows: OwnerRow[]
  formatDateTime: (value?: string) => string
  removeOwner: (subjectID: string) => void
  emailTemplateDefinitions: readonly EmailTemplateDefinition[]
  onOpenTemplateEditor: (templateKey: string) => void
}

export function DataroomConfigurationCard({
  selectedId,
  rooms,
  roomDraft,
  setSelectedId,
  setRoomDraft,
  startCreateNewDataroom,
  onSave,
  formatDateInputValue,
  toISODateString,
  autoPublishTimes,
  handleBrandingLogoUpload,
  handleBrandingLogoDarkUpload,
  brandingLogoFileName,
  brandingLogoDarkFileName,
  setBrandingLogoFileName,
  setBrandingLogoDarkFileName,
  ownerSearch,
  setOwnerSearch,
  ownerToAdd,
  setOwnerToAdd,
  filteredUsers,
  formatUserLabel,
  addOwner,
  ownerRows,
  formatDateTime,
  removeOwner,
  emailTemplateDefinitions,
  onOpenTemplateEditor,
}: Props) {
  const dataroomUrl = React.useMemo(() => {
    if (!roomDraft.slug?.trim()) return ""
    if (typeof window === "undefined") return `/dataroom/${roomDraft.slug.trim()}`
    return `${window.location.origin}/dataroom/${roomDraft.slug.trim()}`
  }, [roomDraft.slug])

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="space-y-1">
          <CardTitle>Dataroom configuration</CardTitle>
          <CardDescription>Select, configure, and assign owners for a dataroom.</CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={startCreateNewDataroom}>
            Create New
          </Button>
          <Button variant="secondary" onClick={onSave}>
            Save
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-3">
        <div className="space-y-4 md:col-span-1">
          <div className="grid gap-2 md:grid-cols-2">
            <div className="flex items-center gap-2">
              <Label className="min-w-[90px] justify-start">Dataroom</Label>
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger className="h-12 w-full text-sm">
                  <SelectValue placeholder="Select dataroom" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((room) => (
                    <SelectItem key={room.dataroom_id} value={room.dataroom_id}>
                      {room.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="min-w-[60px] justify-end pr-4">Slug</Label>
              <Input
                value={roomDraft.slug ?? ""}
                onChange={(event) => setRoomDraft((previous) => ({ ...previous, slug: event.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-2.5">
            <Label>Title</Label>
            <Input
              value={roomDraft.title ?? ""}
              onChange={(event) => setRoomDraft((previous) => ({ ...previous, title: event.target.value }))}
            />
          </div>
          <div className="space-y-2.5">
            <Label>Description</Label>
            <Textarea
              rows={2}
              value={roomDraft.description ?? ""}
              onChange={(event) =>
                setRoomDraft((previous) => ({ ...previous, description: event.target.value }))
              }
            />
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <div className="space-y-2.5">
              <Label>Start date</Label>
              <Input
                type="date"
                value={formatDateInputValue(roomDraft.commencement_date)}
                onChange={(event) =>
                  setRoomDraft((previous) => ({
                    ...previous,
                    commencement_date: toISODateString(event.target.value),
                  }))
                }
              />
            </div>
            <div className="space-y-2.5">
              <Label>End date</Label>
              <Input
                type="date"
                value={formatDateInputValue(roomDraft.closure_date)}
                onChange={(event) =>
                  setRoomDraft((previous) => ({
                    ...previous,
                    closure_date: toISODateString(event.target.value),
                  }))
                }
              />
            </div>
          </div>
          <div className="space-y-2.5">
            <Label>Auto-publishing schedule</Label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={roomDraft.auto_publish_immediately !== false}
                  onCheckedChange={(checked) =>
                    setRoomDraft((previous) => ({
                      ...previous,
                      auto_publish_immediately: Boolean(checked),
                    }))
                  }
                />
                <Label className="text-xs text-white">
                  Publish immediately (documents become available in dataroom as soon as classified)
                </Label>
              </div>
              {roomDraft.auto_publish_immediately === false ? (
                <div className="flex items-center gap-2">
                  <Label className="min-w-[120px]">Scheduled time</Label>
                  <Select
                    value={roomDraft.auto_publish_scheduled_time ?? "00:00"}
                    onValueChange={(value) =>
                      setRoomDraft((previous) => ({
                        ...previous,
                        auto_publish_scheduled_time: value,
                      }))
                    }
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {autoPublishTimes.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Branding logos</Label>
            <Carousel className="w-full rounded-md border p-3" opts={{ align: "start" }}>
              <CarouselContent>
                <CarouselItem>
                  <div className="grid gap-5 md:grid-cols-3">
                    <div className="space-y-2 md:col-span-2 align-bottom">
                      <Label>Branding Logo (Light)</Label>
                      <Input
                        value={roomDraft.login_logo_url ?? ""}
                        placeholder="Paste light logo URL (or upload below)"
                        onChange={(event) =>
                          setRoomDraft((previous) => ({ ...previous, login_logo_url: event.target.value }))
                        }
                      />
                      <div className="flex items-center gap-2">
                        <Input
                          type="file"
                          accept="image/*,.svg,image/svg+xml"
                          onChange={handleBrandingLogoUpload}
                          className="h-10"
                        />
                        {roomDraft.login_logo_url ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setRoomDraft((previous) => ({ ...previous, login_logo_url: "" }))
                              setBrandingLogoFileName("")
                            }}
                          >
                            Clear
                          </Button>
                        ) : null}
                      </div>
                      {brandingLogoFileName ? (
                        <p className="text-muted-foreground text-xs">Uploaded: {brandingLogoFileName}</p>
                      ) : null}
                    </div>
                    <div className="rounded-md border p-1.5">
                      <div className="flex h-24 items-center justify-center rounded border-none bg-muted/20">
                        {roomDraft.login_logo_url ? (
                          <img
                            src={roomDraft.login_logo_url}
                            alt="Branding light logo preview"
                            className="max-h-20 max-w-full object-contain"
                          />
                        ) : (
                          <span className="text-muted-foreground text-xs">No image</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CarouselItem>
                <CarouselItem>
                  <div className="grid gap-5 md:grid-cols-3">
                    <div className="space-y-2 md:col-span-2 align-bottom">
                      <Label>Branding Logo (Dark)</Label>
                      <Input
                        value={roomDraft.login_logo_dark_url ?? ""}
                        placeholder="Paste dark logo URL (or upload below)"
                        onChange={(event) =>
                          setRoomDraft((previous) => ({ ...previous, login_logo_dark_url: event.target.value }))
                        }
                      />
                      <div className="flex items-center gap-2">
                        <Input
                          type="file"
                          accept="image/*,.svg,image/svg+xml"
                          onChange={handleBrandingLogoDarkUpload}
                          className="h-10"
                        />
                        {roomDraft.login_logo_dark_url ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setRoomDraft((previous) => ({ ...previous, login_logo_dark_url: "" }))
                              setBrandingLogoDarkFileName("")
                            }}
                          >
                            Clear
                          </Button>
                        ) : null}
                      </div>
                      {brandingLogoDarkFileName ? (
                        <p className="text-muted-foreground text-xs">Uploaded: {brandingLogoDarkFileName}</p>
                      ) : null}
                    </div>
                    <div className="rounded-md border p-1.5">
                      <div className="flex h-24 items-center justify-center rounded border-none bg-muted/20">
                        {roomDraft.login_logo_dark_url ? (
                          <img
                            src={roomDraft.login_logo_dark_url}
                            alt="Branding dark logo preview"
                            className="max-h-20 max-w-full object-contain"
                          />
                        ) : (
                          <span className="text-muted-foreground text-xs">No image</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              </CarouselContent>
              <CarouselPrevious className="-left-3 top-1/2" />
              <CarouselNext className="-right-3 top-1/2" />
            </Carousel>
          </div>
        </div>

        <div className="space-y-4 md:col-span-2">
          <div className="px-3 py-1">
            <div className="flex items-center gap-2">
              <Label className="min-w-[110px] text-xs">Dataroom URL</Label>
              <Input value={dataroomUrl} readOnly placeholder="Dataroom URL" className="h-9 text-xs" />
            </div>
          </div>
          <div className="space-y-2.5 px-3 py-2">
            <Label>Owners</Label>
            <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
            <Input
              placeholder="Search users by name, username, email"
              value={ownerSearch}
              onChange={(event) => setOwnerSearch(event.target.value)}
            />
            <div className="flex items-center gap-2">
              <Label className="min-w-[56px] text-xs">User</Label>
              <Select value={ownerToAdd} onValueChange={setOwnerToAdd}>
                <SelectTrigger className="h-12 w-full text-sm">
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {filteredUsers.length === 0 ? (
                    <SelectItem value="__none__" disabled>
                      No matching users
                    </SelectItem>
                  ) : (
                    filteredUsers.map((user) => (
                      <SelectItem key={user.id} value={String(user.id)}>
                        {formatUserLabel(user)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={addOwner} disabled={!selectedId || !ownerToAdd}>
              Add owner
            </Button>
            </div>
            <div className="overflow-hidden rounded-md border mt-2.5">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Last login</TableHead>
                    <TableHead className="w-[96px] text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ownerRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-muted-foreground">
                        No owners assigned.
                      </TableCell>
                    </TableRow>
                  ) : (
                    ownerRows.map(({ owner, user }) => (
                      <TableRow key={owner.subject_id}>
                        <TableCell>{user?.username || owner.subject_id}</TableCell>
                        <TableCell className="font-mono text-xs">{owner.subject_id}</TableCell>
                        <TableCell>{user?.email || "n/a"}</TableCell>
                        <TableCell>{formatDateTime(user?.last_login)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-destructive hover:text-destructive"
                            onClick={() => removeOwner(owner.subject_id)}
                          >
                            <Trash2Icon className="size-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
          <div className="space-y-2.5 px-3 py-2">
            <Label>Email templates</Label>
            <div className="overflow-hidden rounded-md border mt-2.5">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[92px] text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emailTemplateDefinitions.map((template) => {
                  const entry = roomDraft.email_templates?.[template.key]
                  const hasOverride = Boolean(
                    entry?.subject?.trim() || entry?.body_text?.trim() || entry?.body_html?.trim(),
                  )
                  return (
                    <TableRow key={template.key}>
                      <TableCell>{template.name}</TableCell>
                      <TableCell className="max-w-[12rem] truncate text-muted-foreground text-xs">
                        {entry?.subject?.trim() || "Using system default subject"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={hasOverride ? "secondary" : "outline"} className="text-xs">
                          {hasOverride ? "Overridden" : "Default"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1 text-xs"
                          onClick={() => onOpenTemplateEditor(template.key)}
                        >
                          <PencilIcon className="size-3" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
