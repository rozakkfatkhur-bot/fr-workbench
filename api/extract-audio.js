// File: api/extract-audio.js

export default async function handler(req, res) {
  // Set Header CORS
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

  // A. POST METHOD: Ekstrak Stream
  if (req.method === 'POST') {
    let { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL YouTube diperlukan' });

    // 1. Dapatkan Video ID dari URL
    const videoIdMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:.*v=|.*\/v\/|.*\/embed\/))([^?&"#]+)/);
    const videoId = videoIdMatch ? videoIdMatch[1] : null;

    if (!videoId) {
      return res.status(400).json({ error: 'Format link YouTube tidak valid' });
    }

    const cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;
    let directUrl = null;

    // METODE 1: Coba via Cobalt API
    try {
      const cobaltRes = await fetch('https://api.cobalt.tools/api/json', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0'
        },
        body: JSON.stringify({
          url: cleanUrl,
          downloadMode: 'auto',
          videoQuality: '360'
        })
      });

      const cobaltData = await cobaltRes.json();
      if (cobaltData.url) {
        directUrl = cobaltData.url;
      } else if (cobaltData.picker && cobaltData.picker.length > 0) {
        directUrl = cobaltData.picker[0].url;
      }
    } catch (e) {
      console.warn("Cobalt API failed, trying fallback...");
    }

    // METODE 2: Fallback ke Public Invidious Instance jika Cobalt gagal
    if (!directUrl) {
      const invidiousInstances = [
        'https://invidious.nerdvpn.de',
        'https://inv.tux.pizza',
        'https://vid.puffyan.us'
      ];

      for (const instance of invidiousInstances) {
        try {
          const invRes = await fetch(`${instance}/api/v1/videos/${videoId}`);
          if (invRes.ok) {
            const invData = await invRes.json();
            // Cari format video + audio gabungan (progressive formats)
            const format = invData.formatStreams.find(f => f.qualityL === '360p' || f.qualityL === '720p') || invData.formatStreams[0];
            if (format && format.url) {
              directUrl = format.url;
              break;
            }
          }
        } catch (e) {
          continue;
        }
      }
    }

    if (!directUrl) {
      return res.status(500).json({ 
        error: 'Semua server extractor sibuk. Coba gunakan link YouTube lain atau coba beberapa saat lagi.' 
      });
    }

    // Bungkus direct URL ke Proxy internal Vercel
    const proxiedStreamUrl = `/api/extract-audio?streamUrl=${encodeURIComponent(directUrl)}`;
    return res.status(200).json({ streamUrl: proxiedStreamUrl });
  }

  // B. GET METHOD: Proxy Streaming (Menembus CORS)
  if (req.method === 'GET') {
    const { streamUrl } = req.query;
    if (!streamUrl) return res.status(400).send('Stream URL tidak ditemukan');

    try {
      const mediaResponse = await fetch(decodeURIComponent(streamUrl), {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      res.setHeader('Content-Type', mediaResponse.headers.get('content-type') || 'video/mp4');
      
      const arrayBuffer = await mediaResponse.arrayBuffer();
      return res.status(200).send(Buffer.from(arrayBuffer));
    } catch (err) {
      return res.status(500).send('Proxy streaming gagal');
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
