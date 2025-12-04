#!/usr/bin/env bash
# Quick marketplace test script
set -euo pipefail

CHAIN_ID="359b32bf632e6724a2ca41fb446017dbf834edd31073d8d61b7d66f9560c87aa"
APP_ID="d60f9a84ab1844cd8acb2133adcba33e7aa065e9c5b05179917d7ba4021395bf"
OWNER_ID="0xd076593ce080dedf0cddb4afe5b4c2c9d8058dc7c3004d3b623fcfa8931cdd26"
SERVICE_URL="http://localhost:8085/chains/$CHAIN_ID/applications/$APP_ID"

echo "🎫 Royalinera Marketplace Test Script"
echo "======================================"
echo ""

# Check if service is running
if ! curl -s http://localhost:8085 >/dev/null 2>&1; then
  echo "❌ Service not running on port 8085"
  echo "Run: bash scripts/dev-conway.sh"
  exit 1
fi

echo "✅ Service is running"
echo ""

# Function to make GraphQL request
gql() {
  curl -s -X POST "$SERVICE_URL" \
    -H "Content-Type: application/json" \
    -d "{\"query\":\"$1\"}" | jq .
}

case "${1:-help}" in
  "create-event")
    echo "📅 Creating test event..."
    gql "mutation { createEvent(organizer: \"$OWNER_ID\", eventId: \"test-$(date +%s)\", name: \"Test Concert\", description: \"Test event\", venue: \"Test Venue\", startTime: 1764882180, royaltyBps: 500, maxTickets: 100) }"
    ;;
    
  "mint-ticket")
    EVENT_ID="${2:-test}"
    echo "🎟️  Minting ticket for event: $EVENT_ID"
    gql "mutation { mintTicket(organizer: \"$OWNER_ID\", eventId: \"$EVENT_ID\", seat: \"A${RANDOM}\", blobHash: \"0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000\") }"
    ;;
    
  "list-events")
    echo "📋 All Events:"
    gql "query { events }"
    ;;
    
  "my-tickets")
    echo "🎫 Your Tickets:"
    gql "query { ownedTicketIds(owner: \"$OWNER_ID\") }"
    ;;
    
  "list-ticket")
    TICKET_ID="${2}"
    PRICE="${3:-100}"
    if [ -z "$TICKET_ID" ]; then
      echo "Usage: $0 list-ticket <ticket-id> [price]"
      exit 1
    fi
    echo "💰 Listing ticket $TICKET_ID for $PRICE tokens..."
    gql "mutation { createListing(seller: \"$OWNER_ID\", ticketId: \"$TICKET_ID\", price: \"$PRICE\") }"
    ;;
    
  "cancel-listing")
    TICKET_ID="${2}"
    if [ -z "$TICKET_ID" ]; then
      echo "Usage: $0 cancel-listing <ticket-id>"
      exit 1
    fi
    echo "❌ Cancelling listing for ticket $TICKET_ID..."
    gql "mutation { cancelListing(seller: \"$OWNER_ID\", ticketId: \"$TICKET_ID\") }"
    ;;
    
  "marketplace")
    echo "🏪 Active Marketplace Listings:"
    gql "query { listings }"
    ;;
    
  "buy-ticket")
    TICKET_ID="${2}"
    PRICE="${3}"
    BUYER="${4:-0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef}"
    if [ -z "$TICKET_ID" ] || [ -z "$PRICE" ]; then
      echo "Usage: $0 buy-ticket <ticket-id> <price> [buyer-owner]"
      exit 1
    fi
    echo "🛒 Buying ticket $TICKET_ID for $PRICE tokens..."
    echo "   Buyer: $BUYER"
    gql "mutation { buyListing(buyer: { chainId: \"$CHAIN_ID\", owner: \"$BUYER\" }, ticketId: \"$TICKET_ID\", price: \"$PRICE\") }"
    ;;
    
  "transfer-ticket")
    TICKET_ID="${2}"
    RECIPIENT="${3:-0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba}"
    if [ -z "$TICKET_ID" ]; then
      echo "Usage: $0 transfer-ticket <ticket-id> [recipient-owner]"
      exit 1
    fi
    echo "📤 Transferring ticket $TICKET_ID to $RECIPIENT..."
    gql "mutation { transferTicket(seller: \"$OWNER_ID\", ticketId: \"$TICKET_ID\", buyerAccount: { chainId: \"$CHAIN_ID\", owner: \"$RECIPIENT\" }, salePrice: null) }"
    ;;
    
  "full-test")
    echo "🧪 Running full marketplace test..."
    echo ""
    
    echo "1️⃣  Creating event..."
    EVENT_ID="fulltest-$(date +%s)"
    gql "mutation { createEvent(organizer: \"$OWNER_ID\", eventId: \"$EVENT_ID\", name: \"Full Test Event\", description: \"Complete marketplace test\", venue: \"Test Arena\", startTime: 1764882180, royaltyBps: 500, maxTickets: 10) }"
    sleep 2
    
    echo ""
    echo "2️⃣  Minting ticket..."
    RESULT=$(gql "mutation { mintTicket(organizer: \"$OWNER_ID\", eventId: \"$EVENT_ID\", seat: \"VIP-1\", blobHash: \"0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000\") }")
    echo "$RESULT"
    sleep 2
    
    echo ""
    echo "3️⃣  Getting ticket ID..."
    TICKET_ID=$(gql "query { ownedTicketIds(owner: \"$OWNER_ID\") }" | jq -r '.data.ownedTicketIds[-1]')
    echo "   Ticket ID: $TICKET_ID"
    sleep 1
    
    echo ""
    echo "4️⃣  Listing ticket for 150 tokens..."
    gql "mutation { createListing(seller: \"$OWNER_ID\", ticketId: \"$TICKET_ID\", price: \"150\") }"
    sleep 2
    
    echo ""
    echo "5️⃣  Checking marketplace..."
    gql "query { listings }" | jq '.data.listings'
    sleep 1
    
    echo ""
    echo "6️⃣  Buying ticket as different user..."
    BUYER="0xaabbccdd00112233aabbccdd00112233aabbccdd00112233aabbccdd00112233"
    gql "mutation { buyListing(buyer: { chainId: \"$CHAIN_ID\", owner: \"$BUYER\" }, ticketId: \"$TICKET_ID\", price: \"150\") }"
    sleep 2
    
    echo ""
    echo "7️⃣  Verifying new owner..."
    gql "query { ticket(ticketId: \"$TICKET_ID\") { owner } }" | jq '.data.ticket.owner'
    
    echo ""
    echo "✅ Full test complete!"
    ;;
    
  *)
    echo "Usage: $0 <command> [args]"
    echo ""
    echo "Commands:"
    echo "  create-event                     - Create a test event"
    echo "  mint-ticket <event-id>           - Mint a ticket for an event"
    echo "  list-events                      - Show all events"
    echo "  my-tickets                       - Show your tickets"
    echo "  list-ticket <id> [price]         - List a ticket for sale"
    echo "  cancel-listing <id>              - Cancel a listing"
    echo "  marketplace                      - Show all active listings"
    echo "  buy-ticket <id> <price> [buyer]  - Buy a ticket (as another user)"
    echo "  transfer-ticket <id> [recipient] - Transfer a ticket"
    echo "  full-test                        - Run complete marketplace test"
    echo ""
    echo "Examples:"
    echo "  $0 create-event"
    echo "  $0 mint-ticket test"
    echo "  $0 my-tickets"
    echo "  $0 list-ticket abc123... 100"
    echo "  $0 marketplace"
    echo "  $0 full-test"
    ;;
esac
