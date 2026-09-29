import { execFileSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';

const status = JSON.parse(execFileSync('npx', ['supabase', 'status', '-o', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }));
if (!['127.0.0.1', 'localhost'].includes(new URL(status.API_URL).hostname)) throw new Error('Expected local Supabase.');
const publicEnv = `NEXT_PUBLIC_SUPABASE_URL=${status.API_URL}\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${status.PUBLISHABLE_KEY}\n`;
if (!status.PUBLISHABLE_KEY || !status.SECRET_KEY) throw new Error('Local Supabase keys missing.');
if (!existsSync('.env.local')) {
  writeFileSync('.env.local', publicEnv, { mode: 0o600 });
  console.log('Created .env.local for the local app.');
} else {
  console.log('Preserved existing .env.local.');
}
writeFileSync('.env.test.local', `${publicEnv}SUPABASE_TEST_SECRET_KEY=${status.SECRET_KEY}\nTEST_DATABASE_URL=${status.DB_URL}\n`, { mode: 0o600 });
console.log('Configured local-only test credentials in ignored .env.test.local (keys not printed).');
