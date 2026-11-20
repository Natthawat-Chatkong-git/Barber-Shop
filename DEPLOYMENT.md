# Deployment preparation

This repository is containerized and can be deployed to any host that runs Docker. This guide stops before creating a paid hosting resource or exposing a public production URL.

## 1. Required environment variables

Configure these in the hosting provider's secret/environment settings:

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | Yes | Existing Barber-Shop Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase publishable key; safe for browser use |
| `PORT` | Host-dependent | Port provided by the container platform; defaults to 3000 |
| `NODE_ENV` | Yes | Set to `production` |
| `TRUST_PROXY_HOPS` | If behind proxy | Exact number of trusted reverse proxies; usually 1 |

Do not configure or expose a Supabase service-role/secret key. The application uses the publishable key with each user's access token so that RLS remains effective.

## 2. Supabase Auth

Before accepting real customers:

1. Set the Supabase Site URL to the final HTTPS application origin.
2. Add the local development origin and production origin to Redirect URLs.
3. Configure production SMTP/email delivery and test confirmation emails.
4. Test sign-up, email confirmation, sign-in, sign-out, and password reset.
5. Create the first Auth user and promote its profile to `admin` using the reviewed bootstrap SQL in the README.
6. Create at least one staff Auth user, then add that user as a barber from the Admin dashboard.

The existing hosted project already has the database schema and migrations applied. Do not point a new Supabase project at this app until the complete baseline migration history has been exported and reviewed; the repository currently tracks the recent hardening migrations, not every original foundation migration.

## 3. Build and verify

Run from the repository root:

```bash
npm ci
npm test
docker build -t barber-shop:production .
```

The GitHub Actions workflow runs unit tests, JavaScript syntax checks, and a Docker image build. It also bootstraps and commits the initial npm lockfile so subsequent installs use `npm ci`.

## 4. Container runtime

Run the container with the environment configured by the host:

```bash
docker run --rm \
  -e NODE_ENV=production \
  -e PORT=3000 \
  -e TRUST_PROXY_HOPS=1 \
  -e SUPABASE_URL="$SUPABASE_URL" \
  -e SUPABASE_PUBLISHABLE_KEY="$SUPABASE_PUBLISHABLE_KEY" \
  -p 3000:3000 \
  barber-shop:production
```

The image runs as the unprivileged `node` user and exposes an HTTP health check at `/api/health`. Terminate TLS at the hosting provider's trusted ingress. Set `TRUST_PROXY_HOPS` to match the actual proxy topology; do not blindly trust arbitrary forwarded headers.

## 5. Pre-production acceptance tests

Complete these with real test accounts before enabling public traffic:

- Customer registration, email confirmation, login, logout, and session refresh.
- Public service, barber, and opening-hours catalogue.
- Available-slot calculation for each service combination and barber.
- Online booking with explicit barber and automatic barber assignment.
- Concurrent booking attempts for the same barber/time; only one should succeed.
- Walk-in booking as Admin, including guest name and optional phone.
- Customer booking history and cancellation of eligible future appointments.
- Admin appointment status transitions, service management, barber provisioning, and opening-hours edits.
- Review submission only after a completed online appointment; reject duplicate and non-owner reviews.
- RLS checks proving one customer cannot read or cancel another customer's appointment.
- Unauthenticated requests cannot access protected endpoints; non-admin users cannot call Admin endpoints.
- Confirm no secrets appear in browser bundles, container layers, logs, or Git history.
- Restore a database backup in a non-production environment and verify the application against it.

## 6. Operational requirements

Before public launch, configure database backups and verify restoration, central application logs, error monitoring, alerting, rate-limit storage suitable for multiple replicas, and a documented rollback procedure. Review the hosting provider's pricing and region before creating the production service.
