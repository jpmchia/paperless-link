import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/auth"
import { getUiSettings } from "@/lib/api"
import {
  mapPermissionBootstrapPayload,
  type CurrentUserPermissions,
  type PermissionBootstrapPayload,
} from "@/lib/permissions"
import {
  isRouteAllowed,
  routePermissionRequirements,
  type RoutePermissionKey,
} from "@/lib/route-permissions"

export async function requireRoutePermission(
  route: RoutePermissionKey
): Promise<CurrentUserPermissions> {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect("/login")
  }

  const uiSettings = await getUiSettings().catch(() => null)
  const permissions = mapPermissionBootstrapPayload(
    uiSettings as PermissionBootstrapPayload | null
  )

  if (!isRouteAllowed(permissions, routePermissionRequirements[route])) {
    redirect(`/unauthorized?from=${encodeURIComponent(route)}`)
  }

  return permissions
}
