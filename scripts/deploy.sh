#!/usr/bin/env bash
set -euo pipefail

# Linera Ticketing App Deployment Script
# Usage: ./scripts/deploy.sh [--clean] [--start]
#   --clean  Delete existing wallet and start fresh
#   --start  Start linera service after deployment

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVICE_PORT="${SERVICE_PORT:-8080}"
FAUCET_URL="https://faucet.testnet-conway.linera.net"
WALLET_DIR="$HOME/.config/linera"

echo "=========================================="
echo "  Linera Ticketing App Deployment"
echo "=========================================="

# Check for --clean flag
if [[ "${1:-}" == "--clean" ]]; then
    echo ""
    echo "🧹 Cleaning existing wallet..."
    rm -rf "$WALLET_DIR"
    echo "   Wallet directory deleted: $WALLET_DIR"
fi

# Check prerequisites
if ! command -v linera >/dev/null 2>&1; then
    echo "ERROR: linera binary not found."
    echo "Install from: https://github.com/linera-io/linera-protocol"
    exit 1
fi

# Step 1: Initialize wallet if needed
echo ""
echo "[1/5] Initializing wallet..."
if [ ! -d "$WALLET_DIR" ] || [ ! -f "$WALLET_DIR/wallet.json" ]; then
    echo "   Creating new wallet from faucet..."
    linera wallet init --faucet "$FAUCET_URL"
    echo "   Requesting chain with owner key..."
    linera wallet request-chain --faucet "$FAUCET_URL" --set-default
    echo "   ✅ Wallet initialized with new chain!"
else
    # Check if existing wallet has a chain with owner key
    if ! linera wallet show 2>&1 | grep -q "Default owner:.*0x"; then
        echo "   Existing wallet has no chain with owner key."
        echo "   Requesting new chain..."
        linera wallet request-chain --faucet "$FAUCET_URL" --set-default
        echo "   ✅ New chain added!"
    else
        echo "   ✅ Wallet already exists at $WALLET_DIR"
        echo "   (Use --clean flag to reset)"
    fi
fi

# Step 2: Get chain info
echo ""
echo "[2/5] Getting chain info..."

# Get wallet output
WALLET_OUTPUT=$(linera wallet show 2>&1)

# Find chain with owner key (has "0x" in Default owner line)
CHAIN_ID=$(echo "$WALLET_OUTPUT" | grep -B5 "Default owner:.*0x" | grep "Chain ID:" | head -1 | awk '{print $3}')
OWNER_ID=$(echo "$WALLET_OUTPUT" | grep "Default owner:.*0x" | head -1 | awk '{print $3}')

if [ -z "$CHAIN_ID" ]; then
    echo "   ❌ ERROR: No chain with owner key found in wallet."
    echo ""
    echo "   Wallet output:"
    echo "$WALLET_OUTPUT"
    echo ""
    echo "   Try: ./scripts/deploy.sh --clean"
    exit 1
fi

echo "   ✅ Chain ID: $CHAIN_ID"
echo "   ✅ Owner ID: ${OWNER_ID:-none}"

# Step 3: Set default chain
echo ""
echo "[3/5] Setting default chain..."
linera wallet set-default "$CHAIN_ID" 2>/dev/null || true
echo "   ✅ Default chain set"

# Step 4: Build WASM
echo ""
echo "[4/5] Building WASM contracts..."
cd "$ROOT_DIR"
cargo build --release --target wasm32-unknown-unknown

# Check files exist
CONTRACT_WASM="$ROOT_DIR/target/wasm32-unknown-unknown/release/ticketing_contract.wasm"
SERVICE_WASM="$ROOT_DIR/target/wasm32-unknown-unknown/release/ticketing_service.wasm"

if [ ! -f "$CONTRACT_WASM" ]; then
    echo "   ❌ ERROR: Contract WASM not found: $CONTRACT_WASM"
    echo ""
    echo "   Available .wasm files:"
    ls -la "$ROOT_DIR/target/wasm32-unknown-unknown/release/"*.wasm 2>/dev/null || echo "   None found"
    exit 1
fi

if [ ! -f "$SERVICE_WASM" ]; then
    echo "   ❌ ERROR: Service WASM not found: $SERVICE_WASM"
    exit 1
fi

echo "   ✅ Contract: $(basename $CONTRACT_WASM)"
echo "   ✅ Service:  $(basename $SERVICE_WASM)"

# Step 5: Publish and create application
echo ""
echo "[5/5] Publishing and creating application..."
echo "   This may take 30-60 seconds..."

# Try publish-and-create with retries
MAX_RETRIES=3
RETRY_COUNT=0
APP_ID=""

# Prepare JSON parameters (marketplace_chain = this hub chain)
JSON_PARAMS="{\"marketplace_chain\":\"$CHAIN_ID\"}"
echo "   Parameters: $JSON_PARAMS"

while [ $RETRY_COUNT -lt $MAX_RETRIES ] && [ -z "$APP_ID" ]; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "   Attempt $RETRY_COUNT/$MAX_RETRIES..."
    
    OUTPUT=$(linera publish-and-create "$CONTRACT_WASM" "$SERVICE_WASM" --json-parameters "$JSON_PARAMS" 2>&1) && {
        # Try to extract App ID from output
        APP_ID=$(echo "$OUTPUT" | grep -oE '[a-f0-9]{64}' | tail -1 || true)
        
        if [ -n "$APP_ID" ]; then
            echo "   ✅ Application created!"
            break
        fi
    }
    
    # Check for specific errors
    if echo "$OUTPUT" | grep -q "not configured to propose"; then
        echo "   ❌ ERROR: Not configured to propose on this chain."
        echo "   Your wallet doesn't have ownership of the chain."
        echo ""
        echo "   Fix: ./scripts/deploy.sh --clean"
        exit 1
    fi
    
    if echo "$OUTPUT" | grep -q "timestamp"; then
        echo "   ⚠️  Timestamp sync issue, retrying in 3s..."
        sleep 3
    else
        echo "   ⚠️  Attempt failed, retrying in 2s..."
        sleep 2
    fi
done

if [ -z "$APP_ID" ]; then
    echo "   ❌ ERROR: Failed to publish application after $MAX_RETRIES attempts."
    echo ""
    echo "   Last output:"
    echo "$OUTPUT" | tail -20
    echo ""
    echo "   Common fixes:"
    echo "   1. Reset wallet: ./scripts/deploy.sh --clean"
    echo "   2. Check network: curl -s $FAUCET_URL/version"
    echo "   3. Sync clock: sudo ntpdate -s time.nist.gov"
    exit 1
fi

echo ""
echo "=========================================="
echo "  ✅ Deployment Successful!"
echo "=========================================="
echo ""
echo "  Chain ID: $CHAIN_ID"
echo "  App ID:   $APP_ID"
echo "  Owner:    ${OWNER_ID:-unknown}"
echo ""

# Update frontend .env.local
ENV_FILE="$ROOT_DIR/web-client/.env.local"
cat > "$ENV_FILE" <<EOF
VITE_LINERA_FAUCET_URL=https://faucet.testnet-conway.linera.net
# Deployed: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
VITE_LINERA_APPLICATION_ID=$APP_ID
VITE_MARKETPLACE_CHAIN_ID=$CHAIN_ID
# Hub node service URL — set to your linera-service endpoint for marketplace reads.
# Start with: linera service --port 8080
# Then set: VITE_HUB_NODE_URL=http://localhost:8080
VITE_HUB_NODE_URL=
EOF
echo "  📝 Frontend config: $ENV_FILE"

echo ""
echo "=========================================="
echo "  Next Steps"
echo "=========================================="
echo ""
echo "  1. Start Linera service on marketplace chain:"
echo "     ./scripts/start-service.sh"
echo "     (or manually: linera service --port $SERVICE_PORT)"
echo ""
echo "  2. Start frontend (new terminal):"
echo "     cd web-client && npm run dev -- --host 0.0.0.0"
echo ""
echo "  3. Open browser:"
echo "     http://localhost:5173"
echo ""

# Step 6: Start Linera service (optional, with --start flag)
if [[ "${2:-}" == "--start" ]] || [[ "${1:-}" == "--start" ]]; then
    echo "[6/6] Starting Linera service on marketplace chain..."
    echo "   Setting default chain to: $CHAIN_ID"
    linera wallet set-default "$CHAIN_ID" 2>/dev/null || true
    echo "   Starting service on port $SERVICE_PORT..."
    linera service --port $SERVICE_PORT &
    LINERA_PID=$!
    echo "   ✅ Linera service started (PID: $LINERA_PID)"
    echo "   Service running at http://localhost:$SERVICE_PORT"
    echo "   Default chain: $CHAIN_ID"
    echo ""
    echo "   To stop: kill $LINERA_PID"
fi
