"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProfileForm } from "./profile-form"
import { User, Lock } from "lucide-react"
import type { ProfileData, SocialAccountProvider } from "./types"

interface ProfileTabsProps {
  profile: ProfileData
  socialAccountProviders: SocialAccountProvider[]
}

export function ProfileTabs({ profile, socialAccountProviders }: ProfileTabsProps) {
  return (
    <Tabs defaultValue="profile" className="w-full gap-6">
      <div className="overflow-x-auto">
        <TabsList variant="line" className="min-w-max justify-start border-b p-0">
          <TabsTrigger value="profile" className="gap-1.5 px-3">
            <User className="h-3.5 w-3.5" />Profile
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5 px-3">
            <Lock className="h-3.5 w-3.5" />Security
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="profile" className="m-0">
        <ProfileForm profile={profile} showPasswordSection={false} />
      </TabsContent>

      <TabsContent value="security" className="m-0">
        <ProfileForm
          profile={profile}
          socialAccountProviders={socialAccountProviders}
          showPasswordSection
          showProfileSection={false}
        />
      </TabsContent>
    </Tabs>
  )
}
