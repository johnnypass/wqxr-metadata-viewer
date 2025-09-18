// api/metadata.js

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    console.log('🎵 Fetching WQXR metadata...');
    
    const { start, stop } = req.query;
    const now = Math.floor(Date.now() / 1000);
    const startTime = start || (now - 3600);
    const stopTime = stop || now;

    if (!process.env.WQXR_API_KEY) {
      throw new Error('WQXR_API_KEY environment variable not configured');
    }

    const apiUrl = `https://sbfl-prod-us-east-2-public-api-gateway.streaming.adswizz.com/wnyc/stations/wqxr/metadata-monitoring?start=${startTime}&stop=${stopTime}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'x-api-key': process.env.WQXR_API_KEY,
        'Content-Type': 'application/json',
        'User-Agent': 'WQXR-Metadata-Viewer/1.0'
      }
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(`WQXR API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const count = Array.isArray(data) ? data.length : (data ? 1 : 0);

    // 🚀 Return the raw JSON, pretty-printed
    return res.status(200).json({
      success: true,
      data: data, // keep raw
      metadata: {
        start: startTime,
        stop: stopTime,
        count: count,
        timestamp: new Date().toISOString(),
        duration_hours: Math.round((stopTime - startTime) / 3600 * 100) / 100
      }
    });

  } catch (error) {
    console.error('❌ Error in metadata function:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
