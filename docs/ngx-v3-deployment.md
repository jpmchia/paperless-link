# Paperless-Link deployment notes (P1 NGX v3 parity)

## API version

- Default Accept header is `application/json; version=10`.
- Override with `PAPERLESS_API_VERSION=9` only when required.
- Do not restore API v2.

## Authentication

- Prefer per-user NextAuth session tokens for Paperless API calls.
- `PAPERLESS_API_TOKEN` remains an optional service-account fallback.
- Credentials login continues to use `POST /api/token/`.
- SSO uses NGX allauth headless under `/api/auth/headless/app/v1/` and stores `meta.access_token` in the encrypted NextAuth JWT.

## Same-origin SSO reverse proxy

Link and NGX must be on the same public origin under different paths so browser cookies are shared with Link callback routes.

Required env:

- `NEXTAUTH_URL` — public Link origin
- `NEXTAUTH_SECRET`
- `PAPERLESS_PUBLIC_URL` — public NGX base (for redirects/share URLs)
- `PAPERLESS_INTERNAL_URL` — optional internal base for server-to-server calls
- `PAPERLESS_API_URL` — fallback Paperless API base

Proxy requirements:

- HTTPS in production
- NGX session/CSRF cookies must not be path-scoped away from Link’s `/api/auth/paperless-sso/*` callback paths
- Configure NGX trusted origins / CSRF for the shared public host

SSO handlers:

- `POST /api/auth/paperless-sso/start`
- `GET /api/auth/paperless-sso/callback`
- `POST /api/auth/paperless-sso/signup`
- `GET /api/auth/paperless-sso/config`
- `GET /api/auth/paperless-sso/session`

Logout clears the Link session only; it does not revoke the Paperless DRF token.

## Advanced AI settings

Paperless-Link exposes the embedding endpoint and chunk size, LLM context size,
output language, and request timeout from the Paperless-ngx v3 configuration
API. Chunk size, context size, and timeout must be positive whole numbers.

After changing the embedding backend, model, endpoint, or chunk size, restart
the Paperless-ngx webserver and task workers, then reindex the document corpus
so existing embeddings use the new configuration. Changes to the context size,
output language, or request timeout require a webserver and worker restart but
do not require reindexing.
