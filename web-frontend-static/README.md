# Royalinera - Static Frontend (Fully On-Chain)

**Zero servers needed!** This is a pure client-side application that connects directly to Linera testnet validators using browser WASM.

## Architecture

```
User Browser → @linera/client (WASM) → Linera Testnet Conway Validators
```

No backend. No GraphQL service. Just static files + blockchain.

## Quick Start

### 1. Install Dependencies

```bash
cd web-frontend-static
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` with your deployed application details:
- `LINERA_CHAIN_ID` - Your chain ID on testnet
- `LINERA_APP_ID` - Your deployed ticketing application ID
- `LINERA_FAUCET_URL` - Testnet faucet (default is fine)

### 3. Copy WASM Artifacts

The app needs `@linera/client` WASM files in `public/js/`:

```bash
# From the ticketing directory
mkdir -p public/js/@linera/client
mkdir -p public/js/@linera/signer

# Copy from node_modules after npm install
cp -r node_modules/@linera/client/dist/* public/js/@linera/client/
cp -r node_modules/@linera/signer/dist/* public/js/@linera/signer/
```

### 4. Run Development Server

```bash
npm run dev
```

Open http://localhost:5173

The Vite dev server automatically adds the required `Cross-Origin-Embedder-Policy` and `Cross-Origin-Opener-Policy` headers for SharedArrayBuffer support.

### 5. Build for Production

```bash
npm run build
```

This creates a `dist/` folder with static files ready for deployment.

## Deploy to Vercel

### Option A: Vercel CLI

```bash
npm install -g vercel
vercel
```

### Option B: GitHub Integration

1. Push code to GitHub
2. Import project in Vercel dashboard
3. Add environment variables in Vercel:
   - `LINERA_CHAIN_ID`
   - `LINERA_APP_ID`
   - `LINERA_FAUCET_URL`
4. Deploy!

The `vercel.json` file automatically configures the required COOP/COEP headers.

## How It Works

1. **No Bundling of WASM**: The `@linera/client` package is marked as external in `vite.config.ts`. It's loaded via import maps at runtime.

2. **Cross-Origin Isolation**: Required for `SharedArrayBuffer` (used by WASM threads). The headers are set by:
   - Vite dev server (development)
   - `vercel.json` (production on Vercel)

3. **Direct Blockchain Connection**: The browser WASM client connects directly to Linera validators. No middleware, no GraphQL proxy.

4. **Wallet in Browser**: Uses `@linera/signer` with ephemeral keys generated in the browser. For production, integrate MetaMask or other wallet providers.

## Troubleshooting

### "SharedArrayBuffer is not defined"

The cross-origin isolation headers aren't set correctly. Check:
- In dev: Vite config has the headers
- In prod: Vercel dashboard shows COOP/COEP headers in response
- Browser console shows `self.crossOriginIsolated === true`

### "Failed to fetch WASM"

The WASM files aren't in `public/js/`. Run the copy command from step 3.

### "Cannot find module @linera/client"

Check the import map in `index.html` points to the correct paths.

## Cost

**$0/month** - Vercel free tier includes:
- 100 GB bandwidth
- Unlimited static deployments
- Automatic SSL
- Global CDN

Perfect for a fully on-chain dapp!

## Architecture Comparison

### Traditional Web3 (Ethereum)
```
Browser → Infura/Alchemy RPC → Ethereum Nodes
```
Cost: $50-200/month for reliable RPC service

### Royalinera (Linera)
```
Browser → WASM Client → Linera Validators (public testnet)
```
Cost: **$0/month** - Direct P2P connection!

## Next Steps

- Add MetaMask integration for persistent wallets
- Implement ticket purchasing UI
- Add QR code generation for tickets
- Deploy to production Linera mainnet (when available)
