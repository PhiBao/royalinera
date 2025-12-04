# Royalinera - NFT Ticketing Platform

A fully on-chain ticketing system built on Linera Protocol with royalty-aware marketplace, NFT tickets, and cross-chain transfers.

## Project Structure
- `src/lib.rs` – ABI definitions (events, tickets, listings, royalty accounting)
- `src/contract.rs` – Contract logic: create events, mint tickets, transfer/claim cross-chain, royalty splits, and marketplace
- `src/service.rs` – GraphQL service for queries/mutations
- `src/state.rs` – Application state management
- `web-client/` – React + Vite frontend with responsive design

## Features

- ✅ **Event Creation** with customizable royalty system (0-25%)
- ✅ **NFT Ticket Minting** with metadata and blob storage
- ✅ **Cross-Chain Transfers** using Linera's microchain architecture
- ✅ **On-Chain Marketplace** (list, buy, cancel with atomic transactions)
- ✅ **Automatic Royalty Distribution** to event organizers
- ✅ **GraphQL API** for all operations
- ✅ **Modern React Frontend** with responsive design
- ✅ **Conway Testnet Deployment** with retry logic for production reliability

## Quick Start (Conway Testnet)

### Prerequisites
- Rust stable with `wasm32-unknown-unknown` target: `rustup target add wasm32-unknown-unknown`
- Linera CLI installed: Follow [Linera installation guide](https://linera.dev/)
- Node.js 18+ and npm (for frontend)

### Backend Deployment

Use the automated deployment script with retry logic:

```bash
# Deploy to Conway testnet
bash scripts/dev-conway.sh
```

This script will:
1. Set up Conway network configuration
2. Initialize wallet and request a chain
3. Build WASM binaries
4. Publish module and create application (with automatic retries)
5. Start the GraphQL service on port 8085

### Frontend Setup

```bash
cd web-client
npm install
npm run dev
```

Open http://localhost:5173 and connect with your wallet to start using the app.

## Local Development

For local testing with single-validator network:

```bash
# Terminal 1: Start local network
linera net up --with-faucet

# Terminal 2: Deploy application
cargo build --release --target wasm32-unknown-unknown
linera publish-module target/wasm32-unknown-unknown/release/ticketing_contract.wasm \
  target/wasm32-unknown-unknown/release/ticketing_service.wasm

# Terminal 3: Run frontend
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

### Why Single-Service Mode?
The current frontend connects to one GraphQL service (single wallet). This demonstrates all features but limits multi-user marketplace testing in the browser. 

**For Production**: Implement wallet connection (MetaMask, WalletConnect) so each user signs with their own keys. See future roadmap in [CHANGELOG.md](./CHANGELOG.md).

## Team

- **Project**: Royalinera - Decentralized NFT Ticketing Platform
- **Developer**: PhiBao
- **Discord**: kiter99
- **Wallet Address**: `0x86E95581E41946ED84956433a8a9c836bCbA636c`
- **GitHub**: https://github.com/PhiBao/
- **Submission**: Linera Wave 4

### Deployed Application
- **Network**: Conway Testnet
- **Application ID**: `d60f9a84ab1844cd8acb2133adcba33e7aa065e9c5b05179917d7ba4021395bf`
- **Service URL**: http://localhost:8085 (when running locally)
- **Chain ID**: `359b32bf632e6724a2ca41fb446017dbf834edd31073d8d61b7d66f9560c87aa`

### Documentation
- [CHANGELOG.md](./CHANGELOG.md) - Complete feature list and version history

## Linera SDK Features Used

This project demonstrates several Linera SDK capabilities:

1. **Microchain Architecture**: Each user can have their own chain for ticket management
2. **Cross-Chain Messaging**: Tickets can be transferred atomically between chains
3. **GraphQL Service**: Automatic API generation from contract state
4. **Blob Storage**: Event metadata and ticket images stored efficiently
5. **Event System**: Subscribe to transfers, purchases, and royalty distributions
6. **Owner-Based Permissions**: Only ticket owners can list/transfer, only organizers can mint
7. **Atomic State Updates**: Marketplace operations are all-or-nothing

## Known Limitations

- **Single-Account Demo**: Current frontend uses one wallet for simplicity
- **CLI Required for Multi-User Testing**: Use provided scripts to simulate multiple buyers
- **Future Enhancement**: Multi-wallet browser support (see CHANGELOG for roadmap)
