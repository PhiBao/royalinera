# Linera Ticketing (Microchain Demo)

A lightweight, fully on-chain ticketing flow built on Linera Protocol. It pairs a royalty-aware marketplace contract (`src/`) with a zero-build static front-end (`web-frontend-static/`) that talks to the service's GraphQL API.

## What lives where
- `src/lib.rs` – ABI definitions (events, tickets, listings, royalty accounting).
- `src/contract.rs` – contract logic: create events, mint tickets, transfer/claim cross-chain, royalty splits, and marketplace listings.
- `src/service.rs` – GraphQL service for queries/mutations (events, tickets, listings, owned ids, royalty balances).
- `web-frontend-static/` – HTML/CSS/JS UI with the Events / Marketplace / My Tickets / Connect Wallet menu.

## Running the contract on Linera (local single-validator demo)
The steps mirror the official examples (see `linera-protocol/examples/*/README.md`).

0) Prereqs
- Rust stable with `wasm32-unknown-unknown` target: `rustup target add wasm32-unknown-unknown`
- Build Linera CLI binaries: `cd linera-protocol && cargo build --release -p linera -p linera-service`
- Put them on your PATH: `export PATH="$PWD/target/release:$PATH"` and source the helper: `eval "$(linera net helper 2>/dev/null)"`

1) Start a local network + faucet
```bash
LINERA_FAUCET_PORT=8079
LINERA_FAUCET_URL=http://localhost:$LINERA_FAUCET_PORT
LINERA_TMP_DIR=$(mktemp -d)
linera_spawn linera net up --with-faucet --faucet-port $LINERA_FAUCET_PORT
```

2) Init wallet and request two chains (seller/buyer)
```bash
export LINERA_WALLET="$LINERA_TMP_DIR/wallet.json"
export LINERA_KEYSTORE="$LINERA_TMP_DIR/keystore.json"
export LINERA_STORAGE="rocksdb:$LINERA_TMP_DIR/client.db"

linera wallet init --faucet $LINERA_FAUCET_URL
INFO_1=($(linera wallet request-chain --faucet $LINERA_FAUCET_URL))
INFO_2=($(linera wallet request-chain --faucet $LINERA_FAUCET_URL))
CHAIN_1="${INFO_1[0]}"; OWNER_1="${INFO_1[1]}"
CHAIN_2="${INFO_2[0]}"; OWNER_2="${INFO_2[1]}"
```

3) Build Wasm artifacts (contract + service)
```bash
cargo build --release --target wasm32-unknown-unknown
```
Artifacts land at `target/wasm32-unknown-unknown/release/ticketing_{contract,service}.wasm`.

4) Publish module and create the application
```bash
MODULE_ID="$(linera publish-module \
  target/wasm32-unknown-unknown/release/ticketing_contract.wasm \
  target/wasm32-unknown-unknown/release/ticketing_service.wasm)"

APP_ID="$(linera create-application $MODULE_ID --json-argument '{}')"
echo "Application ID: $APP_ID"
```

5) Run the GraphQL service for your wallet
```bash
SERVICE_PORT=8080
linera service --port $SERVICE_PORT --with-admin-ui &
GRAPHQL_URL="http://localhost:$SERVICE_PORT/chains/$CHAIN_1/applications/$APP_ID"
echo "GraphQL: $GRAPHQL_URL"
```

## Using the static UI
1. Serve `web-frontend-static`:
```bash
cd web-frontend-static
python -m http.server 4173
```
2. Open the printed URL (http://localhost:4173).
3. Set the GraphQL service URL to `$GRAPHQL_URL` from step 5.
4. Paste your `AccountOwner` (`OWNER_1` or `OWNER_2`) into Connect Wallet.
5. Use Events / Marketplace / My Tickets; confirm operations via your wallet/CLI.

## Using the Vite Web Client (in-browser signer)
`web-client/` is a Vite app that uses `@linera/client` and ethers to faucet a wallet on Conway, claim a chain, and call the ticketing app directly (no local `linera service`). Steps:
```bash
cd web-client
npm install          # already done in repo, rerun if needed
npm run dev -- --host --port 4173
```
Then open the URL, click Connect (optionally paste a private key; otherwise a random one is created), and the app will faucet a wallet on Conway, claim a chain, and use the ticketing app id set in the UI.

## Testnet / mainnet
Swap steps 1–2 with the network bootstrap of your environment (validator endpoints, wallet restored from keystore), then reuse steps 3–5 with the appropriate faucet/application ids. See https://linera.dev/ for environment-specific flags.

### Conway testnet (no local validator)
- Faucet: `https://faucet.testnet-conway.linera.net/`
- Download network config (used by CLI/service):
  ```bash
  LINERA_TMP_DIR=$(mktemp -d)
  curl -sS https://faucet.testnet-conway.linera.net/network.json -o $LINERA_TMP_DIR/network.json
  export LINERA_NETWORK=$LINERA_TMP_DIR/network.json
  export LINERA_FAUCET_URL=https://faucet.testnet-conway.linera.net/
  export LINERA_WALLET="$LINERA_TMP_DIR/wallet.json"
  export LINERA_KEYSTORE="$LINERA_TMP_DIR/keystore.json"
  export LINERA_STORAGE="rocksdb:$LINERA_TMP_DIR/client.db"
  ```
- Initialize wallet + request a chain:
  ```bash
  linera wallet init --faucet $LINERA_FAUCET_URL --network $LINERA_NETWORK
  INFO=($(linera wallet request-chain --faucet $LINERA_FAUCET_URL --network $LINERA_NETWORK))
  CHAIN_ID="${INFO[0]}"; OWNER_ID="${INFO[1]}"
  ```
- Build Wasm (same as above), publish module, and create application on the testnet:
  ```bash
  cargo build --release --target wasm32-unknown-unknown
  MODULE_ID="$(linera publish-module \
    target/wasm32-unknown-unknown/release/ticketing_contract.wasm \
    target/wasm32-unknown-unknown/release/ticketing_service.wasm \
    --network $LINERA_NETWORK)"
  APP_ID="$(linera create-application $MODULE_ID --json-argument '{}' --network $LINERA_NETWORK)"
  ```
- Run the wallet-bound GraphQL service against Conway:
  ```bash
  SERVICE_PORT=8080
  linera service --port $SERVICE_PORT --network $LINERA_NETWORK --with-admin-ui &
  GRAPHQL_URL="http://localhost:$SERVICE_PORT/chains/$CHAIN_ID/applications/$APP_ID"
  echo "Use this in the UI: $GRAPHQL_URL"
  ```
- Open the static UI (http://localhost:4173 if using `python -m http.server 4173`) and set the GraphQL URL. Use `OWNER_ID` in Connect Wallet. All ops are signed by your wallet and broadcast to Conway.

#### Optional: use the Linera Web client library
If you prefer in-browser signing instead of CLI, add `@linera/client` to a bundled front-end and create a signer (e.g., WebAuthn). The static HTML here is build-less, so you would need a small Vite/webpack wrapper:
```bash
pnpm add @linera/client
```
```ts
import { Client, WebAuthnSigner } from "@linera/client";
const signer = await WebAuthnSigner.create("ticketing-demo");
const client = await Client.create({ network: LINERA_NETWORK, signer });
// use client.executeOperation(...) with your app id
```
Reuse `network.json` and `APP_ID` from the steps above. This keeps keys in the browser and still talks to Conway testnet.

## Using the static UI
1. Serve `web-frontend-static` (e.g., `cd web-frontend-static && python -m http.server 4173`).
2. Set the GraphQL service URL in the header, then paste your `AccountOwner` to "Connect Wallet".
3. Use **Events** to create/mint, **Marketplace** to list/buy/cancel, and **My Tickets** to transfer or claim across chains.
4. All mutations are forwarded to the GraphQL service; signing/permissions stay with your Linera wallet.

## Design goals
- Showcase real-time microchains: instant transfers, cross-chain claims, and royalty payouts.
- Keep ownership on-chain: organizer-only minting, seller-only listing/cancel, authenticated transfers.
- Minimal stack: pure Rust on-chain logic + static client, no bundler required.
