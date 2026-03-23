import { AppShell } from "@/components/app-shell"
import { getProfile, getSocialAccountProviders } from "@/lib/api"
import { notFound } from "next/navigation"
import { ProfileTabs } from "./profile-tabs"
import type { ProfileData, SocialAccountProvider } from "./types"

export default async function ProfilePage() {
  const [profile, socialAccountProviders] = await Promise.all([
    getProfile<ProfileData>(),
    getSocialAccountProviders<SocialAccountProvider>(),
  ])

  if (!profile) {
    notFound()
  }

  return (
    <AppShell>
      <div className="max-w-5xl p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold">My Profile</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your account details, security settings, and connected sign-in methods.
          </p>
        </div>
        <ProfileTabs profile={profile} socialAccountProviders={socialAccountProviders} />
      </div>
    </AppShell>
  )
}
