// Copies store/privacy-policy.md into lib/privacyPolicy.ts as a string.
import { readFileSync, writeFileSync } from 'node:fs'
const md = readFileSync(new URL('../store/privacy-policy.md', import.meta.url), 'utf8')
writeFileSync(
  new URL('../lib/privacyPolicy.ts', import.meta.url),
  '// Generated from store/privacy-policy.md so the policy ships inside the app\n' +
    '// (both stores require it to be reachable without a browser). Re-run\n' +
    '// `node scripts/sync-privacy.mjs` after editing the markdown.\n\n' +
    'export const PRIVACY_POLICY_MD = ' + JSON.stringify(md) + '\n',
)
console.log('lib/privacyPolicy.ts updated')
