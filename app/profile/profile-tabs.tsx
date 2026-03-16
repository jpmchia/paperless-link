"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProfileForm } from "./profile-form"
import { PreferencesForm } from "./preferences-form"
import { User, Lock, Settings } from "lucide-react"

interface ProfileTabsProps {
  profile: any
  uiSettings: any
}

export function ProfileTabs({ profile, uiSettings }: ProfileTabsProps) {
  return (
    <Tabs defaultValue="profile" className="w-full">
      <TabsList className="mb-6">
        <TabsTrigger value="profile" className="gap-1.5">
          <User className="h-3.5 w-3.5" />Profile
        </TabsTrigger>
        <TabsTrigger value="security" className="gap-1.5">
          <Lock className="h-3.5 w-3.5" />Security
        </TabsTrigger>
        <TabsTrigger value="preferences" className="gap-1.5">
          <Settings className="h-3.5 w-3.5" />Preferences
        </TabsTrigger>
      </TabsList>

      <TabsContent value="profile">
        <ProfileForm profile={profile} showPasswordSection={false} />
      </TabsContent>

      <TabsContent value="security">
        <ProfileForm profile={profile} showPasswordSection showProfileSection={false} />
      </TabsContent>

      <TabsContent value="preferences">
        <PreferencesForm initialSettings={uiSettings} />
      </TabsContent>
    </Tabs>
  )
}
