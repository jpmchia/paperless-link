import { AppShell } from "@/components/app-shell"
import { getProfile } from "@/lib/api"
import { notFound } from "next/navigation"
import { ProfileForm } from "./profile-form"

export default async function ProfilePage() {
  const profile = await getProfile()

  if (!profile) {
    notFound()
  }

  return (
    <AppShell>
      <div className="p-6 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold">My Profile</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your account details and password.
          </p>
        </div>
        <ProfileForm profile={profile as any} />
      </div>
    </AppShell>
  )
}
