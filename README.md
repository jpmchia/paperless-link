# Paperless Link

Paperless Link is a Next.js front-end for [Paperless-ngx](https://github.com/paperless-ngx/paperless-ngx). It uses the Paperless API for authentication, document operations, configuration, workflows, mail rules, and the wider management/admin surface.

This repository is the Link application only. It does not bundle Paperless-ngx itself. For self-hosting, you point Link at an existing Paperless-ngx instance.

## Requirements

- Node.js 22+
- pnpm 10+
- A reachable Paperless-ngx instance

## Environment

Copy [`.env.example`](/home/jpmchia/src/Paperless/paperless-link/.env.example) to `.env.local` for local development, or to `.env.production` for Docker deployment.

Required variables:

- `PAPERLESS_API_URL`
  - Base URL for your Paperless-ngx server
  - Must include the trailing slash
  - Example: `https://paperless.example.com/`
- `NEXTAUTH_SECRET`
  - Random secret used to sign NextAuth cookies
- `NEXTAUTH_URL`
  - Public URL of the Link app
  - Example: `https://link.example.com`

Optional variables:

- `NEXT_PUBLIC_PAPERLESS_WS_URL`
  - Optional websocket endpoint for Paperless realtime features
  - Example: `wss://paperless.example.com/ws/status/`
  - If omitted, Link still works; realtime status just stays unavailable
- `ANALYZE`
  - Set to `true` to enable bundle analysis during build

Important:

- `PAPERLESS_API_URL` should usually target the Paperless root, not `/api/`
- `PAPERLESS_API_URL` must end with `/`
- `NEXTAUTH_URL` must match the real external URL you use in the browser

## Local Development

Install dependencies:

```bash
pnpm install
```

Create a local env file:

```bash
cp .env.example .env.local
```

Run development mode:

```bash
pnpm dev
```

The app runs on `http://localhost:3333`.

## Production Build

Build:

```bash
pnpm build
```

Start:

```bash
pnpm start --hostname 0.0.0.0 --port 3000
```

Health endpoint:

```text
/healthz
```

## Docker

Build the image:

```bash
docker build -t paperless-link .
```

Run it:

```bash
docker run --rm \
  --name paperless-link \
  -p 3333:3000 \
  --env-file .env.production \
  paperless-link
```

The container listens on port `3000`. The example above publishes it as `3333` on the host.

## Docker Compose

1. Copy the example env file:

```bash
cp .env.example .env.production
```

2. Edit `.env.production`

3. Start the stack:

```bash
docker compose up -d --build
```

4. Open:

```text
http://localhost:3333
```

The included compose file runs only the Link app. If your Paperless-ngx instance is in another stack, make sure:

- the Link container can resolve and reach it
- `PAPERLESS_API_URL` points to the reachable Paperless base URL
- if needed, both stacks share a Docker network

Example when Paperless is another container on the same Docker network:

```env
PAPERLESS_API_URL=http://paperless-webserver:8000/
```

## Self-Hosting Notes

- Link authenticates users against Paperless by calling `POST /api/token/`
- Most application actions then run against the Paperless API using that user token
- Configuration writes are executed server-side, so you do not need browser-side CSRF setup for Link itself

Recommended production setup:

- Put Link behind a reverse proxy such as Caddy, Nginx, or Traefik
- Terminate TLS at the proxy
- Set `NEXTAUTH_URL` to the final public HTTPS URL
- Keep `NEXTAUTH_SECRET` private and unique per deployment

## Useful Commands

```bash
pnpm dev
pnpm build
pnpm start
pnpm test
pnpm lint
pnpm typecheck
```
