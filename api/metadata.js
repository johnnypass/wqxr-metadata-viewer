// api/metadata.js - Vercel Serverless Functions
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
    console.log('🎵 Fetching metadata from multiple stations...');

    const { start, stop } = req.query;
    const now = Math.floor(Date.now() / 1000);
    const startTime = start || (now - 3600);
    const stopTime = stop || now;

    console.log(`📅 Time range: ${startTime} to ${stopTime}`);

    if (!process.env.WQXR_API_KEY) {
      throw new Error('WQXR_API_KEY environment variable not configured');
    }

    // Stations to fetch
    const stations = [
      { id: 'wqxr', name: 'WQXR' },
      { id: 'wnyc', name: 'WNYC' },
      { id: 'tunein-test', name: 'TuneIn Test' }
    ];

    // Build API calls
    const fetches = stations.map(station => {
      const url = `https://sbfl-prod-us-east-2-public-api-gateway.streaming.adswizz.com/wnyc/stations/${station.id}/metadata-monitoring?start=${startTime}&stop=${stopTime}`;
      console.log(`🌐 Fetching: ${url}`);

      return fetch(url, {
        method: 'GET',
        headers: {
          'x-api-key': process.env.WQXR_API_KEY,
          'Content-Type': 'application/json',
          'User-Agent': 'Metadata-Viewer/1.0'
        }
      })
        .then(resp => resp.ok ? resp.json() : Promise.reject(new Error(`${station.name} API error: ${resp.status}`)))
        .then(data => ({ station: station.name, data }))
        .catch(err => ({ station: station.name, error: err.message }));
    });

    const results = await Promise.all(fetches);

    const merged = {};
    results.forEach(r => {
      if (r.error) {
        merged[r.station] = { success: false, error: r.error };
      } else {
        merged[r.station] = { success: true, metadataList: r.data?.metadataList || [] };
      }
    });

    return res.status(200).json({
      success: true,
      stations: merged,
      metadata: {
        start: startTime,
        stop: stopTime,
        timestamp: new Date().toISOString()
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
