# v0.1 implementation decisions

## Goal

Validate whether a structured, shareable substitute call helps an organizer fill a last-minute vacancy. The core acceptance scenario is the supplied trombone call in Frederiksberg, with Beethoven sheet music, a private musician response, organizer selection and a public filled state.

## Agreed scope

New repository; Next.js App Router, TypeScript, Tailwind and Supabase; mobile-first web interface in English and Danish. Language-prefixed routes and a visible toggle. Denmark-focused pilot, DKK default, Europe/Copenhagen timestamps.

Public pages include upcoming open calls and individual calls, including filled or expired calls when accessed by their existing link. There is no geographic search or automatic distribution. Organizers share links themselves.

## Private ensembles and publication

An ensemble is created once and shared through membership. The creator is its owner and manages the name, usual venue/address, fee/currency and practical information. Each current member can create calls from the private page and manage responses together. Only the owner can edit ensemble defaults and invite or remove members.

The public “Find a substitute” entry leads to the user's ensembles. `/{locale}/calls/new` requires an ensemble query parameter and current membership; a missing ensemble redirects to the ensemble list. Both the Server Action and the database require an ensemble ID, and the database checks membership rather than trusting the browser. It derives the ensemble name and contact identity from stored records.

Call creation asks primarily for the instrument, date and times. Saved details are displayed with an expandable section for changes specific to this call. The call stores a snapshot: later ensemble edits do not rewrite existing calls.

Sign-in happens before ensemble setup or joining. Invite links are reusable for 30 days and require verified email sign-in plus an explicit Join action. The owner can replace the link; replacing or removing a member invalidates the old link. Invite tokens are stored only as hashes. The app does not send invitations automatically.

Call drafts and PDFs are saved in IndexedDB, isolated by account and ensemble. They stay in the browser that created them and survive language switching or reloading. Publishing clears only that draft. Opening an invitation on another device authenticates that device but does not transfer local drafts.

Earlier calls are migrated without deletion. Calls are grouped by their original creator and normalized ensemble name to preserve access; identical names across unrelated users do not automatically confer shared membership. The owner cannot create a second ensemble with the same normalized name under their own account.

## Responses and selection

Available and maybe are interest signals. They do not constitute confirmed bookings. Ensemble members see name, email, optional phone and message, select a musician, and contact them directly. No automatic musician notification is sent. Selection closes the call to new responses, including stale-page submissions.

A repeated email cannot add or overwrite a response to the same call. There is no self-service response editing in v0. A unique database index prevents multiple selected responses; a transaction couples selection to the filled state.

## Attachments

PDF only; up to 10 files, 20 MB per file. PDF metadata and storage existence are checked before publication. Anyone with the public call link can obtain a temporary download URL. Failed uploads must leave the call unpublished and the draft available for retry. Abandoned uploads require storage cleanup before a broader pilot.

## Expiration

The specification's “event datetime” is defined as performance time when present, otherwise call time. Times belong to a single event date; overnight multi-day scheduling is not included. Filled calls retain their status. Open calls whose event time has passed are displayed as expired and reject responses and selection.

## POC measures

The database records `published_at`, response `created_at`, and `filled_at`. These support filled-call count, responses per call, publish-to-first-available latency, and repeat organizers. See `docs/metrics.sql`; no analytics dashboard or tracking SDK is needed.

## Validation after technical acceptance

Run the supplied scenario with organizers and musicians on their own phones. Ask about speed, missing information, usefulness compared with messenger posts, and whether they would use it for the next absence. Measure the 60-second creation target during these sessions; it is not yet a validated performance claim, and first-time email verification adds time.
