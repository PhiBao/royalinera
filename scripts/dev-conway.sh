#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICE_PORT="${SERVICE_PORT:-8085}"
DEV_PORT="${DEV_PORT:-4173}"

if ! command -v linera >/dev/null 2>&1; then
  echo "linera binary not found. Build it: (cd $ROOT_DIR/linera-protocol && cargo build --release -p linera -p linera-service)"
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm not found; install Node/npm first."
  exit 1
fi

LINERA_TMP_DIR="${LINERA_TMP_DIR:-$(mktemp -d)}"
export LINERA_NETWORK="$LINERA_TMP_DIR/network.json"
export LINERA_FAUCET_URL="https://faucet.testnet-conway.linera.net/"
export LINERA_WALLET="$LINERA_TMP_DIR/wallet.json"
export LINERA_KEYSTORE="$LINERA_TMP_DIR/keystore.json"
export LINERA_STORAGE="rocksdb:$LINERA_TMP_DIR/client.db"

echo "Using temp dir: $LINERA_TMP_DIR"
curl -sS https://faucet.testnet-conway.linera.net/network.json -o "$LINERA_NETWORK"

# Grab default chain id from wallet show
get_default_chain() {
  linera wallet show | awk '/Chain ID:/ {cid=$3} /Tags:/ && /DEFAULT/ {print cid; exit}'
}

get_default_owner() {
  linera wallet show | awk '/Default owner:/ {print $3; exit}'
}

if [ ! -f "$LINERA_WALLET" ]; then
  linera wallet init --faucet "$LINERA_FAUCET_URL"
  linera wallet request-chain --faucet "$LINERA_FAUCET_URL" >/dev/null
else
  echo "Reusing existing wallet at $LINERA_WALLET"
fi
CHAIN_ID="$(get_default_chain)"
OWNER_ID="$(get_default_owner)"
echo "CHAIN_ID=$CHAIN_ID"
echo "OWNER_ID=$OWNER_ID"

echo "Building Wasm..."
(cd "$ROOT_DIR" && cargo build --release --target wasm32-unknown-unknown)

echo "Publishing module..."
MODULE_ID="$(linera publish-module "$ROOT_DIR/target/wasm32-unknown-unknown/release/ticketing_contract.wasm" "$ROOT_DIR/target/wasm32-unknown-unknown/release/ticketing_service.wasm")"
echo "MODULE_ID=$MODULE_ID"

echo "Creating application..."
APP_ID="$(linera create-application "$MODULE_ID" --json-argument 'null')"
echo "APP_ID=$APP_ID"

echo "Starting linera service on port $SERVICE_PORT ..."
linera service --port "$SERVICE_PORT" >"$LINERA_TMP_DIR/service.log" 2>&1 &
SERVICE_PID=$!
trap 'kill $SERVICE_PID' EXIT

echo "Service log: $LINERA_TMP_DIR/service.log"
APP_URL="http://localhost:$SERVICE_PORT/chains/$CHAIN_ID/applications/$APP_ID"
echo "Per-app URL: $APP_URL"
echo "APP_ID: $APP_ID"
echo "CHAIN_ID: $CHAIN_ID"

cd "$ROOT_DIR/web-client"
npm install
cat > .env.local <<EOF
VITE_SERVICE_URL=$APP_URL
VITE_APP_ID=$APP_ID
VITE_CHAIN_ID=$CHAIN_ID
EOF

VITE_SERVICE_URL="$APP_URL" VITE_APP_ID="$APP_ID" VITE_CHAIN_ID="$CHAIN_ID" npm run dev -- --host --port "$DEV_PORT"
