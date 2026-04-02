#!/usr/bin/env bash
# Reads .env and saves secrets to 1Password.
# Run this when you rotate a key and want to update the stored value.
# Requires: 1Password CLI (op) — https://developer.1password.com/docs/cli/get-started/
# Run once to authenticate: op signin
#
# SECURE NOTE: The 1Password item is a Secure Note. The ANTHROPIC_API_KEY is expected
# to be stored as a custom password field named "ANTHROPIC_API_KEY".
# To verify field names: op item get "profile-optimizer" --vault Personal --format json

set -euo pipefail

ENV_FILE="$(dirname "$0")/../.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: .env not found at $ENV_FILE"
  exit 1
fi

ANTHROPIC_API_KEY=$(grep '^ANTHROPIC_API_KEY=' "$ENV_FILE" | cut -d '=' -f2-)

if [ -z "$ANTHROPIC_API_KEY" ] || [ "$ANTHROPIC_API_KEY" = "your_api_key_here" ]; then
  echo "Error: ANTHROPIC_API_KEY is empty or still set to the placeholder value"
  exit 1
fi

ITEM_TITLE="Profile-Optimizer"

if op item get "$ITEM_TITLE" --vault Personal &>/dev/null; then
  echo "Updating existing 1Password item: $ITEM_TITLE"
  # Key is stored as the note body (notesPlain)
  op item edit "$ITEM_TITLE" \
    --vault Personal \
    "notesPlain=$ANTHROPIC_API_KEY"
else
  echo "Creating new 1Password item: $ITEM_TITLE"
  op item create \
    --category "Secure Note" \
    --title "$ITEM_TITLE" \
    --vault Personal \
    "notesPlain=$ANTHROPIC_API_KEY"
fi

echo "Done. Keys saved to 1Password > Personal > $ITEM_TITLE"
