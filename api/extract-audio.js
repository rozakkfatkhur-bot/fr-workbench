// File: api/extract-audio.js

export default async function handler(req, res) {
  // Set Header CORS Lengkap untuk Web Audio API
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // A. STREAM PROXY (GET): Menyalurkan stream dari CDN YouTube agar Bebas Hambatan CORS
  if (req.method === 'GET') {
    const { streamUrl } = req.query;
    if (!streamUrl) return res.status(400).send('Parameter streamUrl diperlukan.');

    try {
      const decodedUrl = decodeURIComponent(streamUrl);
      const mediaResponse = await fetch(decodedUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*'
        }
      });

      if (!mediaResponse.ok) {
        return res.status(mediaResponse.status).send('Gagal mengambil buffer dari CDN media.');
      }

      res.setHeader('Content-Type', mediaResponse.headers.get('content-type') || 'audio/mpeg');
      
      const arrayBuffer = await mediaResponse.arrayBuffer();
      return res.status(200).send(Buffer.from(arrayBuffer));
    } catch (err) {
      return res.status(500).send('Proxy streaming error: ' + err.message);
    }
  }

  // B. EXTRACT LINK (POST): Mengambil Direct Stream URL dari Multi-Instance API
  if (req.method === 'POST') {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL YouTube wajib diisi.' });

    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/v\/|.*\/embed\/))([^?&"#]+)/);
    const videoId = match ? match[1] : null;

    if (!videoId) {
      return res.status(400).json({ error: 'Video ID YouTube tidak valid.' });
    }

    const pipedInstances = [
      'https://pipedapi.kavin.rocks',
      'https://api.piped.private.coffee',
      'https://pipedapi.mha.fi'
    ];

    let rawStreamUrl = null;

    // Iterasi pencarian stream melalui beberapa instance
    for (const instance of pipedInstances) {
      try {
        const response = await fetch(`${instance}/streams/${videoId}`, {
          headers: { 'Accept': 'application/json' }
        });

        if (response.ok) {
          const data = await response.json();
          // Utamakan audioStream berformat m4a/webm/mp4
          const audio = data.audioStreams.find(a => a.mimeType.includes('audio/mp4') || a.mimeType.includes('m4a')) 
                     || data.audioStreams[0];

          if (audio && audio.url) {
            rawStreamUrl = audio.url;
            break;
          }
        }
      } catch (e) {
        continue;
      }
    }

    if (!rawStreamUrl) {
      return res.status(500).json({ error: 'Semua instance extractor sedang sibuk. Coba gunakan link lagu lain.' });
    }

    // Bungkus Direct URL ke Proxy Endpoint Vercel kamu sendiri
    const proxiedUrl = `/api/extract-audio?streamUrl=${encodeURIComponent(rawStreamUrl)}`;
    return res.status(200).json({ streamUrl: proxiedUrl });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
