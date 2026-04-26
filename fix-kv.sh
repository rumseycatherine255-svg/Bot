#!/usr/bin/env bash
set -e

echo "📦 Creating Cloudflare KV namespace: COMET_KV..."

OUTPUT=$(wrangler kv namespace create COMET_KV)

echo "$OUTPUT"

# Extract KV ID from output
ID=$(echo "$OUTPUT" | grep -oE 'id = "[^"]+"' | cut -d'"' -f2)

if [ -z "$ID" ]; then
  echo "❌ Failed to extract KV namespace ID"
  exit 1
fi

echo "✅ KV ID found: $ID"

# Replace placeholder in wrangler.toml
if grep -q "REPLACE_WITH_YOUR_KV_ID" wrangler.toml; then
  sed -i.bak "s/REPLACE_WITH_YOUR_KV_ID/$ID/g" wrangler.toml
  echo "✏️ Updated wrangler.toml"
else
  echo "⚠️ Placeholder not found in wrangler.toml"
fi

echo "🚀 Done. You can now run: wrangler deploy"
