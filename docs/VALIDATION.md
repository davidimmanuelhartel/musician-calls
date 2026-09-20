# Local validation — private ensembles, 20 September 2026

- TypeScript, ESLint and the production build pass.
- Eight focused tests pass, including required ensemble context and safe sign-in return paths.
- Seven browser/database tests pass, covering ensemble ownership, private membership, joining through a reusable invite, invitation rotation/expiry, member removal, blocked nonmember publishing, shared defaults, and immutable published snapshots.
- The browser verifies that an invited member reaches the same ensemble, creates a call without re-entering the name, contact, venue or fee, and that another ensemble member can access its response management.
- Drafts remain isolated across ensembles and survive EN/DA switching, including PDFs.
- The full mobile flow passes: real local email login, ensemble setup, failed PDF upload and retry, anonymous musician response, selection and rejection of stale-page submissions after filling.
- Existing duplicate-response, expiry, rate-limit and concurrent-selection checks pass.
- English desktop and Danish mobile ensemble screenshots were inspected, including the mobile overflow check.

The migration was applied to the existing local database without resetting it. It groups previous calls by creator and ensemble name and preserves their public snapshots and original ownership. Test cleanup targets synthetic fixture accounts, not other local data.

Hosted deployment, external SMTP, human Danish copy review and real-world usability sessions remain unvalidated. The app has not been deployed to production.
