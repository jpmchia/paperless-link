"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProfileForm, type ProfileFormProps } from "./profile-form"
import {
  PreferencesForm,
  type PreferencesFormProps,
} from "./preferences-form"
import { User, Lock, Settings } from "lucide-react"

interface ProfileTabsProps {
  profile: ProfileFormProps["profile"]
  uiSettings: PreferencesFormProps["initialSettings"]
}

export function ProfileTabs({ profile, uiSettings }: ProfileTabsProps) {
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
          <TabsTrigger value="preferences" className="gap-1.5 px-3">
            <Settings className="h-3.5 w-3.5" />Preferences
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="profile" className="m-0">
        <ProfileForm profile={profile} showPasswordSection={false} />
      </TabsContent>

      <TabsContent value="security" className="m-0">
        <ProfileForm profile={profile} showPasswordSection showProfileSection={false} />
      </TabsContent>

      <TabsContent value="preferences" className="m-0">
        <PreferencesForm initialSettings={uiSettings} />
      </TabsContent>
    </Tabs>
  )
}
