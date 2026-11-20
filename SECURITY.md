# Security Policy

## Supported versions

This repository does not currently define release versions or a support matrix. Until one is published, report security issues affecting the current default branch.

## Reporting a vulnerability

Please do not disclose suspected vulnerabilities in public issues, discussions, pull requests, or social media.

Use GitHub's **Private vulnerability reporting** feature for this repository if it is enabled. If it is unavailable, contact the repository owner or maintainers through a private channel and request a secure method to share the report. Do not include exploit details or secrets in a public report.

When reporting, include (when safe to do so):

- A concise description and affected component or file.
- The impact and realistic attack scenario.
- Steps to reproduce or a minimal proof of concept.
- Any relevant request/response samples with credentials, tokens, cookies, and personal data removed.
- A suggested mitigation, if known.

Please allow maintainers reasonable time to investigate and prepare a fix before public disclosure. Do not access, modify, or delete other users' data while validating a finding.

## Security requirements for this application

### Secrets and configuration

- Never commit `.env` files, passwords, access tokens, private keys, or production credentials.
- Keep the Supabase service-role key exclusively in trusted server-side configuration. It bypasses Row Level Security and must never be sent to a browser.
- A Supabase anon/publishable key may be used by a public client only when the exposed tables and operations are protected by correctly configured Row Level Security policies.
- Use environment variables or the deployment platform's secret manager. Keep a sanitized `.env.example` containing variable names and placeholder values only.
- Rotate credentials immediately if they are committed, logged, or otherwise exposed. Removing a secret from the latest commit does not invalidate it.

### Authentication and authorization

- Enforce authorization on every protected Express endpoint and every privileged data operation.
- Verify identity and permissions server-side; never rely on a user ID, role, ownership claim, or booking state supplied by the client.
- Apply least privilege. Users should access only the records and actions required for their role.
- Configure and test Supabase Row Level Security (RLS) for every table exposed through the Supabase API. Include negative tests proving users cannot read or modify another user's protected records.
- Do not disable RLS as a workaround for application errors.

### Input, API, and browser security

- Validate type, format, length, range, and allowed values for all untrusted input on the server.
- Use safe Supabase query-builder operations or parameterized SQL. Never concatenate user input into SQL.
- Prevent XSS by safely rendering untrusted content; avoid unsafe `innerHTML` usage.
- Configure CORS for known frontend origins and avoid wildcard origins when credentials are enabled.
- Use HTTPS in production, security headers, request-size limits, and rate limiting for login, booking, and other sensitive endpoints as appropriate.
- If authentication uses cookies, evaluate CSRF protections and set Secure, HttpOnly, and appropriate SameSite attributes.
- Return generic client-facing errors; keep stack traces and internal implementation details in protected server logs.

### Barber-shop data and business operations

- Verify that customers can view or modify only their own personal data and bookings, unless an explicitly authorized staff/admin role permits otherwise.
- Re-check appointment availability and business-critical values on the server. Do not trust client-submitted prices, discounts, staff permissions, or booking status.
- Prevent unauthorized booking changes and test for race conditions or duplicate submissions where concurrent booking requests are possible.
- Minimize collection, retention, and logging of personal information. Do not log credentials, session tokens, or unnecessary customer details.

### Dependencies and deployment

- Review dependency changes and security advisories; remove unused packages when safe.
- Keep Node.js and dependencies on supported, patched versions.
- Do not expose development tools, debug endpoints, source maps containing secrets, or verbose error output in production.
- Restrict database, hosting, and repository credentials to the minimum required permissions.

## Response and remediation

Maintainers should assess severity, reproduce the issue safely, identify affected versions or commits, and prioritize remediation based on impact and exploitability. A fix should include regression tests where practical. Rotate exposed credentials and review relevant access logs when compromise is possible.

Do not claim the application is secure solely because automated scanners report no findings. Security requires review of application logic, authorization rules, Supabase RLS policies, deployment configuration, and operational practices.
