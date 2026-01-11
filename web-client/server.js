import { createServer } from 'vite';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables - .env.local takes priority
dotenv.config({ path: '.env.local', override: true });
dotenv.config({ path: '.env' });

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

// Linera service configuration
const NODE_SERVICE_PORT = process.env.LINERA_SERVICE_PORT || 8080;
const CHAIN_ID = process.env.VITE_MARKETPLACE_CHAIN_ID;
const APP_ID = process.env.VITE_LINERA_APPLICATION_ID;

// Hub application URL - use env for production, fallback to localhost for dev
const HUB_APP_URL = process.env.VITE_HUB_APP_URL || 
  `http://localhost:${NODE_SERVICE_PORT}/chains/${CHAIN_ID}/applications/${APP_ID}`;

// Add COOP/COEP headers for SharedArrayBuffer support (needed for crypto operations)
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});

// Parse JSON bodies
app.use(express.json());

// ============================================
// Linera Service API Routes
// ============================================

// Hub chain application queries (marketplace data)
app.post('/api/hub', async (req, res) => {
  try {
    console.log('Hub API request:', JSON.stringify(req.body).substring(0, 100));
    console.log('Fetching from:', HUB_APP_URL);
    const response = await fetch(HUB_APP_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'ngrok-skip-browser-warning': '69420',  // Skip ngrok interstitial page
      },
      body: JSON.stringify(req.body),
    });
    
    const text = await response.text();
    console.log('Raw response:', text.substring(0, 200));
    
    try {
      const data = JSON.parse(text);
      console.log('Hub API response:', JSON.stringify(data).substring(0, 100));
      res.json(data);
    } catch (parseErr) {
      console.error('JSON parse error - response was HTML:', text.substring(0, 500));
      res.status(502).json({ 
        error: 'Invalid response from hub',
        message: 'Received HTML instead of JSON. Check if ngrok tunnel is active.'
      });
    }
  } catch (err) {
    console.error('Hub API error:', err.message);
    res.status(503).json({ 
      error: 'Hub chain unavailable',
      message: `Make sure 'linera service --port ${NODE_SERVICE_PORT}' is running. Error: ${err.message}`
    });
  }
});

// Dynamic chain/application queries
app.post('/api/chains/:chainId/applications/:appId', async (req, res) => {
  const { chainId, appId } = req.params;
  const url = `http://localhost:${NODE_SERVICE_PORT}/chains/${chainId}/applications/${appId}`;
  
  try {
    console.log('Chain API request:', chainId.substring(0, 16), appId.substring(0, 16));
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Chain API error:', err.message);
    res.status(503).json({ 
      error: 'Linera service unavailable',
      message: `Make sure 'linera service --port ${NODE_SERVICE_PORT}' is running`
    });
  }
});

// Node service queries (for notifications subscription setup)
app.post('/api/node', async (req, res) => {
  try {
    const response = await fetch(`http://localhost:${NODE_SERVICE_PORT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Node API error:', err.message);
    res.status(503).json({ 
      error: 'Linera service unavailable',
      message: `Make sure 'linera service --port ${NODE_SERVICE_PORT}' is running`
    });
  }
});

// ============================================
// Static File Serving
// ============================================

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

// ============================================
// Vite Dev Server
// ============================================

const vite = await createServer({
  server: { middlewareMode: true },
  appType: 'spa',
});

app.use(vite.middlewares);

const port = process.env.PORT || 5173;
app.listen(port, '0.0.0.0', () => {
  console.log(`\n🎫 RoyalInera Ticket Marketplace`);
  console.log(`   Frontend: http://localhost:${port}`);
  console.log(`   Hub API: ${HUB_APP_URL.substring(0, 50)}...`);
  console.log(`\n   Make sure Linera service is running\n`);
});
