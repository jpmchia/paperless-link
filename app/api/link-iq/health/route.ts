import { NextResponse } from "next/server"
import { requestLinkIQJson } from "@/lib/link-iq"

type HealthPayload = {
  service?: string
  status?: string
}

export async function GET() {
  try {
    const payload = await requestLinkIQJson<HealthPayload>("healthz")
    return NextResponse.json({
      ok: true,
      service: payload.service ?? "link-iq",
      status: payload.status ?? "ok",
      checked_at: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        service: "link-iq",
        status: "offline",
        error:
          error instanceof Error ? error.message : "Failed to connect to link-iq",
        checked_at: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}
