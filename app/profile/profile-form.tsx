"use client"

import * as React from "react"
import Image from "next/image"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Check,
  Copy,
  ExternalLink,
  KeyRound,
  Loader2,
  Shield,
  ShieldCheck,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  activateTotp,
  deactivateTotp,
  disconnectSocialAccount,
  generateAuthToken,
  getTotpSettings,
  updateProfile,
} from "./actions"
import type { ProfileData, SocialAccount, SocialAccountProvider, TotpSettings } from "./types"

export interface ProfileFormProps {
  profile: ProfileData
  socialAccountProviders?: SocialAccountProvider[]
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
  .refine((data) => data.new_password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  })

type ProfileValues = z.infer<typeof profileSchema>
type PasswordValues = z.infer<typeof passwordSchema>

function RecoveryCodes({ codes }: { codes: string[] }) {
  const rows = React.useMemo(() => {
    const pairs: Array<[string, string | null]> = []
    for (let index = 0; index < codes.length; index += 2) {
      pairs.push([codes[index], codes[index + 1] ?? null])
    }
    return pairs
  }, [codes])

  return (
    <div className="grid gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
      <div className="text-xs font-medium text-amber-200">Recovery codes</div>
      <p className="text-xs text-muted-foreground">These codes will not be shown again. Store them somewhere safe.</p>
      <div className="grid gap-2 md:grid-cols-2">
        {rows.map(([left, right]) => (
          <div key={left} className="grid grid-cols-2 gap-2 rounded-md bg-background/80 p-2">
            <code className="text-[0.7rem]">{left}</code>
            {right ? <code className="text-[0.7rem]">{right}</code> : <span />}
          </div>
        ))}
      </div>
    </div>
  )
}

export function ProfileForm({
  profile,
  socialAccountProviders = [],
  showProfileSection = true,
  showPasswordSection = true,
}: ProfileFormProps) {
  const [savingProfile, setSavingProfile] = React.useState(false)
  const [savingPassword, setSavingPassword] = React.useState(false)
  const [tokenValue, setTokenValue] = React.useState(profile.auth_token ?? "")
  const [copyTokenState, setCopyTokenState] = React.useState<"idle" | "done">("idle")
  const [socialAccounts, setSocialAccounts] = React.useState<SocialAccount[]>(profile.social_accounts ?? [])
  const [disconnectingAccountId, setDisconnectingAccountId] = React.useState<number | null>(null)
  const [totpEnabled, setTotpEnabled] = React.useState(Boolean(profile.is_mfa_enabled))
  const [totpSettings, setTotpSettings] = React.useState<TotpSettings | null>(null)
  const [totpCode, setTotpCode] = React.useState("")
  const [totpLoading, setTotpLoading] = React.useState(false)
  const [totpActivationLoading, setTotpActivationLoading] = React.useState(false)
  const [totpDeactivationLoading, setTotpDeactivationLoading] = React.useState(false)
  const [recoveryCodes, setRecoveryCodes] = React.useState<string[]>([])
  const [copyCodesState, setCopyCodesState] = React.useState<"idle" | "done">("idle")

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: profile.first_name ?? "",
      last_name: profile.last_name ?? "",
      email: profile.email ?? "",
    },
  })

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      current_password: "",
      new_password: "",
      confirm_password: "",
    },
  })

  async function copyText(text: string, successMessage: string, setCopied: (state: "idle" | "done") => void) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied("done")
      toast.success(successMessage)
      window.setTimeout(() => setCopied("idle"), 2500)
    } catch (error) {
      toast.error("Copy failed", {
        description: error instanceof Error ? error.message : "Unable to write to clipboard",
      })
    }
  }

  async function onSaveProfile(values: ProfileValues) {
    setSavingProfile(true)
    try {
      await updateProfile(values)
      profileForm.reset(values)
      toast.success("Profile updated")
    } catch (error: unknown) {
      toast.error("Failed to update profile", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setSavingProfile(false)
    }
  }

  async function onChangePassword(values: PasswordValues) {
    setSavingPassword(true)
    try {
      await updateProfile({
        password: values.new_password,
        current_password: values.current_password,
      })
      passwordForm.reset()
      toast.success("Password changed successfully")
    } catch (error: unknown) {
      toast.error("Failed to change password", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setSavingPassword(false)
    }
  }

  async function handleGenerateToken() {
    try {
      const token = await generateAuthToken()
      setTokenValue(token)
      toast.success("API token regenerated")
    } catch (error: unknown) {
      toast.error("Failed to generate API token", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  async function handleDisconnectSocialAccount(id: number) {
    setDisconnectingAccountId(id)
    try {
      const removedId = await disconnectSocialAccount(id)
      setSocialAccounts((current) => current.filter((account) => account.id !== removedId))
      toast.success("Social account disconnected")
    } catch (error: unknown) {
      toast.error("Failed to disconnect social account", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setDisconnectingAccountId(null)
    }
  }

  async function handleLoadTotpSettings() {
    if (totpSettings || totpLoading || totpEnabled) {
      return
    }

    setTotpLoading(true)
    try {
      const settings = await getTotpSettings()
      setTotpSettings(settings)
    } catch (error: unknown) {
      toast.error("Failed to load two-factor setup", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setTotpLoading(false)
    }
  }

  async function handleActivateTotp() {
    if (!totpSettings?.secret || !totpCode.trim()) {
      toast.error("Enter the authenticator code first")
      return
    }

    setTotpActivationLoading(true)
    try {
      const result = await activateTotp(totpSettings.secret, totpCode.trim())
      setRecoveryCodes(result.recovery_codes ?? [])
      setTotpEnabled(Boolean(result.success))
      setTotpCode("")
      setTotpSettings(null)
      toast.success("Two-factor authentication enabled")
    } catch (error: unknown) {
      toast.error("Failed to enable two-factor authentication", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setTotpActivationLoading(false)
    }
  }

  async function handleDeactivateTotp() {
    setTotpDeactivationLoading(true)
    try {
      await deactivateTotp()
      setTotpEnabled(false)
      setTotpSettings(null)
      setTotpCode("")
      setRecoveryCodes([])
      toast.success("Two-factor authentication disabled")
    } catch (error: unknown) {
      toast.error("Failed to disable two-factor authentication", {
        description: error instanceof Error ? error.message : "Unknown error",
      })
    } finally {
      setTotpDeactivationLoading(false)
    }
  }

  return (
    <div className="grid max-w-4xl gap-8">
      {showProfileSection && (
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Update your display name and email address.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="grid gap-5">
                <div className="space-y-1.5">
                  <FormLabel className="text-sm">Username</FormLabel>
                  <Input value={profile.username} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground">Username cannot be changed here.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
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
          </CardContent>
        </Card>
      )}

      {showPasswordSection && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <div className="grid gap-6">
            {profile.has_usable_password ? (
              <Card>
                <CardHeader>
                  <CardTitle>Password</CardTitle>
                  <CardDescription>Update your account password.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...passwordForm}>
                    <form onSubmit={passwordForm.handleSubmit(onChangePassword)} className="grid gap-5">
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
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Password</CardTitle>
                  <CardDescription>This account signs in through an external identity provider.</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  A local password is not currently usable for this account.
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4" />
                  API auth token
                </CardTitle>
                <CardDescription>Use this token for API clients and integrations.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input value={tokenValue} readOnly placeholder="No API token generated yet" className="font-mono text-xs" />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!tokenValue}
                      onClick={() => copyText(tokenValue, "API token copied", setCopyTokenState)}
                    >
                      {copyTokenState === "done" ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                      Copy
                    </Button>
                    <Button type="button" onClick={handleGenerateToken}>
                      Regenerate
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Warning: regenerating the token invalidates the previous one immediately.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {totpEnabled ? <ShieldCheck className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                  Two-factor authentication
                  <Badge variant={totpEnabled ? "default" : "outline"}>{totpEnabled ? "Enabled" : "Disabled"}</Badge>
                </CardTitle>
                <CardDescription>Add an authenticator app as a second sign-in factor.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {recoveryCodes.length > 0 && (
                  <div className="grid gap-3">
                    <RecoveryCodes codes={recoveryCodes} />
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => copyText(recoveryCodes.join("\n"), "Recovery codes copied", setCopyCodesState)}
                      >
                        {copyCodesState === "done" ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                        Copy recovery codes
                      </Button>
                    </div>
                  </div>
                )}

                {!totpEnabled ? (
                  <>
                    {!totpSettings ? (
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm text-muted-foreground">No authenticator app is connected yet.</p>
                        <Button type="button" variant="outline" onClick={handleLoadTotpSettings} disabled={totpLoading}>
                          {totpLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Set up TOTP
                        </Button>
                      </div>
                    ) : (
                      <div className="grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)]">
                        <div className="rounded-md border bg-white p-3">
                          <Image
                            src={`data:image/svg+xml;utf8,${encodeURIComponent(totpSettings.qr_svg)}`}
                            alt="Authenticator QR code"
                            className="h-48 w-48"
                            width={192}
                            height={192}
                            unoptimized
                          />
                        </div>
                        <div className="grid gap-4">
                          <div className="grid gap-2">
                            <div className="text-sm font-medium">Authenticator secret</div>
                            <code className="rounded-md border bg-muted px-3 py-2 text-xs">{totpSettings.secret}</code>
                            <p className="text-xs text-muted-foreground">
                              Scan the QR code with your authenticator app, then enter the generated code below.
                            </p>
                          </div>
                          <div className="grid gap-2 sm:max-w-xs">
                            <label htmlFor="totp-code" className="text-sm font-medium">
                              Verification code
                            </label>
                            <Input
                              id="totp-code"
                              value={totpCode}
                              onChange={(event) => setTotpCode(event.target.value)}
                              placeholder="123456"
                              inputMode="numeric"
                              autoComplete="one-time-code"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button type="button" onClick={handleActivateTotp} disabled={totpActivationLoading || !totpCode.trim()}>
                              {totpActivationLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Enable
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setTotpSettings(null)
                                setTotpCode("")
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">An authenticator app is currently required for sign-in.</p>
                    <Button type="button" variant="destructive" onClick={handleDeactivateTotp} disabled={totpDeactivationLoading}>
                      {totpDeactivationLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Disable
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Connected social accounts</CardTitle>
                <CardDescription>Identity providers currently linked to this account.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4">
                {socialAccounts.length > 0 ? (
                  <div className="grid gap-2">
                    {socialAccounts.map((account) => (
                      <div
                        key={account.id}
                        className="flex items-center justify-between gap-3 rounded-md border border-border/70 bg-muted/20 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{account.name}</div>
                          <div className="text-xs text-muted-foreground">{account.provider}</div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!profile.has_usable_password || disconnectingAccountId === account.id}
                          onClick={() => handleDisconnectSocialAccount(account.id)}
                        >
                          {disconnectingAccountId === account.id ? (
                            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                          )}
                          Disconnect
                        </Button>
                      </div>
                    ))}
                    {!profile.has_usable_password && (
                      <p className="text-xs text-muted-foreground">
                        Set a usable local password before disconnecting the last social sign-in method.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No social accounts are currently connected.</p>
                )}

                <Separator />

                <div className="grid gap-2">
                  <div className="text-sm font-medium">Connect another provider</div>
                  {socialAccountProviders.length > 0 ? (
                    <div className="grid gap-2">
                      {socialAccountProviders.map((provider) => (
                        <a
                          key={provider.name}
                          href={provider.login_url}
                          className="flex items-center justify-between rounded-md border border-border/70 bg-background px-3 py-2 text-sm transition-colors hover:bg-muted/40"
                        >
                          <span>{provider.name}</span>
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No social account providers are configured.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
