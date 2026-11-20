# AGENTS.md

## Project context

- Project: Barber-Shop
- Frontend: HTML, CSS, and browser JavaScript.
- Backend: Node.js and Express.
- Database/platform: Supabase.
- Primary language: JavaScript.

The repository currently documents only the project name in README.md. Do not assume a directory layout, framework, package manager, scripts, authentication provider, or database schema. Inspect the repository before making changes and update these instructions when the actual implementation becomes clear.

## Required workflow

1. Read the relevant source files and existing documentation before editing.
2. Identify the actual entry points, module system (CommonJS or ES modules), package manager, scripts, environment variables, and Supabase integration from the repository. Do not invent commands or configuration.
3. Make the smallest focused change that solves the task. Preserve existing conventions and avoid unrelated refactors.
4. Do not add dependencies unless they are necessary. Explain why a new dependency is needed.
5. Never overwrite user changes or remove existing behavior without an explicit requirement.
6. If requirements are ambiguous or a change could affect data, authentication, payments, bookings, or production behavior, explain the uncertainty and ask before making a destructive decision.

## JavaScript and frontend standards

- Follow the existing JavaScript module and formatting conventions.
- Prefer clear names, small functions, and explicit control flow.
- Validate data at trust boundaries; browser-side validation is for usability and must not replace server-side validation.
- Use semantic HTML, accessible labels, keyboard-operable controls, and appropriate form input types.
- Avoid unsafe DOM insertion such as assigning untrusted input to `innerHTML`. Prefer `textContent` and safe DOM APIs.
- Do not place server secrets, Supabase service-role keys, or privileged credentials in frontend code or publicly served files.
- Keep UI behavior separate from API and persistence concerns where the current architecture allows it.

## Node.js and Express standards

- Follow the repository's existing CommonJS or ES module convention; do not mix module systems casually.
- Keep route handlers focused. Put reusable validation and business logic in the project's established layers.
- Validate and normalize request parameters, query strings, and JSON bodies on the server.
- Use appropriate HTTP methods and status codes. Do not expose stack traces, SQL details, tokens, or internal configuration in client responses.
- Centralize error handling where the application already has an Express error middleware pattern.
- Configure CORS with explicit trusted origins; do not use a permissive wildcard with credentialed requests.
- Apply security headers and reasonable request-size limits. Add rate limits to sensitive or abuse-prone endpoints when appropriate.
- Do not trust user IDs, roles, prices, booking status, or other authorization/business-critical values supplied by the browser. Derive or verify them server-side.

## Supabase and data access

- Inspect the existing Supabase client setup and schema before changing queries or data models.
- Treat Row Level Security (RLS) as a required authorization boundary for tables exposed through Supabase APIs. Verify policies for both allowed and denied access paths.
- Use the public/anon key only in contexts intended for public clients and only with correctly configured RLS.
- Keep the service-role key and all privileged credentials on the server in environment variables. Never commit them or expose them to the browser.
- Enforce authorization on the server for privileged operations; hiding a UI control is not access control.
- Prefer Supabase client query-builder methods and safe parameter binding. Never build SQL by concatenating untrusted input.
- Select only the columns needed. Handle Supabase errors explicitly; do not silently treat failed queries as empty successful results.
- Do not run destructive migrations, delete records, or weaken RLS policies without explicit approval.

## Security and privacy

- Follow SECURITY.md for security-sensitive work.
- Treat all browser input, URL parameters, uploaded files, and external API responses as untrusted.
- Protect against XSS, CSRF where cookie-based authentication is used, injection, broken access control, and insecure direct object references.
- Do not log passwords, access tokens, session cookies, API keys, payment details, or unnecessary personal data.
- Keep secrets out of source control. If a secret is exposed, do not repeat it; recommend revocation/rotation and review of access logs.
- Use HTTPS in deployed environments and secure cookie attributes when cookies are used.

## Testing and verification

- Inspect package.json and project documentation to discover the supported test, lint, and build commands. Do not assume they exist.
- Run relevant tests and checks after changes when available.
- For API changes, verify success, validation failure, unauthenticated, unauthorized, and unexpected-error paths as applicable.
- For database or RLS changes, verify both authorized and unauthorized access with representative roles.
- If checks cannot be run, state exactly which checks were not run and why. Never claim tests passed unless they were executed successfully.

## Change reporting

At completion, summarize:
- What changed and why.
- Files added or modified.
- Tests/checks run and their results.
- Remaining risks, assumptions, or follow-up work.
