"use client"

import * as React from "react"
import {
  ChevronsUpDown,
  LogOut,
  UserRound,
} from "lucide-react"
import Link from "next/link"
import { useSession, signOut } from "next-auth/react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

type NavUserOverride = {
  name?: string
  email?: string
  image?: string
}

type NavUserProps = {
  overrideUser?: NavUserOverride
  onLogoutOverride?: () => void | Promise<void>
  hideProfileLink?: boolean
}

export function NavUser({
  overrideUser,
  onLogoutOverride,
  hideProfileLink = false,
}: NavUserProps = {}) {
  const { isMobile } = useSidebar()
  const { data: session, status } = useSession()
  const [hasMounted, setHasMounted] = React.useState(false)

  const user = overrideUser ?? session?.user

  React.useEffect(() => {
    setHasMounted(true)
  }, [])

  if (!hasMounted || status === "loading") {
    return null
  }

  if (!user) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton asChild size="lg">
            <Link href="/login">
              <UserRound className="size-4" />
              <span>Sign in</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    )
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              id="sidebar-nav-user-trigger"
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.image || ""} alt={user.name || "User"} />
                <AvatarFallback className="rounded-lg">{user.name?.slice(0, 2).toUpperCase() || "U"}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{user.name}</span>
                <span className="truncate text-xs">{user.email || 'user'}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.image || ""} alt={user.name || "User"} />
                  <AvatarFallback className="rounded-lg">{user.name?.slice(0, 2).toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{user.name}</span>
                  <span className="truncate text-xs">{user.email || 'user'}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              {hideProfileLink ? null : (
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <UserRound />
                    My Profile
                  </Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={() => {
                  if (onLogoutOverride) {
                    void onLogoutOverride()
                    return
                  }
                  void signOut()
                }}
              >
                <LogOut />
                Log out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
