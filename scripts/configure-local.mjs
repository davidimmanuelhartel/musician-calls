import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';
const output = execFileSync(
  process.execPath,
  ['node_modules/supabase/dist/supabase.js', 'status', '-o', 'json'],
  { encoding: 'utf8' },
);
const status = JSON.parse(output.slice(output.indexOf('{')));
writeFileSync(
  '.env.local',
  `NEXT_PUBLIC_SUPABASE_URL=${status.API_URL}\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${status.PUBLISHABLE_KEY || status.ANON_KEY}\nSUPABASE_SERVICE_ROLE_KEY=${status.SERVICE_ROLE_KEY}\nAPP_URL=http://localhost:3020\nRATE_LIMIT_SECRET=${randomBytes(32).toString('hex')}\n`,
  { mode: 0o600 },
);
console.log('Wrote .env.local for isolated local Supabase.');
