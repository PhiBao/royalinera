# Ticketh - NFT Ticketing Platform

A fully on-chain ticketing system built on **Linera Protocol** using the **Linera SDK** with royalty-aware marketplace, NFT tickets, and cross-chain transfers. **Deployed and tested on Conway Testnet.**

## 🔗 Linera SDK Integration

This project is built entirely with the Linera SDK:

### Smart Contract (Rust)
```rust
// src/contract.rs - Uses linera_sdk Contract trait
use linera_sdk::{Contract, ContractRuntime, views::{RootView, View}};

impl Contract for TicketingContract {
    type Message = Message;
    async fn execute_operation(&mut self, operation: Operation) -> Self::Response { ... }
}
```

### Frontend (JavaScript) - @linera/client Web SDK
```javascript
// web-client/src/contexts/WalletContext.jsx - Connects to Conway Testnet
import * as linera from '@linera/client';
import { PrivateKey } from '@linera/signer';
import { Wallet } from 'ethers';

// Generate or import wallet
const wallet = Wallet.createRandom();
const privateKey = PrivateKey.fromMnemonic(wallet.mnemonic.phrase);
const ownerAddress = await privateKey.getOwner();

// Connect to Conway Faucet
const faucet = new linera.Faucet('https://faucet.testnet-conway.linera.net/');
const chainId = await faucet.claimChain(ownerAddress);

// Create Linera client for blockchain operations
const client = new linera.Client(faucet, privateKey);

// Execute GraphQL queries/mutations
const makeRequest = async (chainId, appId, query) => {
  const app = await client.openChain(chainId, appId);
  return await app.query(query);
};
```

**Key SDK Features Used:**
- `linera_sdk::Contract` - Smart contract logic implementation
- `linera_sdk::Service` - GraphQL API service
- `linera_views` - Persistent state management (MapView, RegisterView)
- `linera_base_types` - Account, ChainId, ApplicationId types
- Cross-chain messaging via `call_application`
- `@linera/client` - Web SDK for frontend blockchain interaction
- `@linera/signer` - Wallet signing utilities

## 🌐 Conway Testnet Deployment

Connects to Conway Testnet via:
- **Faucet**: `https://faucet.testnet-conway.linera.net/`
- **Network Config**: Downloaded from `https://faucet.testnet-conway.linera.net/network.json`
- **Deployment Script**: `scripts/dev-conway.sh` handles wallet init, module publish, and app creation

**Latest Deployment:**
- Chain ID: `cee119769a3a330cec7d18ee4042d3f65d9ecb365be5eeb6b32d2510504a01b3`
- Application tested with all mutations working ✅

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

### Why Single-Service Mode?
The current frontend connects to one GraphQL service (single wallet). This demonstrates all features but limits multi-user marketplace testing in the browser. 

**For Production**: Implement wallet connection (MetaMask, WalletConnect) so each user signs with their own keys. See future roadmap in [CHANGELOG.md](./CHANGELOG.md).

## Team

- **Project**: Ticketh - Decentralized NFT Ticketing Platform
- **Developer**: PhiBao
- **Discord**: kiter99
- **Wallet Address**: `0x86E95581E41946ED84956433a8a9c836bCbA636c`
- **GitHub**: https://github.com/PhiBao/
- **Submission**: Linera Wave 4

### Deployed Application
- **Network**: Conway Testnet
- **Application ID**: `65f6519282173b0e03e79e2917fdcf358823487c416253d8f8842790f120ad2f`
- **Service URL**: http://localhost:8085 (local run)
- **Chain ID**: `cee119769a3a330cec7d18ee4042d3f65d9ecb365be5eeb6b32d2510504a01b3`

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
