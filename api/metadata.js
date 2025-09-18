// api/metadata.js - Vercel Serverless Functions (Uses built-in fetch)

function parseMetadataString(metadataStr) {
  const result = {};
  if (!metadataStr) return result;

  // Extract title="..." section
  const titleMatch = metadataStr.match(/title="([^"]*(?:\\.[^"]*)*)"/);
  if (!titleMatch) return result;

  let fullTitle = titleMatch[1];

  // Step 1: Decode escaped sequences (turn \" into ", \\ into \)
  fullTitle = fullTitle.replace(/\\+"/g, '"').replace(/\\\\/g, '\\');

  // Step 2: Patterns to split piece vs composer
  const composerPatterns = [
    /(.+)-([A-Z][a-z]+(?:\s+van|\s+von|\s+de|\s+da|\s+del|\s+della)?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)$/,
    /(.+)-([A-Z][a-z]+(?:\s+[A-Z][a-z]*)*(?:\s+[A-Z][a-z]+)*)$/,
    /(.+)-([A-Z][a-z]{2,}.*)$/
  ];

  let piece = fullTitle;
  let composer = '';

  for (const pattern of composerPatterns) {
    const match = fullTitle.match(pattern);
    if (match && match[2]) {
      const potentialComposer = match[2].trim();
      if (potentialComposer.includes(' ') || /^[A-Z][a-z]+$/.test(potentialComposer)) {
        piece = match[1].trim();
        composer = potentialComposer;
        break;
      }
    }
  }

  result.title = piece;
  if (composer && composer.length > 2) {
    result.composer = composer;
  }

  return result;
}

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

    // 🔎 Enhance with parsed metadata
    const parsedData = Array.isArray(data)
      ? data.map(item => ({
          ...item,
          parsed: parseMetadataString(item.metadataString || item.metadata || '')
        }))
      : data;

    const count = Array.isArray(parsedData) ? parsedData.length : (parsedData ? 1 : 0);

    return res.status(200).json({
      success: true,
      data: parsedData,
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
