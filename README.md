# Barber-Shop

ระบบจัดการร้านตัดผมและจองคิวออนไลน์ รองรับลูกค้าและผู้ดูแลร้าน

## Technology stack

- Frontend: HTML, CSS, Vanilla JavaScript (Supabase JS client)
- Backend: Node.js 26+, Express 5
- Database and Authentication: Supabase PostgreSQL + Supabase Auth
- Primary language: JavaScript (ES modules)

## Supabase project

- Project URL: https://yeqjngqfwtucppvqqiqc.supabase.co
- Region: Singapore
- Project ref: yeqjngqfwtucppvqqiqc

## Requirements

- Node.js 26+
- npm
- Access to the Barber-Shop Supabase project

## Local setup

1. Clone this repository.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy the environment template:

   ```bash
   cp .env.example .env
   ```

   On Windows PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

4. Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` in `.env`.
5. Start the development server:

   ```bash
   npm run dev
   ```

6. Open http://localhost:3000.

## Customer features

- View active services and prices.
- Register and sign in with email/password using Supabase Auth.
- Email confirmation is required when enabled in Supabase Auth settings.
- Choose one or more services, an optional barber, and a date/time in Asia/Bangkok.
- Create a booking and view the signed-in customer's booking history.

The database booking function validates that the appointment is in the future, within configured business hours, uses active services, and does not overlap an active booking for the selected barber. When no barber is selected, the database chooses an available active barber. At least one active barber profile must exist before a booking can succeed; the current project has no barber profiles yet.

## Admin features

The admin section is visible only to a signed-in profile whose database role is `admin`.

- View recent appointments and update their status.
- Add services and activate/deactivate existing services.
- Create barber records linked to existing user profiles, and activate/deactivate barber profiles.
- Configure opening and closing times for each weekday.
- Enforce a controlled appointment status transition workflow.
- Protected admin endpoints enforce the role on the server and rely on database RLS policies.

## API routes

- `GET /api/health` — application health check
- `GET /api/config` — public Supabase URL and publishable key only
- `GET /api/services` — active services
- `GET /api/barbers` — active barbers
- `GET /api/business-hours` — public opening hours
- `GET /api/me` — signed-in user's profile
- `GET /api/appointments` — signed-in user's bookings
- `POST /api/appointments` — create a booking
- `/api/admin/*` — role-protected appointment, service, and barber management

Booking request example:

```json
{
  "serviceIds": ["SERVICE_UUID"],
  "startsAt": "2026-11-23T10:00:00+07:00",
  "barberId": null,
  "customerNote": "ตัดผมทรง Two Block"
}
```

For protected routes, send:

```
Authorization: Bearer <SUPABASE_ACCESS_TOKEN>
```

## First administrator

1. Register a user through the website or create one in Supabase Dashboard → Authentication → Users.
2. If email confirmation is enabled, confirm the email before signing in.
3. Confirm that the Auth user has a corresponding row in `public.profiles` (created by the database trigger).
4. In the Supabase SQL Editor, promote only that verified user:

   ```sql
   update public.profiles
   set role = 'admin'
   where id = (
     select id
     from auth.users
     where email = lower('YOUR_ADMIN_EMAIL')
   );
   ```

5. Confirm that exactly one intended profile was updated, then sign out and sign back in to refresh the profile state.

Never let a public signup request set `profiles.role`. The application does not expose a self-promotion endpoint.

## Supabase Data API and security

- The project uses Row Level Security. Keep RLS enabled.
- The server uses the publishable key and forwards each signed-in user's access token so database RLS remains in effect.
- Never expose a Supabase secret/service-role key in browser code or commit credentials.
- The public booking RPC is a `SECURITY INVOKER` wrapper executable by `authenticated` only. It delegates the validated multi-table booking transaction to `private.create_appointment`, a non-exposed `SECURITY DEFINER` function that requires `auth.uid()`. Anonymous and PUBLIC execution are revoked. The Supabase Security Advisor returned no security lints after this change.
- Admin appointment status updates are restricted by an RLS policy using `private.is_admin()`.
- Use HTTPS in production.
- The default rate-limit store is in-memory. Configure a shared store before running multiple application instances.

## Container build

Build and run the application with Docker:

```bash
docker build -t barber-shop .
docker run --rm -p 3000:3000 --env-file .env barber-shop
```

The image runs as the unprivileged `node` user and includes an HTTP health check. Do not bake `.env` into the image.

## Supabase Auth configuration

In Supabase Dashboard → Authentication → URL Configuration:

- Set the Site URL to the final application origin.
- Add the local development origin (for example `http://localhost:3000`) and the deployed origin to Redirect URLs.
- Configure SMTP/email delivery before enabling public registration for real customers.
- Test email confirmation and password reset links against the configured origins.

## CI

GitHub Actions runs the Node.js 26 unit test suite and JavaScript syntax checks on pushes and pull requests to `main`.

## Current implementation status

Implemented: database schema and RLS, hardened booking RPC, customer authentication UI, service catalogue, barber selection, booking creation/history, protected admin APIs, admin service/barber management, opening-hours management, appointment status workflow, unit tests, CI workflow, and Docker image.

Not yet implemented: payment processing, customer self-service cancellation/rescheduling, customer reviews UI, advanced availability calendar/slot preview, end-to-end browser/API tests, committed npm lockfile, SMTP setup, and production deployment.

Before production use, install dependencies, run the application locally, configure Supabase Auth redirect URLs and email delivery, and complete browser/API tests with real customer and administrator accounts.
