#!/usr/bin/env node
/**
 * Backfill Subscription Billing Periods
 *
 * One-time repair for subscriptions whose current_period_start/end went stale
 * because clover (2025+) Stripe webhook payloads omitted those fields (see
 * supabase/functions/stripe-webhook/index.ts). Stale rows self-heal on their
 * next renewal once the webhook fix is deployed; this script fixes them now.
 *
 * For each subscription with a Stripe id, it retrieves the live subscription via
 * the pinned 2023-10-16 API version (which returns top-level current_period_*)
 * and updates the DB row if the period differs.
 *
 * Dry-run by default — pass --apply to write changes.
 *
 * Usage:
 *   node scripts/backfill-subscription-periods.js                 # dry run, all subs
 *   node scripts/backfill-subscription-periods.js --apply         # write changes
 *   node scripts/backfill-subscription-periods.js --org <id> --apply
 *
 * Env (loaded from supabase/.env.local, then .env.development, then .env):
 *   STRIPE_SECRET_KEY                       (sk_live_… or sk_test_…)
 *   SUPABASE_URL (or LIVE_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(rootDir, 'supabase/.env.local') });
dotenv.config({ path: path.join(rootDir, '.env.development') });
dotenv.config({ path: path.join(rootDir, '.env') });

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const orgFlagIdx = args.indexOf('--org');
const ORG_ID = orgFlagIdx !== -1 ? args[orgFlagIdx + 1] : null;

const SUPABASE_URL =
  process.env.LIVE_SUPABASE_URL || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;

function fail(msg) {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

const missing = [];
if (!SUPABASE_URL) missing.push('SUPABASE_URL (or LIVE_SUPABASE_URL / VITE_SUPABASE_URL)');
if (!SERVICE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY  — Supabase dashboard → Project Settings → API → service_role');
if (!STRIPE_KEY) missing.push('STRIPE_SECRET_KEY  — Stripe dashboard → Developers → API keys → Secret key (use sk_live_ for the production DB)');
if (missing.length) {
  fail(
    `Missing required env var(s):\n   - ${missing.join('\n   - ')}\n\n` +
      `These are not kept in the repo's .env files. Pass them inline for a one-off run, e.g.:\n` +
      `   SUPABASE_SERVICE_ROLE_KEY='…' STRIPE_SECRET_KEY='sk_live_…' npm run backfill:periods`
  );
}

// Pin to 2023-10-16 so retrieve() returns the old top-level current_period_* shape,
// matching what the edge function relies on. Stripe still serves old versions on request.
const stripe = new Stripe(STRIPE_KEY, { apiVersion: '2023-10-16' });
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const toISO = (unixSeconds) => {
  if (!unixSeconds) return null;
  const d = new Date(unixSeconds * 1000);
  return isNaN(d.getTime()) ? null : d.toISOString();
};

async function main() {
  console.log(`\nBackfill subscription periods — ${APPLY ? 'APPLY (writes enabled)' : 'DRY RUN (no writes)'}`);
  console.log(`Stripe key: ${STRIPE_KEY.slice(0, 8)}…   Supabase: ${SUPABASE_URL}`);
  if (ORG_ID) console.log(`Filter: organization_id = ${ORG_ID}`);
  console.log('');

  let query = supabase
    .from('subscriptions')
    .select(
      'id, organization_id, stripe_subscription_id, current_period_start, current_period_end, stripe_subscription_status'
    )
    .not('stripe_subscription_id', 'is', null);
  if (ORG_ID) query = query.eq('organization_id', ORG_ID);

  const { data: subs, error } = await query;
  if (error) fail(`Failed to read subscriptions: ${error.message}`);
  if (!subs || subs.length === 0) {
    console.log('No subscriptions with a Stripe id found.');
    return;
  }
  if (subs.length === 1000) {
    console.warn('⚠️  Exactly 1000 rows returned — there may be more (Supabase page cap). Use --org or paginate.');
  }

  console.log(`Found ${subs.length} subscription(s) with a Stripe id.\n`);

  let updated = 0;
  let unchanged = 0;
  let errors = 0;

  for (const sub of subs) {
    const label = `${sub.organization_id} (${sub.stripe_subscription_id})`;

    let stripeSub;
    try {
      stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
    } catch (err) {
      errors++;
      console.log(`  ⚠️  ${label}: retrieve failed — ${err.message}`);
      continue;
    }

    const newStart = toISO(stripeSub.current_period_start);
    const newEnd = toISO(stripeSub.current_period_end);
    const newStatus = stripeSub.status.charAt(0).toUpperCase() + stripeSub.status.slice(1);

    if (!newEnd) {
      console.log(`  ⚠️  ${label}: Stripe returned no current_period_end (status ${stripeSub.status}); skipping.`);
      continue;
    }

    const changed = newStart !== sub.current_period_start || newEnd !== sub.current_period_end;
    if (!changed) {
      unchanged++;
      continue;
    }

    console.log(`  ${APPLY ? '✏️ ' : '•'} ${label}`);
    console.log(`       period_start: ${sub.current_period_start || '(null)'}  →  ${newStart}`);
    console.log(`       period_end:   ${sub.current_period_end || '(null)'}  →  ${newEnd}`);

    if (APPLY) {
      const { error: upErr } = await supabase
        .from('subscriptions')
        .update({
          current_period_start: newStart,
          current_period_end: newEnd,
          stripe_subscription_status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sub.id);
      if (upErr) {
        errors++;
        console.log(`       ❌ update failed: ${upErr.message}`);
        continue;
      }
    }
    updated++;
  }

  console.log('\n──────────────────────────────────────');
  console.log(`  ${APPLY ? 'Updated' : 'Would update'}: ${updated}`);
  console.log(`  Unchanged:        ${unchanged}`);
  console.log(`  Errors:           ${errors}`);
  console.log('──────────────────────────────────────');
  if (!APPLY && updated > 0) console.log('\nRe-run with --apply to write these changes.\n');
}

main().catch((err) => fail(err.stack || err.message));
