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

LINERA_TMP_DIR="${LINERA_TMP_DIR:-$ROOT_DIR/.linera-conway}"
export LINERA_NETWORK="$LINERA_TMP_DIR/network.json"
export LINERA_FAUCET_URL="https://faucet.testnet-conway.linera.net/"
export LINERA_WALLET="$LINERA_TMP_DIR/wallet.json"
export LINERA_KEYSTORE="$LINERA_TMP_DIR/keystore.json"
export LINERA_STORAGE="rocksdb:$LINERA_TMP_DIR/client.db"

# Set a more lenient grace period (2s instead of 500ms) to handle clock skew
export LINERA_GRACE_PERIOD_MS="${LINERA_GRACE_PERIOD_MS:-2000}"

# Workaround: Set clock back 1 second to avoid "timestamp in future" errors
# This compensates for the latency between block creation and validator processing
if command -v faketime >/dev/null 2>&1; then
  echo "Using faketime to adjust clock by -1s for operations"
  export LINERA_FAKETIME="-1s"
fi

echo "Using temp dir: $LINERA_TMP_DIR"
mkdir -p "$LINERA_TMP_DIR"

# Check system clock against faucet to detect timestamp issues
echo "Checking system clock synchronization..."
FAUCET_TIME=$(curl -sI https://faucet.testnet-conway.linera.net | grep -i '^date:' | cut -d' ' -f2- | xargs -I {} date -d "{}" +%s 2>/dev/null || echo "0")
LOCAL_TIME=$(date +%s)
if [ "$FAUCET_TIME" != "0" ]; then
  TIME_DIFF=$((LOCAL_TIME - FAUCET_TIME))
  TIME_DIFF_ABS=${TIME_DIFF#-}
  
  # Warn if more than 5 minutes off
  if [ "$TIME_DIFF_ABS" -gt 300 ]; then
    echo "WARNING: Your system clock is ${TIME_DIFF}s off from the faucet server."
    echo "This may cause timestamp validation errors. Consider syncing your clock:"
    echo "  sudo ntpdate -s time.nist.gov"
    echo "  or: sudo timedatectl set-ntp true"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      exit 1
    fi
  # Even a small offset can cause issues with block timestamps
  elif [ "$TIME_DIFF" -gt 1 ] || [ "$TIME_DIFF" -lt -1 ]; then
    echo "Clock offset detected: ${TIME_DIFF}s (local is ahead of server)"
    echo "Adding 1s delay before operations to avoid timestamp issues..."
    sleep 1
  else
    echo "Clock sync OK (diff: ${TIME_DIFF}s)"
  fi
fi

curl -sS https://faucet.testnet-conway.linera.net/network.json -o "$LINERA_NETWORK"

# Grab default chain id from wallet show
get_default_chain() {
  linera wallet show | awk '/Chain ID:/ {cid=$3} /Tags:/ && /DEFAULT/ {print cid; exit}'
}

get_default_owner() {
  linera wallet show | awk '/Default owner:/ {print $3; exit}'
}

if [ ! -f "$LINERA_WALLET" ]; then
  echo "Initializing new wallet..."
  if ! linera wallet init --faucet "$LINERA_FAUCET_URL"; then
    echo "ERROR: Failed to initialize wallet. Check your clock sync and network connection."
    exit 1
  fi
  echo "Requesting chain from faucet (this may take 30-60 seconds)..."
  if ! linera wallet request-chain --faucet "$LINERA_FAUCET_URL" >/dev/null; then
    echo "ERROR: Failed to request chain. Possible causes:"
    echo "  - System clock is out of sync (check timestamp above)"
    echo "  - Network connectivity issues"
    echo "  - Faucet is temporarily unavailable"
    exit 1
  fi
else
  echo "Reusing existing wallet at $LINERA_WALLET"
fi
CHAIN_ID="$(get_default_chain)"
OWNER_ID="$(get_default_owner)"
echo "CHAIN_ID=$CHAIN_ID"
echo "OWNER_ID=$OWNER_ID"

echo "Building Wasm..."
(cd "$ROOT_DIR" && cargo build --release --target wasm32-unknown-unknown)

echo "Publishing module (may take 2-3 attempts due to timestamp sync)..."
MODULE_ID=""
for attempt in 1 2 3 4 5; do
  echo "Publish attempt $attempt..."
  if MODULE_ID="$(linera publish-module "$ROOT_DIR/target/wasm32-unknown-unknown/release/ticketing_contract.wasm" "$ROOT_DIR/target/wasm32-unknown-unknown/release/ticketing_service.wasm" 2>&1 | tee /tmp/linera_publish.log)" && [ -n "$MODULE_ID" ]; then
    # Extract just the module ID (last line that looks like a hash)
    MODULE_ID=$(echo "$MODULE_ID" | grep -oP '[a-f0-9]{128,}' | tail -1)
    if [ -n "$MODULE_ID" ]; then
      echo "MODULE_ID=$MODULE_ID"
      break
    fi
  fi
  
  if grep -q "timestamp.*future\|grace period" /tmp/linera_publish.log 2>/dev/null; then
    echo "Timestamp error, waiting 3s before retry..."
    sleep 3
    if [ $attempt -eq 5 ]; then
      echo "ERROR: Failed after 5 attempts due to timestamp sync issues"
      cat /tmp/linera_publish.log | tail -20
      exit 1
    fi
  elif [ $attempt -eq 5 ]; then
    echo "ERROR: Module publish failed"
    cat /tmp/linera_publish.log | tail -20
    exit 1
  else
    sleep 2
  fi
done

echo "Creating application..."
APP_ID=""
for attempt in 1 2 3; do
  echo "Create app attempt $attempt..."
  if APP_ID="$(linera create-application "$MODULE_ID" --json-argument 'null' 2>&1 | tee /tmp/linera_create.log)" && [ -n "$APP_ID" ]; then
    # Extract just the app ID
    APP_ID=$(echo "$APP_ID" | grep -oP '[a-f0-9]{64}' | tail -1)
    if [ -n "$APP_ID" ]; then
      echo "APP_ID=$APP_ID"
      break
    fi
  fi
  
  if grep -q "timestamp.*future\|grace period" /tmp/linera_create.log 2>/dev/null; then
    echo "Timestamp error, waiting 3s before retry..."
    sleep 3
  fi
  
  if [ $attempt -eq 3 ]; then
    echo "ERROR: App creation failed"
    cat /tmp/linera_create.log | tail -20
    exit 1
  fi
done

echo "Starting linera service on port $SERVICE_PORT ..."
# Note: The service needs access to the keystore to propose blocks
LINERA_KEYSTORE="$LINERA_KEYSTORE" linera service --port "$SERVICE_PORT" >"$LINERA_TMP_DIR/service.log" 2>&1 &
SERVICE_PID=$!

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
VITE_OWNER_ID=$OWNER_ID
EOF

# VITE_SERVICE_URL="$APP_URL" VITE_APP_ID="$APP_ID" VITE_CHAIN_ID="$CHAIN_ID" npm run dev -- --host --port "$DEV_PORT"
echo "Setup complete. Environment variables written to web-client/.env.local"
