# Ticketh - NFT Ticketing Platform

A fully on-chain ticketing system built on **Linera Protocol** using the **Linera SDK** with royalty-aware marketplace, NFT tickets, and cross-chain transfers. **Deployed and tested on Conway Testnet.**

## 🔗 Linera SDK Integration

This project is built entirely with the Linera SDK:

### Smart Contract (Rust)
```rust
// src/contract.rs - Hub-and-Spoke Cross-Chain Ticketing Contract
use linera_sdk::{
    linera_base_types::{ChainId, DataBlobHash, StreamUpdate, WithContractAbi},
    views::{RootView, View},
    Contract, ContractRuntime,
};

impl Contract for TicketingContract {
    type Message = Message;
    type InstantiationArgument = ();
    type Parameters = ApplicationParameters;
    type EventValue = StreamEvent;

    async fn execute_operation(&mut self, operation: Operation) -> Self::Response { ... }
    async fn execute_message(&mut self, message: Message) -> Self::Response { ... }
}
```

### GraphQL Service (Rust)
```rust
// src/service.rs - GraphQL API for queries and mutations
use async_graphql::{EmptySubscription, Object, Request, Response, Schema};
use linera_sdk::{Service, ServiceRuntime, views::View};

impl Service for TicketingService {
    type Parameters = ();
    async fn new(runtime: ServiceRuntime<Self>) -> Self { ... }
    async fn handle_query(&self, request: Request) -> Response { ... }
}
```

### Frontend (JavaScript) - @linera/client Web SDK
```javascript
// web-client/src/contexts/WalletContext.jsx - Multi-wallet support
import * as linera from '@linera/client';
import { PrivateKey } from '@linera/signer';

// Initialize WASM and create signer from mnemonic
await linera.default('/wasm/linera_web_bg.wasm');
const privateKeySigner = PrivateKey.fromMnemonic(mnemonic);
const ownerAddress = privateKeySigner.address();

// Connect to Conway Faucet and claim chain
const faucet = new linera.Faucet('https://faucet.testnet-conway.linera.net/');
const lineraWallet = await faucet.createWallet();
const claimedChainId = await faucet.claimChain(lineraWallet, ownerAddress);

// Create Linera client for blockchain operations
const client = new linera.Client(lineraWallet, privateKeySigner, { skipProcessInbox: false });
const frontend = client.frontend();
const app = await frontend.application(applicationId);
```

**Key SDK Features Used:**
- `linera_sdk::Contract` - Smart contract logic with message handling
- `linera_sdk::Service` - GraphQL API service with async-graphql
- `linera_views` - Persistent state (MapView, RegisterView, SetView)
- `linera_base_types` - ChainId, DataBlobHash, StreamUpdate types
- Cross-chain messaging via `runtime.send_message()`
- Event streaming via `runtime.emit()` and `MARKETPLACE_STREAM`
- `@linera/client` - Web SDK for frontend blockchain interaction
- `@linera/signer` - Wallet signing with mnemonic support

## 🌐 Conway Testnet Deployment

Connects to Conway Testnet via:
- **Faucet**: `https://faucet.testnet-conway.linera.net/`
- **Network Config**: Downloaded from `https://faucet.testnet-conway.linera.net/network.json`
- **Deployment**: `linera publish-and-create` with marketplace chain parameters

**Latest Deployment (Wave 6):**
- Chain ID: `72f9d0af181a93b93aed812c8dbd12cba13d73cac273d05fc20391a9e7f9dbf3`
- Application ID: `8fa9a02f7552969ad7c217418082becf0c04b4041de185e683e90894822918a1`
- All mutations tested and working ✅
- Ticket history & provenance tracking ✅

## Project Structure
- `src/lib.rs` – ABI definitions (events, tickets, listings, messages, stream events)
- `src/contract.rs` – Hub-and-spoke contract: events, mint, transfer, marketplace, cross-chain sync
- `src/service.rs` – GraphQL service with async-graphql for queries/mutations
- `src/state.rs` – Application state with MapView, RegisterView, SetView
- `web-client/` – React + Vite frontend with Apollo Client

## Features

- ✅ **Event Creation** with customizable royalty system (0-25%)
- ✅ **NFT Ticket Minting** with metadata and blob storage
- ✅ **Cross-Chain Transfers** using Linera's microchain architecture
- ✅ **On-Chain Marketplace** (list, buy, cancel with atomic transactions)
- ✅ **Automatic Royalty Distribution** to event organizers
- ✅ **GraphQL API** for all operations (async-graphql)
- ✅ **Modern React Frontend** with Apollo Client
- ✅ **Conway Testnet Deployment** with automatic retry logic (5 retries, 3s delays)
- ✅ **Multi-Wallet Support** with MetaMask integration
- ✅ **Owner-Based Ticket Tracking** for wallet-specific queries
- ✅ **Hub-and-Spoke Architecture** with event stream synchronization
- ✅ **Event Discovery** with search, filters, and sorting
- ✅ **Ticket History & Provenance** tracking with ownership timeline
- ✅ **Transaction History** in wallet modal

## Quick Start (Conway Testnet)

### Prerequisites
- Rust stable with `wasm32-unknown-unknown` target: `rustup target add wasm32-unknown-unknown`
- Linera CLI installed: Follow [Linera installation guide](https://linera.dev/)
- Node.js 18+ and npm (for frontend)

### Option 1: Automated Deployment (Recommended)

```bash
# Deploy to Conway testnet (initializes wallet, builds, publishes)
./scripts/deploy.sh

# If you need to reset and start fresh:
./scripts/deploy.sh --clean
```

### Option 2: Manual Deployment

```bash
# Step 1: Initialize wallet (delete existing if corrupted)
rm -rf ~/.config/linera
linera wallet init --faucet https://faucet.testnet-conway.linera.net

# Step 2: Get your chain ID
linera wallet show

# Step 3: Set default chain
linera wallet set-default YOUR_CHAIN_ID

# Step 4: Build WASM
cargo build --release --target wasm32-unknown-unknown

# Step 5: Publish and create application
linera publish-and-create \
  target/wasm32-unknown-unknown/release/ticketing_contract.wasm \
  target/wasm32-unknown-unknown/release/ticketing_service.wasm

# Step 6: Start Linera service (Terminal 1)
linera service --port 8080

# Step 7: Update frontend config and run (Terminal 2)
# Edit web-client/src/providers/GraphQLProvider.jsx with your Chain ID and App ID
cd web-client
npm install
npm run dev -- --host 0.0.0.0
```

### Frontend Setup

```bash
cd web-client
npm install
npm run dev -- --host 0.0.0.0
```

Open http://localhost:5173 (or http://YOUR_SERVER_IP:5173 for remote access)

### Troubleshooting

**Error: "storage operation error"**
```bash
rm -rf ~/.config/linera
linera wallet init --faucet https://faucet.testnet-conway.linera.net
```

**Error: "client is not configured to propose on chain"**
```bash
# Reset wallet and reinitialize
rm -rf ~/.config/linera
linera wallet init --faucet https://faucet.testnet-conway.linera.net
linera wallet set-default $(linera wallet show | grep -oP 'Chain ID:\s*\K[a-f0-9]+' | head -1)
```

**Error: "default chain requested but none set"**
```bash
linera wallet set-default YOUR_CHAIN_ID
```

## Local Development

For local testing with single-validator network:

```bash
# Terminal 1: Start local network
linera net up --with-faucet

# Terminal 2: Deploy application
cargo build --release --target wasm32-unknown-unknown
linera publish-and-create \
  target/wasm32-unknown-unknown/release/ticketing_contract.wasm \
  target/wasm32-unknown-unknown/release/ticketing_service.wasm

# Terminal 3: Start service
linera service --port 8080

# Terminal 4: Run frontend
cd web-client && npm run dev
```

## How It Works

### Smart Contract Architecture
The contract uses Linera's microchain architecture for:
- **Instant finality**: Transactions complete in milliseconds
- **Cross-chain messaging**: Transfer tickets between chains atomically
- **Event-driven design**: Subscribe to ticket transfers, marketplace events, and royalty payments
- **State isolation**: Each user can have their own microchain for privacy

### Key Operations

1. **Create Event** (Organizer only)
   - Set ticket supply, price, royalty percentage
   - Metadata stored on-chain
   - Automatic NFT ID generation

2. **Mint Ticket** (Anyone)
   - Pay event price
   - Receive unique NFT ticket ID
   - Instant ownership verification

3. **Transfer Ticket** (Cross-chain)
   - Send ticket to any Linera account
   - Automatic state update on both chains
   - Maintains ownership history

4. **List on Marketplace** (Ticket owner)
   - Set asking price
   - Atomic listing creation
   - Cancel anytime before sale

5. **Buy from Marketplace** (Anyone)
   - Instant purchase
   - Automatic royalty distribution to organizer
   - Atomic ownership transfer

## Testing

Multi-account marketplace testing via CLI:
```bash
# Simulate different users buying/selling
bash scripts/simulate-buyer.sh
```

## Architecture Decisions

### Hub-and-Spoke Model
The contract uses a hub-and-spoke architecture:
- **Hub Chain**: Stores all shared data (events, listings, ticket references)
- **User Chains**: Forward operations to hub via cross-chain messages
- **Event Streaming**: Hub emits events that user chains subscribe to for sync

**For Production**: Each user claims their own chain via faucet, operations route through hub for marketplace consistency.

## Team

- **Project**: Ticketh - Decentralized NFT Ticketing Platform
- **Developer**: PhiBao
- **Discord**: kiter99
- **Wallet Address**: `0x86E95581E41946ED84956433a8a9c836bCbA636c`
- **GitHub**: https://github.com/PhiBao/
- **Submission**: Linera Wave 5

### Deployed Application
- **Network**: Conway Testnet
- **Chain ID**: `72f9d0af181a93b93aed812c8dbd12cba13d73cac273d05fc20391a9e7f9dbf3`
- **Application ID**: `6c15a3503c97265c6de4a3a5cc28d2074f4c45cea4880ced82132443b96768fb`
- **Service Port**: 8080 (local)
- **Frontend Port**: 5173 (local)

### Documentation
- [CHANGELOG.md](./CHANGELOG.md) - Complete feature list and version history

## Linera SDK Features Used

This project demonstrates several Linera SDK capabilities:

1. **Hub-and-Spoke Architecture**: Central hub chain with user chains forwarding operations
2. **Cross-Chain Messaging**: `runtime.send_message()` for ticket transfers and marketplace ops
3. **Event Streaming**: `runtime.emit()` with `MARKETPLACE_STREAM` for state synchronization
4. **GraphQL Service**: async-graphql integration with `linera_sdk::Service`
5. **Persistent State**: MapView, RegisterView, SetView from `linera_views`
6. **Blob Storage**: DataBlobHash for ticket metadata references
7. **Owner-Based Permissions**: Wallet address tracking for ownership verification
8. **Atomic State Updates**: Marketplace operations are all-or-nothing

## Known Limitations

- **Testnet Timestamp Issues**: Conway validators have clock drift (mitigated by 5-retry logic with 3s delays)
- **Faucet Dependency**: New users need faucet to claim chains
- **Future Enhancement**: See [CHANGELOG.md](./CHANGELOG.md) for Wave 6/7 roadmap
