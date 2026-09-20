# Local validation — 20 September 2026

Verified against the isolated local Supabase instance and the app on port 3020.

- TypeScript: passes.
- ESLint: passes without warnings.
- Production build: passes.
- Seven focused tests: expiration, summer/winter time, DST edge cases, event-time fallback, login return-path validation, response validation and translation parity.
- Browser flow: mobile EN/DA draft switching, real locally delivered magic-link email, draft and PDF recovery, failed PDF upload with successful retry, publication, anonymous PDF download, Danish availability response, organizer selection, and public filled state.
- Stale browser: submitting an already-open response form after selection is rejected.
- Language/layout: browser preference detection, remembered manual choice, desktop/mobile screenshots and mobile overflow check.
- Database integration: private responses and contact data, organizer isolation, rejected anonymous/direct write bypasses, duplicate email rejection, cross-call selection rejection, simultaneous selection with exactly one winner, expired-call rejection and submission rate limiting.

The browser and database suites comprise four tests; the mobile test performs the complete acceptance scenario and its recovery cases. Test records were removed after verification.

Not yet validated: hosted deployment, external SMTP delivery, human Danish copy review, the 60-second publication target with organizers, or qualitative usefulness in a real substitute search. No production deployment or GitHub remote has been created.
