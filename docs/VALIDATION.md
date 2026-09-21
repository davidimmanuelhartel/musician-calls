# Validation — private calls and substitute lists, 21 September 2026

The suite contains 10 unit tests and 12 browser/database tests. It covers private ensembles, member permissions, bilingual drafts, seating templates, address input, call creation, PDF upload recovery, personal invitations, musician responses and atomic selection.

Privacy regressions cover anonymous and cross-ensemble access, instrument matching, token rotation and expiry, contact edits/removal, forged response identity, duplicate responses, rate limits and stale submissions. Removing an ensemble member blocks access to their committed PDFs and does not let them delete those files. Removing a substitute revokes their call and PDF invitation access while preserving response history.

The migrations upgrade existing records without resetting the database. Existing calls become private. Test cleanup targets synthetic fixture accounts only.

Browser checks include the English mobile substitute directory and invitation controls, the Danish invited response flow, desktop/mobile layouts and overflow. Hosted verification uses a temporary synthetic account and an admin-generated login link; it does not test email delivery.

Custom SMTP for external users, human Danish copy review and real-world usability sessions remain outstanding. Personal invitation links are bearer credentials, not proof of the recipient's identity.
