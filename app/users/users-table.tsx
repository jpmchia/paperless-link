"use client"

import * as React from "react"
import { CanCreate } from "@/components/permissions/can-create"
import { CanChange } from "@/components/permissions/can-change"
import { CanDelete } from "@/components/permissions/can-delete"
import { usePermissions } from "@/hooks/use-permissions"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Trash2, UserPlus, Users, Shield, Pencil } from "lucide-react"
import { toast } from "sonner"

interface PaperlessUser {
  id: number
  username: string
  email?: string
  first_name?: string
  last_name?: string
  is_active?: boolean
  is_staff?: boolean
  is_superuser?: boolean
  groups?: number[]
}

interface PaperlessGroup {
  id: number
  name: string
  users?: number[]
}

async function apiAction(
  method: string,
  path: string,
  body?: Record<string, unknown>
) {
  const res = await fetch(`/api/proxy/${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`)
  if (method === "DELETE") return null
  return res.json()
}

// ── User form dialog ──────────────────────────────────────────────────────────

function UserDialog({
  user,
  groups,
  onClose,
  onSave,
}: {
  user: PaperlessUser | null  // null = create
  groups: PaperlessGroup[]
  onClose: () => void
  onSave: (u: PaperlessUser) => void
}) {
  const isNew = !user
  const [username, setUsername] = React.useState(user?.username ?? "")
  const [email, setEmail] = React.useState(user?.email ?? "")
  const [firstName, setFirstName] = React.useState(user?.first_name ?? "")
  const [lastName, setLastName] = React.useState(user?.last_name ?? "")
  const [password, setPassword] = React.useState("")
  const [isActive, setIsActive] = React.useState(user?.is_active ?? true)
  const [isStaff, setIsStaff] = React.useState(user?.is_staff ?? false)
  const [isSuperuser, setIsSuperuser] = React.useState(user?.is_superuser ?? false)
  const [selectedGroups, setSelectedGroups] = React.useState<number[]>(user?.groups ?? [])
  const [saving, setSaving] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        username,
        email,
        first_name: firstName,
        last_name: lastName,
        is_active: isActive,
        is_staff: isStaff,
        is_superuser: isSuperuser,
        groups: selectedGroups,
      }
      if (password) body.password = password
      const result = isNew
        ? await apiAction("POST", "users/", body)
        : await apiAction("PATCH", `users/${user!.id}/`, body)
      onSave(result)
      toast.success(isNew ? "User created" : "User updated")
    } catch (error) {
      toast.error("Failed to save user", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isNew ? "Create User" : `Edit ${user?.username}`}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Username *</Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">First name</Label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Last name</Label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">{isNew ? "Password *" : "New password (leave blank to keep)"}</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={isNew}
              className="h-8 text-sm"
            />
          </div>

          {groups.length > 0 && (
            <div className="space-y-1">
              <Label className="text-xs">Groups</Label>
              <div className="flex flex-wrap gap-1.5 border rounded-md p-2 min-h-[36px]">
                {groups.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() =>
                      setSelectedGroups((prev) =>
                        prev.includes(g.id) ? prev.filter((id) => id !== g.id) : [...prev, g.id]
                      )
                    }
                    className={`text-xs rounded-full px-2 py-0.5 border transition-colors ${
                      selectedGroups.includes(g.id)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted text-muted-foreground border-border hover:border-primary"
                    }`}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-4 pt-1">
            <div className="flex items-center gap-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} id="is-active" />
              <Label htmlFor="is-active" className="text-xs cursor-pointer">Active</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isStaff} onCheckedChange={setIsStaff} id="is-staff" />
              <Label htmlFor="is-staff" className="text-xs cursor-pointer">Staff</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isSuperuser} onCheckedChange={setIsSuperuser} id="is-super" />
              <Label htmlFor="is-super" className="text-xs cursor-pointer">Superuser</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving || !username}>
              {saving ? "Saving…" : isNew ? "Create" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Group form dialog ─────────────────────────────────────────────────────────

function GroupDialog({
  group,
  onClose,
  onSave,
}: {
  group: PaperlessGroup | null
  onClose: () => void
  onSave: (g: PaperlessGroup) => void
}) {
  const isNew = !group
  const [name, setName] = React.useState(group?.name ?? "")
  const [saving, setSaving] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const result = isNew
        ? await apiAction("POST", "groups/", { name })
        : await apiAction("PATCH", `groups/${group!.id}/`, { name })
      onSave(result)
      toast.success(isNew ? "Group created" : "Group updated")
    } catch (error) {
      toast.error("Failed to save group", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isNew ? "Create Group" : `Edit "${group?.name}"`}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Group name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-8 text-sm"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? "Saving…" : isNew ? "Create" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function UsersTable({
  initialUsers,
  initialGroups,
}: {
  initialUsers: PaperlessUser[]
  initialGroups: PaperlessGroup[]
}) {
  const [users, setUsers] = React.useState<PaperlessUser[]>(initialUsers)
  const [groups, setGroups] = React.useState<PaperlessGroup[]>(initialGroups)
  const [deleteTarget, setDeleteTarget] = React.useState<{ type: "user" | "group"; id: number; name: string } | null>(null)
  const [editUser, setEditUser] = React.useState<PaperlessUser | null | "new">(null)
  const [editGroup, setEditGroup] = React.useState<PaperlessGroup | null | "new">(null)
  const { can } = usePermissions()

  const groupMap: Record<number, string> = {}
  groups.forEach((g) => { groupMap[g.id] = g.name })

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await apiAction("DELETE", deleteTarget.type === "user" ? `users/${deleteTarget.id}/` : `groups/${deleteTarget.id}/`)
      if (deleteTarget.type === "user") {
        setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id))
      } else {
        setGroups((prev) => prev.filter((g) => g.id !== deleteTarget.id))
      }
      toast.success(`${deleteTarget.type === "user" ? "User" : "Group"} deleted`)
    } catch (error) {
      toast.error("Failed to delete", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <>
      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />Users ({users.length})
          </TabsTrigger>
          <TabsTrigger value="groups" className="gap-1.5">
            <Shield className="h-3.5 w-3.5" />Groups ({groups.length})
          </TabsTrigger>
        </TabsList>

        {/* ── Users tab ── */}
        <TabsContent value="users" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <CanCreate type="user">
              <Button size="sm" onClick={() => setEditUser("new")}>
                <UserPlus className="mr-2 h-3.5 w-3.5" />New User
              </Button>
            </CanCreate>
          </div>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Groups</TableHead>
                  <TableHead className="w-24 text-center">Flags</TableHead>
                  <TableHead className="w-20 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground h-24">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        {u.username}
                        {u.is_superuser && (
                          <Badge variant="destructive" className="ml-2 text-[10px] px-1 py-0">super</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {[u.first_name, u.last_name].filter(Boolean).join(" ") || "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">{u.email || "—"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(u.groups ?? []).length === 0 ? (
                            <span className="text-muted-foreground text-xs">—</span>
                          ) : (
                            (u.groups ?? []).map((gid) => (
                              <Badge key={gid} variant="secondary" className="text-xs font-normal">
                                {groupMap[gid] ?? `#${gid}`}
                              </Badge>
                            ))
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {u.is_active && <Badge variant="outline" className="text-[10px] px-1 py-0">active</Badge>}
                          {u.is_staff && <Badge variant="secondary" className="text-[10px] px-1 py-0">staff</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <CanChange type="user">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => setEditUser(u)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          </CanChange>
                          <CanDelete type="user">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget({ type: "user", id: u.id, name: u.username })}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </CanDelete>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── Groups tab ── */}
        <TabsContent value="groups" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <CanCreate type="group">
              <Button size="sm" onClick={() => setEditGroup("new")}>
                <Shield className="mr-2 h-3.5 w-3.5" />New Group
              </Button>
            </CanCreate>
          </div>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead className="w-20 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                      No groups configured.
                    </TableCell>
                  </TableRow>
                ) : (
                  groups.map((g) => {
                    const members = users.filter((u) => (u.groups ?? []).includes(g.id))
                    return (
                      <TableRow key={g.id}>
                        <TableCell className="font-medium">{g.name}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {members.length === 0 ? (
                              <span className="text-muted-foreground text-xs">No members</span>
                            ) : (
                              members.map((u) => (
                                <Badge key={u.id} variant="secondary" className="text-xs font-normal">
                                  {u.username}
                                </Badge>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <CanChange type="group">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setEditGroup(g)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </CanChange>
                            <CanDelete type="group">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeleteTarget({ type: "group", id: g.id, name: g.name })}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </CanDelete>
                          </div>
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

      {/* User edit/create dialog */}
      {editUser !== null && can(editUser === "new" ? "create" : "change", "user") && (
        <UserDialog
          user={editUser === "new" ? null : editUser}
          groups={groups}
          onClose={() => setEditUser(null)}
          onSave={(saved) => {
            setUsers((prev) => {
              const idx = prev.findIndex((u) => u.id === saved.id)
              return idx >= 0 ? prev.map((u) => (u.id === saved.id ? saved : u)) : [...prev, saved]
            })
            setEditUser(null)
          }}
        />
      )}

      {/* Group edit/create dialog */}
      {editGroup !== null && can(editGroup === "new" ? "create" : "change", "group") && (
        <GroupDialog
          group={editGroup === "new" ? null : editGroup}
          onClose={() => setEditGroup(null)}
          onSave={(saved) => {
            setGroups((prev) => {
              const idx = prev.findIndex((g) => g.id === saved.id)
              return idx >= 0 ? prev.map((g) => (g.id === saved.id ? saved : g)) : [...prev, saved]
            })
            setEditGroup(null)
          }}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog
        open={Boolean(
          deleteTarget &&
          can("delete", deleteTarget.type === "user" ? "user" : "group")
        )}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type === "user" ? "user" : "group"} &quot;{deleteTarget?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
