import type { GetServerSideProps, InferGetServerSidePropsType } from "next"
import Head from "next/head"
import { getServerSession } from "next-auth/next"

import { authOptions } from "@/auth"
import { LoginForm } from "@/components/login-form"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type LoginPageProps = {
  callbackUrl: string
  errorMessage: string | null
  paperlessHost: string | null
}

function normalizeCallbackUrl(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value

  if (!candidate || !candidate.startsWith("/") || candidate === "/") {
    return "/dashboard"
  }

  return candidate
}

function resolveErrorMessage(error: string | string[] | undefined) {
  const code = Array.isArray(error) ? error[0] : error

  switch (code) {
    case "CredentialsSignin":
    case "credentials":
      return "Invalid username or password."
    case "SessionRequired":
      return "Sign in to continue."
    case "AccessDenied":
      return "Access denied."
    default:
      return code ? "Unable to complete sign in." : null
  }
}

export const getServerSideProps: GetServerSideProps<LoginPageProps> = async (
  context
) => {
  const session = await getServerSession(context.req, context.res, authOptions)
  const callbackUrl = normalizeCallbackUrl(context.query.callbackUrl)

  if (session) {
    return {
      redirect: {
        destination: callbackUrl,
        permanent: false,
      },
    }
  }

  let paperlessHost: string | null = null
  try {
    const paperlessUrl = process.env.PAPERLESS_API_URL
    paperlessHost = paperlessUrl ? new URL(paperlessUrl).host : null
  } catch {
    paperlessHost = null
  }

  return {
    props: {
      callbackUrl,
      errorMessage: resolveErrorMessage(context.query.error),
      paperlessHost,
    },
  }
}

export default function LoginPage({
  callbackUrl,
  errorMessage,
  paperlessHost,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  return (
    <>
      <Head>
        <title>Sign In | Paperless Link</title>
      </Head>

      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(117,181,91,0.18),_transparent_34%),linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(244,247,243,1))] p-4 dark:bg-[radial-gradient(circle_at_top,_rgba(84,133,65,0.28),_transparent_28%),linear-gradient(180deg,_rgba(20,24,20,1),_rgba(14,18,14,1))]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="grid w-full max-w-4xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="hidden rounded-3xl border border-border/60 bg-background/70 p-8 shadow-sm backdrop-blur lg:flex lg:flex-col lg:justify-between">
            <div className="space-y-5">
              <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-[0.7rem] font-medium uppercase tracking-[0.22em] text-primary">
                Paperless Link
              </div>
              <div className="space-y-3">
                <h1 className="max-w-md text-4xl font-semibold tracking-tight text-foreground">
                  Sign in to your document workspace.
                </h1>
                <p className="max-w-lg text-sm leading-6 text-muted-foreground">
                  Link stays aligned with your Paperless repository while adding
                  richer context, review workflows, and intelligence services on
                  top.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                <div className="text-[0.7rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  Repository
                </div>
                <div className="mt-2 text-sm font-medium text-foreground">
                  {paperlessHost ?? "Configured Paperless instance"}
                </div>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                <div className="text-[0.7rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  Auth
                </div>
                <div className="mt-2 text-sm font-medium text-foreground">
                  Credentials via Paperless-ngx
                </div>
              </div>
            </div>
          </section>

          <section className="flex items-center">
            <Card className="w-full border-border/70 bg-background/92 py-0 shadow-xl shadow-primary/5 backdrop-blur">
              <CardHeader className="border-b border-border/60 py-5">
                <CardTitle className="text-2xl font-semibold tracking-tight">
                  Login
                </CardTitle>
                <CardDescription>
                  Enter your credentials to access Paperless Link.
                </CardDescription>
              </CardHeader>

              <LoginForm callbackUrl={callbackUrl} errorMessage={errorMessage} />
            </Card>
          </section>
        </div>
      </main>
    </>
  )
}
