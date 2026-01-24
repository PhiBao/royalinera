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

## [Wave 6] - 2026-01-24 - Discovery & User Experience

### Added

#### Event Discovery & Search
- **Search & Filtering**
  - ✅ Search events by name/description
  - ✅ Filter by date (upcoming/past), availability, price range
  - ✅ Sort by date, name
  - ✅ Compact single-row filter bar with dividers
- **Enhanced Marketplace**
  - ✅ Search listings by event name
  - ✅ Sort by price (low/high)
  - ✅ Filter own listings vs others

#### Ticket Management
- **Ticket History & Provenance**
  - ✅ Full ownership history timeline
  - ✅ Transfer records with timestamps and acquisition type
  - ✅ Price history for each ticket (list/sold events)
  - ✅ New GraphQL query: `ticketHistory(ticketId)`
- **My Tickets Improvements**
  - ✅ Filter by Listed/Not Listed status
  - ✅ Quick actions for list/transfer/cancel

#### Wallet Improvements
- **MetaMask Integration**
  - ✅ Lightweight wallet connection (skips slow validator subscription)
  - ✅ Fast connect via faucet chain claim
  - ✅ Session-persistent chain ID storage
- **Transaction History**
  - ✅ Shows mints, purchases, transfers
  - ✅ Expandable panel in wallet modal

### Technical
- **Hybrid Architecture**: Lightweight wallet connect + 8080 backend for queries/mutations
- **New Rust Types**: `TicketHistory`, `OwnershipRecord`, `PriceHistoryEntry`, `AcquisitionType`, `PriceEventType`
- **State Addition**: `ticket_history: MapView<TicketId, TicketHistory>` for provenance tracking
- **Vite HMR Fix**: Resolved COEP blocking issue for development

### Known Limitations
- Ticket image upload not yet implemented (planned for Wave 8)
- Chain balance display unavailable in lightweight mode (shows when full Client connected)

### Deployment
- **Chain ID**: `72f9d0af181a93b93aed812c8dbd12cba13d73cac273d05fc20391a9e7f9dbf3`
- **Application ID**: `8fa9a02f7552969ad7c217418082becf0c04b4041de185e683e90894822918a1`
- **Network**: Conway Testnet

---

## [Planned - Wave 7] - Focus: Advanced Features

### Event Organizer Dashboard
- Total sales and revenue metrics
- Active/sold ticket counts
- Royalty earnings breakdown
- Event performance analytics

### QR Code System
- Generate QR codes for tickets
- Ticket validation scanner app
- Check-in tracking and reporting
- Duplicate ticket detection

### Secondary Market Analytics
- Price history charts
- Volume tracking over time
- Top sellers/buyers leaderboard
- Market trends visualization

### Advanced Marketplace
- **Time-Limited Listings**
  - Expiration timestamps on listings
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
- Performance monitoring and analytics

---

## [Planned - Wave 8] - Focus: Media & Polish

### Ticket Media
- **Image Upload & Display**
  - Upload ticket artwork/images
  - IPFS or blob storage integration
  - Image preview in ticket cards
  - Gallery view for collections

### Enhanced UX
- **Rich Metadata**
  - Markdown descriptions for events
  - Venue information with maps
  - Event categories and tags
- **Notification System**
  - Email notifications for purchases
  - In-app notification center
  - Price drop alerts

### Mobile Optimization
- **Responsive Design**
  - Mobile-first layouts
  - Touch-friendly interactions
  - PWA support
- **Wallet Connect**
  - WalletConnect protocol support
  - Mobile wallet integration

### Performance
- **Caching Layer**
  - Redis/IndexedDB caching
  - Optimistic updates
  - Offline support
- **Load Testing**
  - Stress test marketplace
  - Optimize GraphQL queries

---

## Development Notes

### Deployment Info
- **Network**: Conway Testnet
- **Chain ID**: `72f9d0af181a93b93aed812c8dbd12cba13d73cac273d05fc20391a9e7f9dbf3`
- **Application ID**: `8fa9a02f7552969ad7c217418082becf0c04b4041de185e683e90894822918a1`
- **Owner**: `0x7e3591fc5c6d3ad2c0bd0eecb0453bc074162f5f196d37f0658bfbeb12f9b6a0`
- **Service URL**: `http://localhost:8080`
- **Deployed**: 2026-01-24

### Key Learnings
- Conway testnet has strict timestamp validation (500ms grace period)
- Implemented automatic retry logic to handle validator clock drift
- Cross-chain messaging requires careful state synchronization
- GraphQL service provides clean abstraction over contract operations
- React frontend integrates smoothly with Linera's GraphQL service
