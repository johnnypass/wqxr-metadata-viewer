// api/metadata.js - Vercel Serverless Function (Uses built-in fetch)
module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    console.log('🎵 Fetching WQXR metadata...');
    
    // Get query parameters
    const { start, stop } = req.query;
    
    // Calculate timestamps if not provided
    const now = Math.floor(Date.now() / 1000);
    const startTime = start || (now - 3600); // Default: 1 hour ago
    const stopTime = stop || now;

    console.log(`📅 Time range: ${startTime} to ${stopTime}`);

    // Check if API key is configured
    if (!process.env.WQXR_API_KEY) {
      console.error('❌ WQXR_API_KEY environment variable not configured');
      throw new Error('WQXR_API_KEY environment variable not configured');
    }

    // Build the WQXR API URL
    const apiUrl = `https://sbfl-prod-us-east-2-public-api-gateway.streaming.adswizz.com/wnyc/stations/wqxr/metadata-monitoring?start=${startTime}&stop=${stopTime}`;
    
    console.log(`🌐 Calling: ${apiUrl.substring(0, 100)}...`);
    console.log(`🔑 Using API key: ${process.env.WQXR_API_KEY.substring(0, 8)}...`);

    // Fetch from WQXR API using built-in fetch
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'x-api-key': process.env.WQXR_API_KEY,
        'Content-Type': 'application/json',
        'User-Agent': 'WQXR-Metadata-Viewer/1.0'
      }
    });

    console.log(`📡 Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`❌ WQXR API Error: ${response.status} - ${errorText}`);
      
      if (response.status === 401 || response.status === 403) {
        throw new Error('Authentication failed - please check API key configuration');
      }
      
      throw new Error(`WQXR API returned ${response.status}: ${response.statusText}`);
    }

    // Parse the response
    const data = await response.json();
    
    const count = Array.isArray(data) ? data.length : (data ? 1 : 0);
    console.log(`✅ Successfully fetched ${count} metadata records`);

    // Return success response
    return res.status(200).json({
      success: true,
      data: data,
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
    
    // Return error response
    return res.status(500).json({ 
      success: false, 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
