# Barber-Shop

ระบบจัดการร้านตัดผมและจองคิว

## Technology stack

- Frontend: HTML, CSS, Vanilla JavaScript
- Backend: Node.js 26 LTS, Express 5
- Database and Auth: Supabase (PostgreSQL)
- Primary language: JavaScript (ES modules)

## Supabase project

- Project URL: https://yeqjngqfwtucppvqqiqc.supabase.co
- Region: Singapore
- Project ref: yeqjngqfwtucppvqqiqc

## Requirements

- Node.js 26 LTS
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

## API routes

- `GET /api/health` — application health check
- `GET /api/services` — active services
- `POST /api/appointments` — create a booking (requires a Supabase access token)

Booking request example:

```json
{
  "serviceIds": ["SERVICE_UUID"],
  "startsAt": "2026-11-23T10:00:00+07:00",
  "barberId": null,
  "customerNote": "ตัดผมทรง Two Block"
}
```

Set `barberId` to a barber UUID to select a barber, or `null` to let the database choose an available barber. The database function validates opening hours in Asia/Bangkok and prevents overlapping active bookings.

For protected routes, send:

```
Authorization: Bearer <SUPABASE_ACCESS_TOKEN>
```

## Supabase Data API

The project database uses Row Level Security. Ensure the required tables and the `create_appointment` function are exposed in Supabase **Integrations → Data API** before using the REST-backed client routes. Do not disable RLS to make an API request work.

## First administrator

1. Create the first user in Supabase Dashboard → Authentication → Users.
2. Confirm that the Auth user has a corresponding row in `public.profiles` (created by the database trigger).
3. In the Supabase SQL Editor, promote only that verified user:

   ```sql
   update public.profiles
   set role = 'admin'
   where id = (
     select id
     from auth.users
     where email = lower('YOUR_ADMIN_EMAIL')
   );
   ```

4. Confirm that exactly one intended profile was updated.

Never let a public signup request set `profiles.role`. The application must not expose a route that lets users promote themselves.

## Security notes

- Never commit `.env`, passwords, Supabase secret keys, or service-role keys.
- The server uses the Supabase publishable key and forwards each signed-in user's access token so database RLS remains in effect.
- Never use a service-role key in browser code.
- Use HTTPS in production.
- The default rate-limit store is in-memory. Configure a shared store before running multiple application instances.

## Current status

The Supabase database schema, RLS policies, booking RPC, shop hours, and active service catalogue have been configured. This repository contains the initial application scaffold. Authentication UI, admin screens, barber management, payment integration, and end-to-end tests are not implemented yet.
