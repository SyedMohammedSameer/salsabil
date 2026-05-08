#!/usr/bin/env node
/**
 * Firebase → Supabase user migration
 *
 * Prerequisites:
 *   1. Export Firebase users:
 *        firebase auth:export firebase-users.json --format=json
 *      (requires Firebase CLI: npm i -g firebase-tools && firebase login)
 *
 *   2. Set env vars (or edit the constants below):
 *        SUPABASE_URL=https://xxxx.supabase.co
 *        SUPABASE_SERVICE_ROLE_KEY=eyJ...
 *
 * Run:
 *   node scripts/migrate-firebase-users.js firebase-users.json
 */

import fs from 'fs'

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const INPUT_FILE = process.argv[2] ?? 'firebase-users.json'
const BATCH_SIZE = 100  // Supabase import limit per request

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.')
  process.exit(1)
}

if (!fs.existsSync(INPUT_FILE)) {
  console.error(`File not found: ${INPUT_FILE}`)
  process.exit(1)
}

const firebaseExport = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'))
const users = firebaseExport.users ?? []

console.log(`Found ${users.length} Firebase users`)
console.log(`Hash algorithm: ${firebaseExport.hashAlgorithm}`)

// ─── Build Supabase hash config from Firebase export header ──────────────────

const hashConfig = {
  algorithm: 'firebase_scrypt',
  memory_cost: firebaseExport.memCost,
  rounds: firebaseExport.rounds,
  salt_separator: firebaseExport.base64EncodedSaltSeparator,
  signer_key: firebaseExport.base64EncodedSignerKey,
}

// ─── Map Firebase users to Supabase import format ────────────────────────────

function mapUser(fbUser) {
  const providers = (fbUser.providerUserInfo ?? []).map((p) => p.providerId)

  const base = {
    id: fbUser.localId,                         // keep same UID
    email: fbUser.email,
    email_confirmed_at: fbUser.emailVerified
      ? new Date(parseInt(fbUser.lastRefreshTime ?? Date.now())).toISOString()
      : null,
    created_at: fbUser.createdAt
      ? new Date(parseInt(fbUser.createdAt)).toISOString()
      : new Date().toISOString(),
    user_metadata: {
      full_name: fbUser.displayName ?? null,
      avatar_url: fbUser.photoUrl ?? null,
      firebase_uid: fbUser.localId,
    },
    app_metadata: {
      provider: providers[0] ?? 'email',
      providers,
    },
  }

  // Email+password users: include password hash
  if (fbUser.passwordHash) {
    base.password_hash = fbUser.passwordHash
    base.password_salt = fbUser.salt ?? null
  }

  return base
}

// ─── Import in batches ────────────────────────────────────────────────────────

async function importBatch(batch, batchNum) {
  const body = {
    users: batch,
  }

  // Only include hash config if any user in batch has a password hash
  if (batch.some((u) => u.password_hash)) {
    body.hash_config = hashConfig
  }

  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/import`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'apikey': SERVICE_ROLE_KEY,
    },
    body: JSON.stringify(body),
  })

  const data = await res.json()

  if (!res.ok) {
    console.error(`Batch ${batchNum} failed:`, data)
    return { imported: 0, errors: batch.length }
  }

  const imported = data.imported_users?.length ?? 0
  const errors = (data.failed_users ?? []).length

  if (errors > 0) {
    console.warn(`Batch ${batchNum}: ${imported} imported, ${errors} failed`)
    for (const failed of data.failed_users ?? []) {
      console.warn(`  ✗ ${failed.email}: ${failed.error_message}`)
    }
  } else {
    console.log(`Batch ${batchNum}: ${imported} imported ✓`)
  }

  return { imported, errors }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const mapped = users.map(mapUser)
const batches = []
for (let i = 0; i < mapped.length; i += BATCH_SIZE) {
  batches.push(mapped.slice(i, i + BATCH_SIZE))
}

console.log(`Importing in ${batches.length} batch(es) of up to ${BATCH_SIZE}...\n`)

let totalImported = 0
let totalErrors = 0

for (let i = 0; i < batches.length; i++) {
  const { imported, errors } = await importBatch(batches[i], i + 1)
  totalImported += imported
  totalErrors += errors
}

console.log(`\nDone. ${totalImported} imported, ${totalErrors} failed.`)

if (totalErrors > 0) {
  console.log('\nFailed users are likely duplicates (already exist in Supabase).')
}

console.log('\nNext steps:')
console.log('  - OAuth users (Google, Apple): they just sign in — no action needed.')
console.log('  - Email users with passwords: they sign in with same password immediately.')
console.log('  - Email users without passwords (OAuth-only): send a password reset email.')
