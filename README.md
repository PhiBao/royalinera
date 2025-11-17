# Linera Ticketing dApp

A fully on-chain ticketing system built on the Linera blockchain with event management, NFT tickets, and marketplace features.

## 🎯 Features

- **Event Management**: Create and manage events on your chain
- **NFT Tickets**: Mint unique ticket NFTs with seat assignments  
- **Marketplace**: Browse and view all available tickets
- **Multi-Chain Architecture**: Each user operates on their own blockchain

## 🏗️ Architecture

- **Smart Contract**: Written in Rust using Linera SDK
- **Frontend**: Static HTML/JavaScript using @linera/client WASM
- **Storage**: Fully on-chain using Linera's MapView
- **Network**: Deployed on Linera testnet-conway

## 📋 Prerequisites

- Rust toolchain (for building contract)
- Linera CLI (for deployment)
- Modern web browser (for frontend)
- Node.js (for serving frontend)

## 🚀 Quick Start

### 1. Build the Contract

```bash
cd examples/ticketing
cargo build --release --target wasm32-unknown-unknown
```

### 2. Publish to Testnet

```bash
linera project publish-and-create
```

This outputs an Application ID like: `d22e34968d4434f22594d6dd3fceaf32e11c6bdfbecf7311d674ba58a6160f62`

### 3. Configure Frontend

Update the APP_ID in `web-frontend-static/index.html` (line ~299):

```javascript
const APP_ID = 'YOUR_APP_ID_HERE';
```

### 4. Run Frontend

```bash
cd web-frontend-static
npm install
npm run dev
```

Open http://localhost:5173

## 📖 Usage Guide

### Creating Events

1. Navigate to **Events** tab
2. Click **Create Event**
3. Fill in details (name, venue, date, max tickets, royalty %)
4. Submit and wait ~30-60 seconds for confirmation

### Minting Tickets

1. Click on an event
2. Scroll to **Mint Ticket** section
3. Enter seat number (e.g., "A1")
4. Click **Mint Ticket**
5. View in **My Tickets** tab after confirmation

## 🛠️ Project Structure

```
ticketing/
├── src/
│   ├── contract.rs       # Smart contract logic
│   ├── service.rs        # GraphQL queries/mutations
│   ├── state.rs          # State management
│   └── lib.rs           # Type definitions
├── web-frontend-static/
│   ├── index.html        # Frontend (all-in-one file)
│   ├── package.json      
│   └── vite.config.ts    
├── Cargo.toml
└── README.md
```

## 🌐 Deployment

### Current Deployment
- **Network**: testnet-conway
- **Faucet**: https://faucet.testnet-conway.linera.net
- **App ID**: Update in frontend after publishing

### Frontend Deployment
Deploy to Vercel, GitHub Pages, or any static host. Just update APP_ID before deploying.

## 🐛 Troubleshooting

- **Connection issues**: Wait a few seconds, check browser console
- **Tickets not showing**: Wait 30-60 seconds after minting, then refresh
- **Event errors**: Verify organizer address matches your owner address

## 📝 Technical Notes

- Each user claims their own chain via faucet
- Frontend polls every 3 seconds for updates
- Blob storage is optional (using dummy hashes in demo)
- No gas fees on testnet

## 📄 License

Apache License 2.0

## 🔗 Resources

- [Linera Docs](https://linera.dev)
- [GitHub](https://github.com/linera-io/linera-protocol)
- [Discord](https://discord.gg/linera)
