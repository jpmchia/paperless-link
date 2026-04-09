/** @type {import('next').NextConfig} */
import withBundleAnalyzer from "@next/bundle-analyzer"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { env } from "./env.mjs"

const projectRoot = path.dirname(fileURLToPath(import.meta.url))

const config = {
  reactStrictMode: true,
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  turbopack: {
    root: projectRoot,
  },
  rewrites: async () => [
    { source: "/healthz", destination: "/api/health" },
    { source: "/api/healthz", destination: "/api/health" },
    { source: "/health", destination: "/api/health" },
    { source: "/ping", destination: "/api/health" },
  ],
}

export default env.ANALYZE
  ? withBundleAnalyzer({ enabled: env.ANALYZE })(config)
  : config
