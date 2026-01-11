# Changelog

All notable changes to the Ticketh ticketing dApp will be documented in this file.

## [Wave 4] - 2025-12-04

### Added
- **Core Ticketing Contract**
  - Event creation with royalty configuration (royalty_bps)
  - NFT ticket minting with unique seat assignments
  - Ticket metadata storage via blob hashes
  - Ownership tracking per account

- **Marketplace Features**
  - Create listing: Sellers can list tickets for sale
  - Buy listing: Buyers can purchase listed tickets
  - Cancel listing: Sellers can remove active listings
  - Listing status management (Active, Sold, Cancelled)

- **Cross-Chain Support**
  - Ticket transfers between Linera chains
  - Cross-chain claim mechanism
  - Message-based transfer protocol

- **Royalty System**
  - Automatic royalty calculation on secondary sales
  - Royalty distribution to event organizers
  - Balance tracking per organizer account

- **GraphQL Service**
  - Queries: events, event details, tickets, listings, owned tickets, royalty balances
  - Mutations: createEvent, mintTicket, transferTicket, createListing, buyListing, cancelListing
  - Real-time subscription support

- **Frontend Application (React + Vite)**
  - Events page: View all events and create new ones
  - My Tickets page: View owned tickets, transfer, and list for sale
  - Marketplace page: Browse and purchase listed tickets
  - Responsive UI with Tailwind CSS styling
  - Toast notifications for user feedback
  - Framer Motion animations

- **Development Tools**
  - `scripts/dev-conway.sh`: Automated Conway testnet deployment with retry logic
  - `scripts/test-marketplace.sh`: CLI testing tool for all marketplace operations
  - `scripts/simulate-buyer.sh`: Simulate multi-account purchase scenarios
  - Timestamp error retry mechanism (handles Conway validator clock sync)

### Technical Implementation
- **Linera SDK Features Used**:
  - `linera_sdk::Contract` for application logic
  - `linera_sdk::Service` for GraphQL API
  - Cross-chain messaging system
  - View-based state management with `linera_views`
  - Account-based ownership with `AccountOwner`
  - Data blob storage for NFT metadata

- **State Management**:
  - Events stored in `MapView<EventId, Event>`
  - Tickets stored in `MapView<TicketId, Ticket>`
  - Listings stored in `MapView<TicketId, Listing>`
  - Owned tickets indexed by owner in `MapView<AccountOwner, Set<TicketId>>`
  - Royalty balances tracked per organizer

### Testing
- Deployed successfully to Conway Testnet
- Module ID: `8cdb57b5f1e63f0e4c8aa3147da68d5d167ed66959d8eff5276d7c73b4bd42a1...`
- Application ID: `d60f9a84ab1844cd8acb2133adcba33e7aa065e9c5b05179917d7ba4021395bf`
- All mutations tested and working:
  - ✅ Event creation
  - ✅ Ticket minting
  - ✅ Ticket transfers
  - ✅ Marketplace listing
  - ✅ Listing cancellation
  - ✅ Listing purchase (via CLI simulation)

### Known Limitations
- Frontend currently uses single-account demo mode
- Multi-wallet support (MetaMask) planned for Wave 2
- Marketplace buying requires CLI simulation for multi-account testing

### Infrastructure
- Conway testnet deployment
- Service running on port 8085
- Frontend development server on port 4173
- Automatic retry logic for timestamp validation errors

---

## [Wave 5] - 2026-01-11

### Added
- **Multi-Wallet Support**
  - Multiple wallet accounts with easy switching
  - Connect/disconnect wallet UI in header
  - Wallet address display and account selector
  - Session-persistent wallet selection

- **Owner-Based Ticket Tracking**
  - Added `owner` field to Ticket struct (wallet address)
  - Added `seller` field to Listing struct
  - `ticketsByOwner` query for wallet-based lookups
  - Case-insensitive wallet address comparisons
  - Works with shared hub chain architecture

- **Hub-and-Spoke Architecture**
  - Marketplace hub chain stores all shared data (events, listings, tickets)
  - User chains can forward operations to hub
  - Stream-based event sync for real-time updates
  - `InitialStateSync` message for new chain subscription

- **Robust Retry Logic**
  - Automatic retry (5 attempts, 3s delays) for testnet timestamp issues
  - Applied to all mutations: mint, transfer, list, buy, cancel, create event
  - Toast notifications show retry progress
  - Handles quorum failures gracefully

- **Transfer Ownership Fix**
  - Hub maintains updated ticket references after transfers
  - `ticketsByOwner` correctly finds transferred tickets
  - Emits stream events for cross-chain sync

### Changed
- Listings query filters only Active listings (hides Cancelled/Sold)
- Cancel listing gracefully handles already-cancelled listings (no crash on retry)
- Marketplace displays "Cancel Listing" for own listings, "Buy Now" for others
- My Tickets page shows wallet-owned tickets only

### Technical
- **Current Deployment**:
  - Chain ID: `72f9d0af181a93b93aed812c8dbd12cba13d73cac273d05fc20391a9e7f9dbf3`
  - Application ID: `6c15a3503c97265c6de4a3a5cc28d2074f4c45cea4880ced82132443b96768fb`
  - Network: Conway Testnet
  - Service Port: 8080

### Known Issues
- Conway testnet validators have clock drift causing timestamp errors (mitigated by retry logic)
- Some validators may be temporarily unavailable (quorum still achieved)

---

## [Wave 6]

- **Event Organizer Dashboard**
  - Total sales and revenue metrics
  - Active/sold ticket counts
  - Royalty earnings breakdown
- **QR Code System**
  - Generate QR codes for tickets
  - Ticket validation scanner
  - Check-in tracking
- **Secondary Market Analytics**
  - Price history charts
  - Volume tracking
  - Top sellers/buyers

### Advanced Marketplace
- **Time-Limited Listings**
  - Expiration timestamps
  - Auto-cancel expired listings
  - Countdown timers in UI
- **Ticket Bundles**
  - Multi-ticket packages
  - Group discounts
  - VIP tier support

### Technical Improvements
- WebSocket subscriptions for real-time updates
- Optimistic UI updates
- Advanced caching strategies
- Performance monitoring

---

## Development Notes

### Deployment Info
- **Network**: Conway Testnet
- **Chain ID**: `359b32bf632e6724a2ca41fb446017dbf834edd31073d8d61b7d66f9560c87aa`
- **Application ID**: `d60f9a84ab1844cd8acb2133adcba33e7aa065e9c5b05179917d7ba4021395bf`
- **Owner**: `0xd076593ce080dedf0cddb4afe5b4c2c9d8058dc7c3004d3b623fcfa8931cdd26`
- **Service URL**: `http://localhost:8085`

### Key Learnings
- Conway testnet has strict timestamp validation (500ms grace period)
- Implemented automatic retry logic to handle validator clock drift
- Cross-chain messaging requires careful state synchronization
- GraphQL service provides clean abstraction over contract operations
- React frontend integrates smoothly with Linera's GraphQL service
