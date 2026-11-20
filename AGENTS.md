# AGENTS.md

## Project context

- Project: Barber-Shop
- Frontend: static HTML, CSS, and browser JavaScript in `public/`.
- Backend: Node.js 26 LTS and Express 5 in `src/`.
- Database and authentication: Supabase PostgreSQL and Supabase Auth.
- Language: JavaScript ES modules.
- Package manager: npm.

## Repository structure

- `public/`: browser UI and static assets.
- `src/config/`: environment validation.
- `src/lib/`: Supabase client factories.
- `src/middleware/`: authentication middleware.
- `src/routes/`: HTTP API routes.
- `src/app.js`: Express application and middleware.
- `src/server.js`: HTTP server entry point.

Read the current implementation before assuming this structure is unchanged.

## Required workflow

1. Read the relevant source files, README.md, and SECURITY.md before editing.
2. Inspect the actual scripts, module system, environment variables, and Supabase schema before changing related behavior.
3. Make the smallest focused change that solves the task. Preserve existing conventions and avoid unrelated refactors.
4. Do not add dependencies unless they are necessary. Pin dependency versions and commit the npm lockfile after installing.
5. Never overwrite user changes or remove existing behavior without an explicit requirement.
6. Ask before destructive database operations or changes that weaken authentication, authorization, or RLS.

## JavaScript and frontend standards

- Use ES modules and the repository's existing formatting conventions.
- Prefer clear names, small functions, and explicit control flow.
- Validate data at trust boundaries; browser-side validation is for usability and must not replace server-side validation.
- Use semantic HTML, accessible labels, keyboard-operable controls, and appropriate form input types.
- Never place untrusted input into `innerHTML`; prefer `textContent` and safe DOM APIs.
- Do not place service-role keys, secret keys, passwords, or privileged credentials in frontend code or publicly served files.
- Keep UI behavior separate from API and persistence concerns.

## Node.js and Express standards

- Validate and normalize request parameters, query strings, and JSON bodies on the server.
- Use appropriate HTTP methods and status codes. Do not expose stack traces, SQL internals, tokens, or configuration in client responses.
- Centralize error handling through the Express error middleware.
- Keep request body limits, security headers, and rate limits in place.
- This application currently serves the frontend and API from one origin; do not add permissive CORS configuration without a concrete cross-origin requirement.
- Do not trust user IDs, roles, prices, booking status, or other authorization/business-critical values supplied by the browser.

## Supabase and data access

- Inspect the existing Supabase client setup and schema before changing queries or data models.
- Treat Row Level Security (RLS) as a required authorization boundary for all exposed tables.
- The server uses the publishable key with the signed-in user's access token. Preserve that user context so RLS applies.
- Keep Supabase secret and service-role keys out of source control and browser code.
- Verify user identity using Supabase Auth; do not decode JWTs and assume they are valid.
- Enforce authorization in database policies and server-side logic. Hiding a UI control is not access control.
- Never let a public signup endpoint set `profiles.role`.
- Do not disable RLS as a workaround for API errors.
- Do not run destructive migrations or delete records without explicit approval.

## Barber-shop business rules

- The shop is open Monday through Friday, 10:00–20:00 Asia/Bangkok; Saturday and Sunday are closed.
- Active services and their configured price and duration are managed in Supabase.
- Appointment creation must use the `create_appointment` database function.
- `barberId` may be a selected barber UUID or `null` for automatic barber assignment.
- Never trust prices, durations, barber assignment, appointment status, or customer ownership sent by the client.
- Preserve the database checks for opening hours and overlapping active bookings.

## Security and privacy

- Follow SECURITY.md for security-sensitive work.
- Treat browser input, URL parameters, and external API responses as untrusted.
- Protect against XSS, injection, broken access control, and insecure direct object references.
- Do not log passwords, access tokens, session cookies, API keys, or unnecessary customer data.
- If a secret is exposed, recommend revocation/rotation; deleting the file does not invalidate the credential.
- Use HTTPS in deployed environments.

## Testing and verification

- Inspect package.json to discover available commands; do not assume scripts exist.
- Run relevant tests and checks after changes when available.
- For API changes, verify success, validation failure, unauthenticated, unauthorized, and unexpected-error paths as applicable.
- For RLS changes, test both allowed and denied access paths with representative roles.
- If checks cannot be run, state exactly which checks were not run. Never claim tests passed unless they were executed successfully.

## Change reporting

At completion, summarize what changed, files touched, checks run and results, and remaining risks or follow-up work.
