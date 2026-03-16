"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form"
import { Separator } from "@/components/ui/separator"
import { updateProfile } from "./actions"

interface ProfileFormProps {
  profile: {
    id: number
    username: string
    email?: string
    first_name?: string
    last_name?: string
    has_usable_password?: boolean
  }
  showProfileSection?: boolean
  showPasswordSection?: boolean
}

const profileSchema = z.object({
  first_name: z.string().max(150),
  last_name: z.string().max(150),
  email: z.string().email("Invalid email address").or(z.literal("")),
})

const passwordSchema = z
  .object({
    current_password: z.string().min(1, "Current password is required"),
    new_password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string(),
  })
  .refine((d) => d.new_password === d.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  })

export function ProfileForm({ profile, showProfileSection = true, showPasswordSection = true }: ProfileFormProps) {
  const [savingProfile, setSavingProfile] = React.useState(false)
  const [savingPassword, setSavingPassword] = React.useState(false)

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: profile.first_name ?? "",
      last_name: profile.last_name ?? "",
      email: profile.email ?? "",
    },
  })

  const passwordForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
  })

  async function onSaveProfile(values: z.infer<typeof profileSchema>) {
    setSavingProfile(true)
    try {
      await updateProfile(values)
      profileForm.reset(values)
      toast.success("Profile updated")
    } catch (e: any) {
      toast.error("Failed to update profile", { description: e.message })
    } finally {
      setSavingProfile(false)
    }
  }

  async function onChangePassword(values: z.infer<typeof passwordSchema>) {
    setSavingPassword(true)
    try {
      await updateProfile({
        password: values.new_password,
        current_password: values.current_password,
      })
      passwordForm.reset()
      toast.success("Password changed successfully")
    } catch (e: any) {
      toast.error("Failed to change password", { description: e.message })
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="space-y-10 max-w-lg">
      {showProfileSection && (
        <>
          {/* Profile info */}
          <div>
            <h3 className="text-lg font-medium">Profile</h3>
            <p className="text-sm text-muted-foreground">Update your display name and email address.</p>
          </div>

          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-5">
              <div className="space-y-1.5">
                <FormLabel className="text-sm">Username</FormLabel>
                <Input value={profile.username} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">Username cannot be changed here.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={profileForm.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First name</FormLabel>
                      <FormControl>
                        <Input placeholder="First name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last name</FormLabel>
                      <FormControl>
                        <Input placeholder="Last name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={profileForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <Button type="submit" disabled={savingProfile || !profileForm.formState.isDirty}>
                  {savingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save profile
                </Button>
              </div>
            </form>
          </Form>
        </>
      )}

      {showPasswordSection && profile.has_usable_password && (
        <>
          <Separator />

          <div>
            <h3 className="text-lg font-medium">Change password</h3>
            <p className="text-sm text-muted-foreground">Update your account password.</p>
          </div>

          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="space-y-5">
              <FormField
                control={passwordForm.control}
                name="current_password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="new_password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormDescription>Minimum 8 characters.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="confirm_password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm new password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={savingPassword}>
                  {savingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Change password
                </Button>
              </div>
            </form>
          </Form>
        </>
      )}
    </div>
  )
}
