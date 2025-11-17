# 👑 Royalinera - Next-Gen Event Ticketing on Linera

**Royalinera** is a fully decentralized event ticketing platform built on Linera Protocol, showcasing the power of real-time microchains for scalable, instant ticketing experiences. By leveraging Linera's unique architecture, Royalinera eliminates congestion, delivers predictable performance, and enables seamless cross-chain NFT ticket transfers with embedded royalty distribution.

### 🏆 Hackathon Highlights
- ⚡ **Instant Finality**: Mint tickets and create events with zero congestion
- 🌐 **Native Cross-Chain**: Transfer NFT tickets between microchains seamlessly
- 💰 **Automated Royalties**: Event organizers earn on every secondary sale
- 📊 **GraphQL-First**: Perfect for AI agents and agentic applications
- 🔒 **100% On-Chain**: No IPFS, no centralized backends, no compromises

## 🚀 What is Linera?

Linera is the first **real-time Layer-1 blockchain** designed for the next generation of interactive, agentic applications. Its core innovation is the **microchain** — a lightweight, parallel chain assigned to each user or app. This architecture eliminates global bottlenecks, enabling instant finality, predictable scalability, and a Web3 experience that feels as fast as Web2.

## ⚡ Why Build on Linera

For developers, Linera's architecture unlocks an entirely new design space. You can build apps that update live, scale linearly with users, and interact safely with AI agents — all while staying fully decentralized.

- **Predictable Performance**: No gas wars or congestion — your app runs at the same speed no matter how many users join.
- **Agentic Integration**: AI agents can transact directly via MCP/GraphQL without centralized intermediaries.
- **Real-Time UX**: Push updates instantly and deliver a smooth, interactive experience on-chain.

**Build the next generation of real-time, intelligent Web3 apps — powered by Linera.**

🔗 [Developer Docs](https://linera.dev/)

---

## 🎯 Key Features

### 🎫 NFT Ticketing with Embedded Royalties
- **Unique Ticket NFTs**: Each ticket is a cryptographically unique NFT with deterministic IDs
- **Seat Assignment**: Tickets linked to specific seats for real-world event mapping
- **Automatic Royalty Distribution**: Event organizers earn royalties on every secondary sale (configurable basis points)
- **On-Chain Metadata**: All ticket and event data stored fully on-chain

### 🌐 Cross-Chain Transfers
- **Microchain-to-Microchain**: Transfer tickets seamlessly between different Linera chains
- **Authenticated Messaging**: Secure cross-chain claims with built-in authentication
- **Bouncing Protection**: Failed transfers automatically bounce tickets back to seller
- **Real-Time Settlement**: Instant finality for all transactions

### 🎪 Event Management
- **Creator Control**: Event organizers manage ticket supply, royalties, and minting
- **Capacity Management**: Set maximum ticket limits per event
- **Event Discovery**: Browse all events via GraphQL API
- **Time-Based Events**: Track event start times and venue information

### 💰 Built-In Marketplace
- **Peer-to-Peer Sales**: Direct ticket transfers with optional sale prices
- **Royalty Accounting**: Transparent tracking of all royalty distributions
- **Balance Management**: View pending royalty payouts per account
- **Price Tracking**: Historical sale prices recorded on-chain

## 🏗️ Architecture

Royalinera demonstrates the full power of Linera's microchain architecture:

- **Smart Contract**: Pure Rust using Linera SDK with deterministic ticket ID generation
- **GraphQL Service**: Rich query API for events, tickets, and balances
- **WASM Frontend**: Browser-native client using `@linera/client` library
- **State Management**: Efficient on-chain storage with MapView and RegisterView
- **Cross-Chain Messaging**: Leverages Linera's authenticated message passing

### Technical Stack
- **Contract**: Rust + Linera SDK
- **Service**: async-graphql + Linera runtime
- **Frontend**: Vanilla JavaScript + WASM bindings
- **Storage**: Fully on-chain (no IPFS, no centralized backends)
- **Network**: Linera testnet-conway

## 📋 Prerequisites

- Rust toolchain (1.70+ recommended)
- [Linera CLI](https://linera.dev/getting_started/installation.html) installed and configured
- Modern web browser (Chrome, Firefox, Edge)
- Node.js 18+ (for frontend development server)

## 🚀 Quick Start

### 1. Setup Linera Wallet

First, get test tokens from the faucet:

```bash
# Visit the faucet and copy your chain ID
# https://faucet.testnet-conway.linera.net

# Or request via CLI
linera faucet --account <YOUR_ACCOUNT>
```

### 2. Build the Smart Contract

Compile the Rust contract to WASM32 target:

```bash
# From project root
cargo build --release --target wasm32-unknown-unknown
```

This generates two WASM binaries:
- `target/wasm32-unknown-unknown/release/ticketing_contract.wasm`
- `target/wasm32-unknown-unknown/release/ticketing_service.wasm`

### 3. Publish Application to Linera

Deploy your contract and service to the testnet:

```bash
linera project publish-and-create
```

**Expected output:**
```
Application published successfully!
Application ID: e476187f6ddfeb9d588c7b45d3df334d5501d6499b3f9ad5595cae86cce16a65010000000000000001000000
```

Save this Application ID — you'll need it for the frontend!

### 4. Configure Frontend

Update the `APP_ID` constant in `web-frontend-static/index.html` (around line 299):

```javascript
const APP_ID = 'e476187f6ddfeb9d588c7b45d3df334d5501d6499b3f9ad5595cae86cce16a65010000000000000001000000';
```

### 5. Launch Frontend

Install dependencies and start the development server:

```bash
cd web-frontend-static
npm install
npm run dev
```

Open your browser to **http://localhost:5173** 🎉

## 📖 Usage Guide

### Creating Your First Event

1. Connect your wallet in the browser
2. Navigate to **Events** tab
3. Click **Create Event** and fill in:
   - **Event Name**: e.g., "Linera Conference 2025"
   - **Description**: Brief description of your event
   - **Venue**: Physical or virtual location
   - **Start Time**: Unix timestamp (use online converter)
   - **Max Tickets**: Total supply (e.g., 100)
   - **Royalty %**: Secondary sale royalty (e.g., 5% = 500 basis points)
4. Submit transaction and wait ~10-30 seconds for confirmation
5. Your event appears in the events list!

### Minting Tickets

Once your event is created:

1. Click on your event in the events list
2. Scroll to **Mint Ticket** section
3. Enter seat identifier (e.g., "A1", "B12", "VIP-001")
4. Add metadata blob hash (64-character hex string)*
5. Click **Mint Ticket**
6. Check **My Tickets** tab after confirmation

_*Note: For this demo, blob validation is disabled - you can use any 64-char hex value_

### Transferring Tickets

Transfer tickets between chains:

1. Go to **My Tickets** tab
2. Click on a ticket you own
3. Choose **Transfer** option
4. Enter:
   - **Buyer Chain ID**: Target microchain
   - **Buyer Owner**: Recipient's account owner (public key)
   - **Sale Price** (optional): Set a price for secondary sales
5. Confirm transfer
6. Royalties automatically distributed to event organizer!

### Cross-Chain Claims

Pull tickets from remote chains:

1. Know the source chain ID and ticket ID
2. Use **Claim Ticket** operation
3. Provide authentication credentials
4. Ticket moves to your chain with proper royalty settlement

### Viewing Royalty Earnings

Track your earnings as an event organizer:

1. Navigate to **Balances** section
2. View pending royalty payouts
3. See total accumulated royalties across all events
4. Per-account balance tracking via GraphQL queries

## 🛠️ Project Structure

```
royalinera/
├── src/
│   ├── contract.rs       # Core contract logic (operations & messages)
│   ├── service.rs        # GraphQL API (queries & mutations)
│   ├── state.rs          # On-chain state views (events, tickets, balances)
│   └── lib.rs           # Type definitions and ABIs
├── web-frontend-static/
│   ├── index.html        # Single-page app with WASM integration
│   ├── package.json      # Frontend dependencies
│   ├── vite.config.ts    # Vite dev server config
│   └── api/
│       └── linera-proxy.js  # API proxy for Vercel deployment
├── Cargo.toml            # Rust dependencies (linera-sdk, async-graphql)
├── linera.toml           # Linera project configuration
└── README.md
```

### Key Components

**`contract.rs`** - Implements the `Contract` trait:
- `execute_operation`: Handles CreateEvent, MintTicket, TransferTicket, ClaimTicket
- `execute_message`: Processes cross-chain Transfer and Claim messages
- Enforces royalty distribution and ownership rules

**`service.rs`** - GraphQL interface:
- **Queries**: `event`, `events`, `ticket`, `tickets`, `ownedTicketIds`, `royaltyBalance`
- **Mutations**: `createEvent`, `mintTicket`, `transferTicket`, `claimTicket`
- Exposes all data through type-safe GraphQL schema

**`state.rs`** - Persistent storage:
- `MapView<EventId, Event>`: All events indexed by ID
- `MapView<TicketId, Ticket>`: All tickets with full metadata
- `MapView<AccountOwner, BTreeSet<TicketId>>`: Ownership index
- `MapView<AccountOwner, BalanceEntry>`: Royalty balances
- `RegisterView<u128>`: Global royalty counter

**`lib.rs`** - Shared types:
- `Operation` enum: All possible user actions
- `Message` enum: Cross-chain message types
- `Event` struct: Event metadata with royalty terms
- `Ticket` struct: NFT with embedded royalty logic
- Deterministic ticket ID generation using SHA3-256

## 💡 Technical Innovations

### Deterministic Ticket IDs
Every ticket gets a unique, collision-resistant ID generated using SHA3-256 hash of:
- Chain ID + Application ID
- Event ID + Seat identifier
- Minter account + Metadata hash
- Per-event mint counter

This ensures global uniqueness across all microchains without central coordination.

### Embedded Royalty System
Royalty distribution is **built into the ticket NFT itself**:
```rust
royalty = sale_price × royalty_bps / 10000
seller_receives = sale_price - royalty
organizer_receives = royalty
```
All royalties automatically credited on-chain — no manual claims, no escrow contracts.

### Cross-Chain Message Passing
Two message types enable distributed ticket ownership:

1. **Transfer Message**: Push ticket to another chain
   - With bouncing support if delivery fails
   - Includes sale price for royalty calculation

2. **Claim Message**: Pull ticket from remote chain
   - Requires authentication via Linera's message system
   - Prevents unauthorized transfers

### Efficient State Management
Uses Linera's view system for optimized storage:
- `MapView`: O(1) lookups for events, tickets, balances
- `RegisterView`: Single-value counters for global stats
- `BTreeSet`: Ordered ownership indices for fast queries

### GraphQL-First Design
Every operation is exposed through a type-safe GraphQL schema, enabling:
- Frontend apps to query data efficiently
- AI agents to interact programmatically via MCP
- Third-party services to build on top
- Real-time subscriptions (future enhancement)

## 🌟 Why Royalinera Showcases Linera's Power

### 1. **Real-Time Microchains in Action**
Every user operates on their own microchain, eliminating congestion. When you mint a ticket or create an event, it happens **instantly** — no waiting for block confirmation or competing with other transactions.

### 2. **Cross-Chain Messaging Excellence**
Royalinera demonstrates Linera's authenticated message passing:
- Tickets can move between microchains seamlessly
- Failed transfers automatically bounce back to the sender
- No bridges, no wrapped tokens — native cross-chain operations

### 3. **Predictable Performance**
Whether 10 users or 10,000 users are creating events, your experience remains consistent. No gas wars, no mempool delays, no congestion pricing.

### 4. **Fully On-Chain**
Everything lives on Linera:
- Event metadata
- Ticket ownership
- Royalty balances
- Transaction history

No IPFS dependencies, no centralized databases, no compromises.

### 5. **GraphQL-Native**
The entire application is queryable through GraphQL, making it perfect for:
- Agentic applications (AI can query and transact)
- Real-time dashboards
- Third-party integrations
- Mobile apps

### 6. **Embedded Royalty Logic**
Secondary sales automatically distribute royalties to event organizers — all enforced by smart contract logic, with transparent on-chain accounting.

## 🎬 Demo Highlights for Judges

Want to see Royalinera in action? Try these flows:

### 1. **End-to-End Event Creation**
- Create an event with custom royalty percentage (e.g., 10%)
- Mint multiple tickets with different seat numbers
- View your tickets in the "My Tickets" tab
- Check the event's minted ticket count

### 2. **Cross-Chain Transfer**
- Transfer a ticket to another microchain
- Observe instant finality (no waiting for confirmations)
- Set a sale price and watch royalties auto-distribute
- View updated balances in real-time

### 3. **Royalty Distribution**
- Create an event as Account A
- Mint tickets and transfer to Account B
- Account B sells to Account C with a price
- Check Account A's royalty balance — automatically credited!

### 4. **GraphQL Exploration**
Open your browser's developer console and try:
```javascript
// Query all events
const events = await window.graphqlQuery(`{ events }`);

// Query specific ticket
const ticket = await window.graphqlQuery(`{ 
  ticket(ticketId: "YOUR_TICKET_ID") { 
    eventName, seat, owner 
  } 
}`);
```

### 5. **Performance Testing**
- Create multiple events simultaneously
- Mint tickets in rapid succession
- Notice: Zero congestion, consistent speed
- Compare to traditional blockchain's mempool delays

## 🎓 Learning Resources

- **Linera Documentation**: https://linera.dev/
- **Linera Protocol GitHub**: https://github.com/linera-io/linera-protocol
- **Linera SDK Examples**: https://github.com/linera-io/linera-protocol/tree/main/examples
- **GraphQL API Reference**: Check `src/service.rs` for complete schema
- **Testnet Faucet**: https://faucet.testnet-conway.linera.net

## 🌐 Deployment

### Current Deployment Status
- **Network**: Linera testnet-conway
- **Contract Version**: 0.1.0
- **Frontend**: Deployable to Vercel/Netlify
- **API Proxy**: Included for serverless deployment

### Production Considerations

When deploying to production:

1. **Enable Blob Validation**: Uncomment blob hash validation in `contract.rs`
2. **Add Authentication**: Implement proper wallet signatures
3. **Error Handling**: Add retry logic for network issues
4. **Monitoring**: Set up GraphQL query monitoring
5. **Metadata Storage**: Use proper blob storage for ticket images/PDFs

## 🛡️ Security Features

- **Permission Checks**: All operations verify account ownership
- **Royalty Enforcement**: Automatic distribution, no bypass possible
- **Deterministic IDs**: Tickets have cryptographically unique identifiers
- **Bounded State**: Max ticket limits prevent DoS attacks
- **Message Authentication**: Cross-chain claims require cryptographic proof

## 🤝 Contributing

Built for the Linera Hackathon! Contributions welcome:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🐛 Troubleshooting

**Connection Issues**
- Wait a few seconds for the WASM module to initialize
- Check browser console for detailed error messages
- Verify your Linera wallet is properly configured

**Tickets Not Showing**
- Wait 30-60 seconds after minting for propagation
- Refresh the page to reload state from chain
- Check "My Tickets" tab with correct owner address

**Event Creation Errors**
- Verify organizer address matches your wallet's owner address
- Ensure royalty_bps is ≤ 10,000 (100%)
- Check max_tickets > 0

**Cross-Chain Transfer Issues**
- Confirm target chain ID is valid and active
- Verify you own the ticket on the source chain
- Check that target account owner format is correct

## 📝 License

This project is built on Linera Protocol examples and is provided for educational and hackathon purposes. Licensed under Apache License 2.0.

## 🙏 Acknowledgments

- **Linera Team**: For building the first real-time Layer-1 blockchain
- **Linera Community**: For comprehensive documentation and support
- Built with inspiration from Linera's official examples

## 🔗 Additional Resources

- **Linera Documentation**: https://linera.dev
- **Linera GitHub**: https://github.com/linera-io/linera-protocol
- **Linera Discord**: https://discord.gg/linera
- **Testnet Explorer**: Check your transactions and chain state
- **GraphQL Playground**: Test queries directly in your browser

---

**Ready to experience instant, predictable, multi-chain ticketing?**

Deploy Royalinera and see the future of Web3 event management! 🎫⚡
