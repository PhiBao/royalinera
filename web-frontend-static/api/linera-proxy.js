// Vercel Serverless Function - CORS Proxy for Linera Validators
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-grpc-web');
  res.setHeader('Content-Type', 'application/grpc-web+proto');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Extract target validator from query
  const { target } = req.query;
  if (!target) {
    res.status(400).json({ error: 'Missing target validator URL' });
    return;
  }

  try {
    // Forward request to validator
    const response = await fetch(target, {
      method: req.method,
      headers: {
        'Content-Type': 'application/grpc-web+proto',
        'x-grpc-web': '1',
      },
      body: req.method === 'POST' ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.arrayBuffer();
    res.status(response.status).send(Buffer.from(data));
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: error.message });
  }
}
