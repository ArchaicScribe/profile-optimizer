#!/usr/bin/env bash
# Reads secrets from 1Password and writes them to .env.
# Run this after cloning or when your .env is missing/stale.
# Requires: 1Password CLI (op) — https://developer.1password.com/docs/cli/get-started/
# Run once to authenticate: op signin

set -euo pipefail

ENV_FILE="$(dirname "$0")/../.env"
ITEM_TITLE="profile-optimizer"

echo "Fetching secrets from 1Password > Personal > $ITEM_TITLE..."

ANTHROPIC_API_KEY=$(op item get "$ITEM_TITLE" \
  --vault Personal \
  --fields "ANTHROPIC_API_KEY" \
  --reveal)

if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "Error: Could not retrieve ANTHROPIC_API_KEY from 1Password"
  exit 1
fi

# Preserve any existing .env values that aren't secrets (DATABASE_URL, etc.)
if [ -f "$ENV_FILE" ]; then
  # Remove the old key line so we can rewrite it cleanly
  grep -v '^ANTHROPIC_API_KEY=' "$ENV_FILE" > "$ENV_FILE.tmp" && mv "$ENV_FILE.tmp" "$ENV_FILE"
else
  # Seed defaults if .env doesn't exist yet
  echo 'DATABASE_URL="file:./dev.db"' > "$ENV_FILE"
  echo 'ENABLE_LINKEDIN_SCRAPER=false' >> "$ENV_FILE"
fi

echo "ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY" >> "$ENV_FILE"

echo "Done. .env updated with secrets from 1Password."
