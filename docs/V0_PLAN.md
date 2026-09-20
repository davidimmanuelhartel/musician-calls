# v0.1 implementation decisions

## Goal

Validate whether a structured, shareable substitute call helps an organizer fill a last-minute vacancy. The core acceptance scenario is the supplied trombone call in Frederiksberg, with Beethoven sheet music, a private musician response, organizer selection and a public filled state.

## Agreed scope

New repository; Next.js App Router, TypeScript, Tailwind and Supabase; mobile-first web interface in English and Danish. Language-prefixed routes and a visible toggle. Denmark-focused pilot, DKK default, Europe/Copenhagen timestamps.

Public pages include upcoming open calls and individual calls, including filled or expired calls when accessed by their existing link. There is no geographic search or automatic distribution. Organizers share links themselves.

## Publication and authentication

Organizers fill in the form before authentication. Their draft and PDFs are saved in the browser's IndexedDB. The email must be verified before publication. Following the email link returns to the create form for a deliberate Publish call action. Contact details come from the authenticated email; the public call cannot claim an unverified organizer email.

Drafts are device/browser/origin-specific. Opening the link on another device authenticates that device but does not transfer the draft. UI and email copy explain that the draft remains on the original device.

## Responses and selection

Available and maybe are interest signals. They do not constitute confirmed bookings. The organizer sees name, email, optional phone and message, selects a musician, and contacts them directly. No automatic musician notification is sent. Selection closes the call to new responses, including stale-page submissions.

A repeated email cannot add or overwrite a response to the same call. There is no self-service response editing in v0. A unique database index prevents multiple selected responses; a transaction couples selection to the filled state.

## Attachments

PDF only; up to 10 files, 20 MB per file. PDF metadata and storage existence are checked before publication. Anyone with the public call link can obtain a temporary download URL. Failed uploads must leave the call unpublished and the draft available for retry. Abandoned uploads require storage cleanup before a broader pilot.

## Expiration

The specification's “event datetime” is defined as performance time when present, otherwise call time. Times belong to a single event date; overnight multi-day scheduling is not included. Filled calls retain their status. Open calls whose event time has passed are displayed as expired and reject responses and selection.

## POC measures

The database records `published_at`, response `created_at`, and `filled_at`. These support filled-call count, responses per call, publish-to-first-available latency, and repeat organizers. See `docs/metrics.sql`; no analytics dashboard or tracking SDK is needed.

## Validation after technical acceptance

Run the supplied scenario with organizers and musicians on their own phones. Ask about speed, missing information, usefulness compared with messenger posts, and whether they would use it for the next absence. Measure the 60-second creation target during these sessions; it is not yet a validated performance claim, and first-time email verification adds time.
