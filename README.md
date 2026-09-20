# Tutti — substitute calls

A mobile-first English/Danish web app for orchestras, big bands and ensembles to find substitute musicians. “Tutti” is a working product name.

An organizer publishes a call, attaches PDFs, shares its link, reviews private availability responses and selects a musician. Musicians do not need accounts. Selection fills the call; the organizer contacts the musician directly to confirm arrangements.

## Run locally

Requires Node 24 (see `.node-version` / `.nvmrc`), npm and Docker.

```sh
npm ci
npm run db:start
node scripts/configure-local.mjs
npm run dev
```

- App: http://localhost:3020
- Local email inbox: http://127.0.0.1:55324
- Supabase Studio: http://127.0.0.1:55323

The local stack uses its own project ID and ports in the 5532x range. It does not connect to existing applications. Authentication emails are captured in the local inbox; use that inbox to open the sign-in link. Use `localhost:3020` consistently so browser drafts and sessions stay on the same origin.

`configure-local.mjs` writes a git-ignored `.env.local` for this local stack. It does not provision cloud services. Never expose `SUPABASE_SERVICE_ROLE_KEY` in a browser bundle.

## Implemented scope

- `/en` and `/da`: upcoming open calls, soonest first.
- `/{locale}/calls/new`: create form, local draft recovery including PDFs, verified-email publication.
- `/{locale}/calls/{id}`: public detail, PDF links, available/maybe response form.
- `/{locale}/dashboard`: organizer's calls and response counts.
- `/{locale}/dashboard/{id}`: private responses and atomic selection.
- `/{locale}/login` and `/auth/confirm`: email magic-link authentication.
- EN/DA toggle preserves the route and call ID. Browser language is used initially; manual choice is remembered.

Interface copy, validation, statuses, instruments and email templates support both languages. Organizer-written content is not translated. Times are interpreted in Europe/Copenhagen. An open call expires at performance time, or call time when no performance time is supplied; a filled call stays filled after that time. Ambiguous/nonexistent daylight-saving times are rejected.

No profiles for musicians, automatic matching, chat, response notifications, payment processing, permanent openings or native app.

## Data and access

Supabase Auth owns organizer identity. `organizer_profiles` stores default contact details. Calls contain public information; contact snapshots are in the separate private `call_contacts` table. Responses are readable only by the call owner.

Database migrations define row-level security, grants and these transactional functions:

- `publish_call`: verified organizer only; atomically creates the call, private contacts and attachment metadata.
- `submit_response`: service-role only, reached through a validating Server Action. Serializes against selection, rejects closed calls and duplicate email responses, and limits accepted submissions to five per hashed IP per ten minutes.
- `select_musician`: call owner only; locks the call, checks response membership and fills it with exactly one selection.

PDFs upload directly to a private storage bucket before publication. Published files can be accessed by anyone with the call link via short-lived signed URLs. No musician login is required. Uploads are limited to 10 PDFs, 20 MB each. Unpublished uploads are private to their owner. For production, configure cleanup of abandoned unpublished objects; see [deployment notes](docs/DEPLOYMENT.md).

## Verify

```sh
npm run typecheck
npm run lint
npm test
npm run build
# Start local Supabase and configure .env.local first:
npm run test:e2e
```

Playwright starts or reuses the app on port 3020. Install Chromium with `npx playwright install chromium` if it is not already available. The browser and database tests create isolated test users and calls in the local database. Do not run them against production.

The test suite checks the mobile publish/respond/select flow with a PDF, language and draft persistence, private access, duplicate submissions, expired calls, rate limiting and simultaneous selections. `npm run db:reset` resets only this local stack, including any locally created calls.

## Product decisions and next steps

See [v0 implementation notes](docs/V0_PLAN.md) and [deployment notes](docs/DEPLOYMENT.md). The repository is local until a GitHub remote is created. Hosted Supabase, email delivery and production hosting still require configuration.
