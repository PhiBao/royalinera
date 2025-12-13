# Changelog

All notable changes to the Royalinera ticketing dApp will be documented in this file.

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

## [Planned for Wave 5]

### Planned Features
- MetaMask wallet integration for multi-user support
- Enhanced ticket metadata (images, descriptions)
- Event search and filtering
- Ticket transfer history
- QR code generation for tickets
- Event organizer dashboard
- Secondary market analytics
- Ticket bundle sales
- Time-limited listings

### Technical Improvements
- IndexedDB wallet persistence
- WebSocket subscriptions for real-time updates
- Optimistic UI updates
- Better error recovery
- Performance optimizations
- Frontend deployment to Vercel/Netlify

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
