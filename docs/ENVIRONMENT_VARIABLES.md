# Environment Variables

Last updated: 2026-07-05

## Required

- `DATABASE_URL`: PostgreSQL connection string for runtime queries. With Supabase, use the pooled connection string (port `6543`) and append `?pgbouncer=true`.
- `DIRECT_URL`: Direct PostgreSQL connection string for Prisma CLI commands (`migrate`, `db push`, Studio). With Supabase, use the direct connection (port `5432`). Required for reliable migrations when `DATABASE_URL` points at the transaction pooler.
- `BETTER_AUTH_SECRET`: Long random secret for Better Auth.
- `BETTER_AUTH_URL`: Public app origin used by Better Auth.
- `NEXT_PUBLIC_APP_URL`: Public app origin available to browser code.
- `CRON_SECRET`: Shared secret required by cron endpoints.
- `STORAGE_PROVIDER`: `LOCAL` for local disk or `R2` for Cloudflare R2.

## Optional

- `RESEND_API_KEY`: Future email integration.
- `WHATSAPP_CLOUD_API_TOKEN`: Future official WhatsApp Business API integration.
- `MASTER_ADMIN_EMAIL`: Used by `scripts/bootstrap-master-admin.mjs`.
- `MASTER_ADMIN_PASSWORD`: Used by `scripts/bootstrap-master-admin.mjs`.

## Cloudflare R2

Required only when `STORAGE_PROVIDER=R2`:

- `CLOUDFLARE_R2_ACCOUNT_ID`
- `CLOUDFLARE_R2_ACCESS_KEY_ID`
- `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
- `CLOUDFLARE_R2_BUCKET`
- `CLOUDFLARE_R2_PUBLIC_URL`

## Security Notes

- Never commit real secrets or live database credentials.
- Rotate any value that was previously exposed in `.env.example`.
- Production must provide `BETTER_AUTH_SECRET`; do not rely on development fallbacks.
- Prefer private or signed file access for production client files.
