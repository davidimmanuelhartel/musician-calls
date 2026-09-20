# Deploying the POC

The implementation runs locally. These steps are needed for a hosted pilot.

1. Create a separate Supabase project and apply `supabase/migrations` with the Supabase CLI. Use a dedicated project, never an existing application's database.
2. Configure the environment values listed in `.env.example`. `APP_URL` must be the canonical HTTPS origin. Set a strong random `RATE_LIMIT_SECRET`; keep it and the service-role key server-side.
3. Set the Supabase Auth site URL to the app origin and allow its `/auth/confirm` redirect URL. Copy `supabase/templates/magic-link.html` into both Magic Link and Confirm Signup email templates; it supports English and Danish. Configure SMTP for real authentication email delivery.
4. Deploy the Next.js app to a Node-compatible host, using Node 24, `npm ci`, and `npm run build`. The app uses server rendering and Server Actions; it is not a static export. PDFs upload directly to Supabase rather than through Next.js request bodies.
5. Verify the full workflow on the hosted origin, with two different organizer accounts and an anonymous musician browser. Confirm that auth redirects, PDF links and database policies work before inviting pilot participants.

## Operational details

- Trust forwarded client IP headers only from the hosting proxy. On Vercel, the application reads `x-vercel-forwarded-for`; on another host, configure the proxy to overwrite `x-forwarded-for`. Do not forward arbitrary client-supplied values. The application hashes IPs and keeps rate-limit records for at most one hour during active use. These limits are basic POC abuse protection, not comprehensive anti-bot protection.
- Supabase's built-in Auth limits control magic-link requests. The application does not send response or selection emails.
- Configure periodic deletion through the Storage API for objects older than 24 hours in `call-pdfs` that are not referenced by `public.attachments`. Never delete storage metadata directly. Failed and abandoned browser uploads may otherwise accumulate. Completed-call retention should be agreed with the pilot organizers.
- Run `delete from public.response_rate_limits where created_at < now() - interval '1 hour'` periodically so the final rate-limit records are also removed when the app is idle.
- Published attachments are intentionally accessible through public calls. The bucket itself stays private. Signed download links last one hour; reload the call to obtain a fresh link.
- No manual closing/reopening or call editing is included. The optional close endpoint was deferred because the agreed call status model has no cancelled state. Selection is the supported closure path.
- Draft recovery uses browser storage and therefore does not transfer across devices, browser profiles, or origins. Clearing site data removes the draft.
- If hosting without configured Supabase, the homepage shows a translated service-unavailable message rather than fake calls.

## Implementation references

The implementation follows the [Next.js Proxy convention](https://nextjs.org/docs/app/getting-started/proxy), [Supabase server-side client guidance](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs), [email template documentation](https://supabase.com/docs/guides/auth/auth-email-templates), and [Storage access-control guidance](https://supabase.com/docs/guides/storage/security/access-control). Exact installed package versions are in `package-lock.json`; use the checked-in Node version.
