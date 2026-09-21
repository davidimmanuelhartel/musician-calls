# Tutti — substitute calls

Hosted POC: https://musician-calls.vercel.app — general-user sign-in emails still require custom SMTP (see [deployment notes](docs/DEPLOYMENT.md)).

A mobile-first English/Danish web app for orchestras, big bands and ensembles to find substitute musicians. “Tutti” is a working product name.

Create a private ensemble once, save its usual venue/address and instrumentation, and invite orchestra members. Any member can publish a call using those defaults, attach PDFs, review availability responses and select a substitute. Musicians do not need accounts. Selection fills the call; the organizer contacts the musician directly to confirm arrangements.

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

## Existing local installation

Apply new migrations without resetting your calls:

```sh
npx supabase migration up --local
```

## Implemented scope

- `/{locale}/ensembles`: your private ensemble memberships.
- `/{locale}/ensembles/new`: create an ensemble once with shared defaults.
- `/{locale}/ensembles/{id}`: shared calls, response counts, saved details, members and a private substitute directory.
- `/{locale}/ensembles/{id}/edit`: owner-only editing of the saved details.
- `/{locale}/join/{token}`: join the existing ensemble through a private invite and verified email sign-in.

- `/en` and `/da`: landing page; no global call listing.
- `/{locale}/calls/new?ensemble={id}`: member-only call form with saved ensemble details. Instrument, date and call time are the main required inputs; venue can be changed for this call; compensation and practical information are entered per call. Drafts and PDFs are saved separately per account and ensemble. Without an ensemble, this route redirects to your ensemble list.
- `/{locale}/calls/{id}`: private detail; members or personal invite holders only. Invited substitutes can open PDFs and respond without an account.
- `/{locale}/dashboard`: compatibility redirect to your ensemble list.
- `/{locale}/dashboard/{id}`: private responses and atomic selection, available to members of the call’s ensemble.
- `/{locale}/login` and `/auth/confirm`: email magic-link authentication.
- EN/DA toggle preserves the route and call ID. Browser language is used initially; manual choice is remembered.

Interface copy, validation, statuses, instruments and email templates support both languages. Organizer-written content is not translated. Times are interpreted in Europe/Copenhagen. An open call expires at performance time, or call time when no performance time is supplied; a filled call stays filled after that time. Ambiguous/nonexistent daylight-saving times are rejected.

No profiles for musicians, automatic matching, chat, response notifications, payment processing, permanent openings or native app.

## Data and access

Supabase Auth owns organizer identity. `organizer_profiles` stores default contact details. Calls are private to their ensemble and invited substitutes; contact snapshots are in the separate private `call_contacts` table. Responses and call contact snapshots are readable only by current ensemble members. Ensemble pages and membership lists are private. Calls retain snapshots of the ensemble name and call details; editing the ensemble does not change already published calls.

Database migrations define row-level security, grants and these transactional functions:

- `publish_call`: verified ensemble member only; derives the ensemble name and sender identity from trusted records and atomically creates the call, private contacts and attachment metadata.
- `submit_response`: service-role only, reached through a validating Server Action. Serializes against selection, requires a valid invitation for a current listed substitute, rejects closed calls and duplicate substitute/email responses, and limits accepted submissions to five per hashed IP per ten minutes.
- `select_musician`: current ensemble member only; locks the call, checks response membership and fills it with exactly one selection.

PDFs upload directly to a private storage bucket before publication. Published files are streamed through a route that checks current membership or a personal invitation on every request. Bare call links give no access. No musician login is required. Uploads are limited to 10 PDFs, 20 MB each. Unpublished uploads are private to their owner. For production, configure cleanup of abandoned unpublished objects; see [deployment notes](docs/DEPLOYMENT.md).

## Ensemble access

The creator owns the ensemble, edits its defaults, creates invite links and removes members. All current members can create calls, read responses and select substitutes. A reusable invite expires after 30 days; creating a new one invalidates the previous link. Removing a member also invalidates the outstanding invite. Invite tokens are stored as hashes, and joining requires a verified account. The app provides a link to copy; it does not send invitations itself.

Existing pre-ensemble calls are preserved by the migration. They are grouped by original creator and normalized ensemble name, with that creator made the owner. Identical names from unrelated accounts are not automatically merged or given shared access.

## Verify

```sh
npm run typecheck
npm run lint
npm test
npm run build
# Start local Supabase and configure .env.local first:
npm run test:e2e
```

Playwright starts or reuses the app on port 3020. Install Chromium with `npx playwright install chromium` if it is not already available. The browser and database tests create synthetic users, ensembles and calls in the local database. Tests refuse non-local Supabase URLs. `node scripts/cleanup-test-data.mjs` removes only the known synthetic test accounts and their data; it preserves other local accounts and calls.

The test suite checks ensemble creation and joining, private membership, owner permissions, shared defaults and stable call snapshots, invitation rotation/expiry, member removal, per-ensemble draft isolation, and the mobile publish/respond/select flow with PDF upload recovery. It also checks duplicate submissions, expired calls, rate limiting and simultaneous selections. `npm run db:reset` resets only this local stack, including any locally created calls.

## Product decisions and next steps

See [v0 implementation notes](docs/V0_PLAN.md) and [deployment notes](docs/DEPLOYMENT.md). The repository is local until a GitHub remote is created. Hosted Supabase, email delivery and production hosting still require configuration.

### Ensemble instrumentation

Ensemble owners can select editable templates for symphony, chamber, string and wind orchestras, brass bands and big bands, or start with a custom list. Each chair/section stores an instrument and English/Danish labels. Members choose saved chairs when creating calls, with a custom-instrument fallback. Existing ensembles start with an empty custom list; owners configure them through Edit ensemble. Published calls keep their original instrument and chair when the ensemble changes. A visual seating map is deferred.

### Venue search

Ensemble setup stores a name, venue/address and instrumentation. Fees and practical notes are entered separately for each substitute call. Old published calls retain their snapshots.

Venue/address autocomplete uses Photon/OpenStreetMap, restricted to Denmark for this POC. It searches after a 450ms pause, only for signed-in users, and allows manual editing in the same input. Selecting a result fills the formatted street, postcode, city and country when provided by the source; the selected venue and address appear together inside the input; changing the venue clears the previous address to avoid a mismatched pair. Search does not infer missing house numbers. Photon’s public demo endpoint permits moderate project usage but has no availability guarantee; use a hosted service or own instance before scaling: https://github.com/komoot/photon#demo-server.

## Private substitute list

All current ensemble members can add, edit or remove substitute contacts (name, instrument, phone; optional email). Each call shows contacts for its instrument only. Members can call a listed number or generate a personal invitation link and send it themselves; the app sends no messages. Tokens are stored as hashes. Replacing a link or editing/removing its contact revokes existing access. Invitations expire seven days after the event; responses stop when the call closes.

Personal links are bearer credentials: someone who receives a forwarded link can use it. They do not verify the musician's identity. Responses use the listed name and phone, plus the saved email when present. Removing a contact preserves historical responses, but prevents selecting it for an open call. Earlier calls become private too; earlier unlisted responses remain historical records. Files already downloaded cannot be recalled.
