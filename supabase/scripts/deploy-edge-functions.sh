#!/usr/bin/env bash
#
# Deploy all edge functions to a Supabase project and set their secrets.
#
#   ./supabase/scripts/deploy-edge-functions.sh <PROJECT_REF> [--secrets-only|--deploy-only]
#
# Uses --project-ref throughout, so it works without `supabase link` -- which
# matters when the target project lives in a different Supabase organisation.
#
# Deploys every directory under supabase/functions except _deprecated (which
# holds four retired subscription functions). Per-function verify_jwt settings
# come from supabase/config.toml automatically.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
FUNCTIONS_DIR="$REPO_ROOT/supabase/functions"
SECRETS_FILE="${SECRETS_FILE:-$REPO_ROOT/.env.functions}"

PROJECT_REF="${1:-}"
MODE="${2:-all}"

if [[ -z "$PROJECT_REF" ]]; then
  echo "usage: $0 <PROJECT_REF> [--secrets-only|--deploy-only]" >&2
  exit 1
fi

if ! command -v supabase >/dev/null 2>&1; then
  echo "error: supabase CLI not found on PATH" >&2
  exit 1
fi

echo "Target project: $PROJECT_REF"
read -r -p "Deploy to this project? [y/N] " confirm
[[ "$confirm" == "y" || "$confirm" == "Y" ]] || { echo "aborted"; exit 1; }

# --------------------------------------------------------------------------
# Secrets
# --------------------------------------------------------------------------
# SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY and SUPABASE_DB_URL
# are injected by the platform at runtime -- setting them manually is rejected.
if [[ "$MODE" != "--deploy-only" ]]; then
  if [[ ! -f "$SECRETS_FILE" ]]; then
    cat >&2 <<EOF
error: secrets file not found: $SECRETS_FILE

Create it from the template, fill in the values, then re-run:
    cp supabase/scripts/functions-secrets.example .env.functions

It is gitignored (.env*) -- do not commit it.
EOF
    exit 1
  fi
  echo
  echo "==> Setting secrets from $SECRETS_FILE"
  supabase secrets set --project-ref "$PROJECT_REF" --env-file "$SECRETS_FILE"
fi

# --------------------------------------------------------------------------
# Functions
# --------------------------------------------------------------------------
if [[ "$MODE" != "--secrets-only" ]]; then
  # macOS ships bash 3.2, which has no `mapfile` -- read into an array the
  # portable way. Plain string accumulation for failures too, since `set -u`
  # plus an empty array is another bash 3.2 landmine.
  FUNCS=()
  while IFS= read -r fn; do
    FUNCS+=("$fn")
  done < <(
    find "$FUNCTIONS_DIR" -mindepth 1 -maxdepth 1 -type d \
      ! -name '_deprecated' ! -name '_shared' -exec basename {} \; | sort
  )

  total=${#FUNCS[@]}
  echo
  echo "==> Deploying $total functions"

  failed_list=""
  failed_count=0
  for fn in "${FUNCS[@]}"; do
    printf '  %-42s' "$fn"
    if supabase functions deploy "$fn" --project-ref "$PROJECT_REF" >/tmp/deploy-"$fn".log 2>&1; then
      echo "ok"
    else
      echo "FAILED"
      failed_list="$failed_list $fn"
      failed_count=$((failed_count + 1))
    fi
  done

  echo
  if [ "$failed_count" -gt 0 ]; then
    echo "$failed_count of $total failed:"
    for fn in $failed_list; do
      echo "  - $fn   (see /tmp/deploy-$fn.log)"
    done
    exit 1
  fi
  echo "All $total functions deployed."
fi

cat <<EOF

Remaining manual steps -- these cannot be scripted:

  1. Stripe webhook endpoint
     Point a NEW endpoint at:
       https://$PROJECT_REF.supabase.co/functions/v1/stripe-webhook
     then put its signing secret in .env.functions as STRIPE_WEBHOOK_SECRET
     and re-run with --secrets-only.

  2. Google OAuth redirect URIs
     Add to the existing OAuth client (additive -- does not affect the old app):
       https://$PROJECT_REF.supabase.co/functions/v1/google-oauth-callback

  3. Vault secret for the cron jobs
     SELECT vault.create_secret('<service-role-key>', 'service_role_key');

  4. Auth settings
     export SITE_URL='https://qwohter.com'
     export RESEND_SMTP_PASSWORD='re_...'
     supabase config push --project-ref $PROJECT_REF
EOF
