import { getServerSession } from "next-auth"
import { authOptions } from "@/auth"
import { getUiSettings } from "@/lib/api"
import {
  emptyPermissions,
  mapPermissionBootstrapPayload,
  type CurrentUserPermissions,
  type PermissionBootstrapPayload,
} from "@/lib/permissions"

type SessionUser = {
  name?: string | null
}

type SessionLike = {
  user?: SessionUser | null
}

export type DataroomActor = {
  actorId: string
  actorName: string
  permissions: CurrentUserPermissions
}

export async function requireDataroomActor(): Promise<DataroomActor | null> {
  const session = (await getServerSession(authOptions)) as SessionLike | null
  if (!session) return null

  const uiSettings = await getUiSettings().catch(() => null)
  const permissions = mapPermissionBootstrapPayload(
    (uiSettings as PermissionBootstrapPayload | null) ?? null
  )
  const actorId =
    permissions.userId != null ? String(permissions.userId) : null
  if (!actorId) return null

  return {
    actorId,
    actorName: (session.user?.name || "").trim() || actorId,
    permissions: permissions ?? emptyPermissions,
  }
}
