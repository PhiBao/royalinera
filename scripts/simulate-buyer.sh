#!/usr/bin/env bash
# Simulate a different buyer purchasing tickets
set -euo pipefail

CHAIN_ID="359b32bf632e6724a2ca41fb446017dbf834edd31073d8d61b7d66f9560c87aa"
APP_ID="d60f9a84ab1844cd8acb2133adcba33e7aa065e9c5b05179917d7ba4021395bf"
SERVICE_URL="http://localhost:8085/chains/$CHAIN_ID/applications/$APP_ID"

# Different buyer accounts for testing
BUYER1="0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
BUYER2="0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
BUYER3="0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"

echo "🛒 Simulate Ticket Purchase as Different Buyer"
echo "=============================================="
echo ""

# Check if service is running
if ! curl -s http://localhost:8085 >/dev/null 2>&1; then
  echo "❌ Service not running on port 8085"
  exit 1
fi

# Get active listings
echo "📋 Fetching active marketplace listings..."
LISTINGS=$(curl -s -X POST "$SERVICE_URL" \
  -H "Content-Type: application/json" \
  -d '{"query":"query { listings }"}' | jq -r '.data.listings')

if [ "$LISTINGS" = "{}" ] || [ "$LISTINGS" = "null" ]; then
  echo "❌ No active listings found!"
  echo ""
  echo "To create a listing:"
  echo "  1. Go to My Tickets page"
  echo "  2. Click 'Sell' on a ticket"
  echo "  3. Enter a price and confirm"
  exit 1
fi

echo "✅ Found active listings:"
echo "$LISTINGS" | jq 'to_entries[] | {ticket_id: .key, price: .value.price, seller: .value.seller}'
echo ""

# Get the first active listing
TICKET_ID=$(echo "$LISTINGS" | jq -r 'to_entries[0].key')
PRICE=$(echo "$LISTINGS" | jq -r 'to_entries[0].value.price')
SELLER=$(echo "$LISTINGS" | jq -r 'to_entries[0].value.seller')

if [ "$TICKET_ID" = "null" ]; then
  echo "❌ No valid ticket found"
  exit 1
fi

echo "🎫 Selected Ticket:"
echo "   ID: $TICKET_ID"
echo "   Price: $PRICE tokens"
echo "   Seller: $SELLER"
echo ""

# Choose buyer (use argument or default to BUYER1)
BUYER="${1:-$BUYER1}"

echo "👤 Buyer Account: $BUYER"
echo ""
echo "💰 Purchasing ticket..."
echo ""

# Execute purchase
RESULT=$(curl -s -X POST "$SERVICE_URL" \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"mutation { buyListing(buyer: { chainId: \\\"$CHAIN_ID\\\", owner: \\\"$BUYER\\\" }, ticketId: \\\"$TICKET_ID\\\", price: \\\"$PRICE\\\") }\"}")

echo "📤 Result:"
echo "$RESULT" | jq .

# Check if successful
if echo "$RESULT" | jq -e '.data.buyListing' >/dev/null 2>&1; then
  echo ""
  echo "✅ Purchase successful!"
  echo ""
  echo "🔍 Verifying new owner..."
  NEW_OWNER=$(curl -s -X POST "$SERVICE_URL" \
    -H "Content-Type: application/json" \
    -d "{\"query\":\"query { ticket(ticketId: \\\"$TICKET_ID\\\") { owner } }\"}" | jq -r '.data.ticket.owner')
  
  echo "   New Owner: $NEW_OWNER"
  
  if [ "$NEW_OWNER" = "$BUYER" ]; then
    echo "   ✅ Ownership transferred successfully!"
  else
    echo "   ⚠️  Owner mismatch - check transaction"
  fi
else
  echo ""
  echo "❌ Purchase failed!"
  ERROR=$(echo "$RESULT" | jq -r '.errors[0].message // "Unknown error"')
  echo "   Error: $ERROR"
fi

echo ""
echo "💡 Tip: Refresh the Marketplace page in your browser to see the update"
