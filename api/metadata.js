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
    const now = Math.floor(Date.now() / 1000); // Current time in epoch seconds

    // Convert start and stop to numbers, defaulting to 1 hour ago and now if not provided
    const startTime = start ? parseInt(start, 10) : (now - 3600);
    const stopTime = stop ? parseInt(stop, 10) : now;

    // Validate time range (max 72 hours = 259,200 seconds)
    const duration = stopTime - startTime;
    if (duration > 259200) {
      throw new Error('Time interval exceeds 72-hour limit');
    }
    if (startTime > stopTime) {
      throw new Error('Start time must be before stop time');
    }

    console.log(`📅 Time range: ${startTime} to ${stopTime} (duration: ${duration}s)`);

    if (!process.env.WQXR_API_KEY) {
      throw new Error('WQXR_API_KEY environment variable not configured');
    }

    // Stations to fetch
    const stations = [
      { id: 'wqxr', name: 'WQXR' },
      { id: 'wnycfm', name: 'WNYC' },
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
