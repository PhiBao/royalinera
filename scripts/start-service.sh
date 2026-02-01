#!/usr/bin/env bash
set -euo pipefail

# Start Linera service on marketplace chain for hub operations

SERVICE_PORT="${SERVICE_PORT:-8080}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Load environment variables from .env files
ENV_FILE="$ROOT_DIR/web-client/.env"
ENV_LOCAL_FILE="$ROOT_DIR/web-client/.env.local"

# Function to extract value from env file
get_env_value() {
    local file=$1
    local key=$2
    if [ -f "$file" ]; then
        grep "^${key}=" "$file" | cut -d '=' -f2- | tr -d '"' | tr -d "'"
    fi
}

# Try .env.local first (overrides .env), then fall back to .env
MARKETPLACE_CHAIN=$(get_env_value "$ENV_LOCAL_FILE" "VITE_MARKETPLACE_CHAIN_ID")
if [ -z "$MARKETPLACE_CHAIN" ]; then
    MARKETPLACE_CHAIN=$(get_env_value "$ENV_FILE" "VITE_MARKETPLACE_CHAIN_ID")
fi

if [ -z "$MARKETPLACE_CHAIN" ]; then
    echo "❌ Error: VITE_MARKETPLACE_CHAIN_ID not found in .env or .env.local"
    echo "   Please set it in web-client/.env"
    exit 1
fi

echo "🚀 Starting Linera service..."
echo "   Port: $SERVICE_PORT"
echo "   Marketplace Chain: $MARKETPLACE_CHAIN"
echo "   (from: $([ -f "$ENV_LOCAL_FILE" ] && echo ".env.local" || echo ".env"))"
echo ""

# Set marketplace chain as default
echo "Setting marketplace chain as default..."
linera wallet set-default "$MARKETPLACE_CHAIN"
echo "✅ Default chain set"
echo ""

# Start service (uses default chain from wallet)
echo "Starting service on port $SERVICE_PORT..."
linera service --port $SERVICE_PORT

# Note: Service will run on the default chain (marketplace chain)
# This is where all events/tickets are stored
