import type { NextApiRequest, NextApiResponse } from "next"

import {
  extractPaperlessSsoProviders,
  fetchPaperlessSsoConfig,
} from "@/lib/paperless-sso"

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET")
    res.status(405).json({ error: "Method not allowed." })
    return
  }

  const config = await fetchPaperlessSsoConfig()
  res.status(config.status ?? (config.ok ? 200 : 502)).json({
    isAvailable: config.ok,
    providers: extractPaperlessSsoProviders(config),
  })
}
