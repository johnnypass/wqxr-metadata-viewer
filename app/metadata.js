// api/metadata.js
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { start, stop } = req.query;
    
    // Calculate timestamps if not provided
    const now = Math.floor(Date.now() / 1000);
    const startTime = start || (now - 3600); // 1 hour ago
    const stopTime = stop || now;

    const apiUrl = `https://sbfl-prod-us-east-2-public-api-gateway.streaming.adswizz.com/wnyc/stations/wqxr/metadata-monitoring?start=${startTime}&stop=${stopTime}`;

    const response = await fetch(apiUrl, {
      headers: {
        'x-api-key': process.env.WQXR_API_KEY, // Secure environment variable
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    res.status(200).json({
      success: true,
      data: data,
      metadata: {
        start: startTime,
        stop: stopTime,
        count: Array.isArray(data) ? data.length : 1
      }
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
