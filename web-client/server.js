import { config as loadEnv } from 'dotenv';
import { createServer } from 'vite';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env.local (same file Vite uses for the frontend)
loadEnv({ path: join(__dirname, '.env.local') });

const app = express();

// ── Hub proxy config ────────────────────────────────────────────────
// If a public linera-service node for the hub chain is available,
// the frontend routes marketplace reads through /api/hub to avoid CORS.
const HUB_NODE_URL = process.env.VITE_HUB_NODE_URL || '';
const HUB_CHAIN_ID = process.env.VITE_MARKETPLACE_CHAIN_ID || '';
const APP_ID       = process.env.VITE_LINERA_APPLICATION_ID || '';

// COOP/COEP headers — required for SharedArrayBuffer (WASM threads in @linera/client)
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});

// ── Hub GraphQL proxy ───────────────────────────────────────────────
// POST /api/hub  →  linera-service  /chains/{chain}/applications/{app}
app.use('/api/hub', express.json(), async (req, res) => {
  if (!HUB_NODE_URL || !HUB_CHAIN_ID || !APP_ID) {
    return res.status(503).json({ errors: [{ message: 'Hub node not configured. Set VITE_HUB_NODE_URL, VITE_MARKETPLACE_CHAIN_ID, and VITE_LINERA_APPLICATION_ID env vars.' }] });
  }
  const url = `${HUB_NODE_URL}/chains/${HUB_CHAIN_ID}/applications/${APP_ID}`;
  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await upstream.json();
    res.json(data);
  } catch (err) {
    console.error('[hub-proxy] Error:', err.message);
    res.status(502).json({ errors: [{ message: `Hub unreachable: ${err.message}` }] });
  }
});

// Serve WASM files with correct MIME type
app.use('/wasm', express.static(join(__dirname, 'public/wasm'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.wasm')) {
      res.setHeader('Content-Type', 'application/wasm');
    }
  }
}));

// Serve web worker snippets from public folder
app.use('/snippets', express.static(join(__dirname, 'public/snippets')));

// Vite dev server
const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'spa',
  optimizeDeps: {
    exclude: ['@linera/client'],
  },
});
app.use(vite.middlewares);

const port = process.env.PORT || 5173;
app.listen(port, '0.0.0.0', () => {
  console.log(`\n  RoyalInera — http://localhost:${port}`);
  if (HUB_NODE_URL) {
    console.log(`  Hub proxy  — /api/hub → ${HUB_NODE_URL}`);
  } else {
    console.log(`  Hub proxy  — disabled (set VITE_HUB_NODE_URL to enable)`);
  }
  console.log();
});
