#!/usr/bin/env node
// Run: node scripts/generate-vapid.js
// Then copy the output into your .env file.

import webpush from 'web-push'

const keys = webpush.generateVAPIDKeys()

console.log('─── VAPID Keys (add to .env) ────────────────────────────')
console.log(`VAPID_PUBLIC_KEY=${keys.publicKey}`)
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`)
console.log(`VITE_VAPID_PUBLIC_KEY=${keys.publicKey}`)
console.log('─────────────────────────────────────────────────────────')
console.log('Note: VAPID_PUBLIC_KEY and VITE_VAPID_PUBLIC_KEY are identical.')
console.log('Keep VAPID_PRIVATE_KEY secret — never commit it or expose it client-side.')
