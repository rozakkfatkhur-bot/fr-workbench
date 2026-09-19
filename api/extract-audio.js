// File: api/extract-audio.js

export default async function handler(req, res) {
  // 1. Set Header CORS Wajib untuk Web Audio API
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handshake Preflight Browser
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 2. Handling Stream Proxy (GET)
  if (req.method === 'GET') {
    const { streamUrl } = req.query;
    if (!streamUrl) return res.status(400).send('Stream URL tidak ditemukan.');

    try {
      const mediaResponse = await fetch(decodeURIComponent(streamUrl), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      });

      res.setHeader('Content-Type', mediaResponse.headers.get('content-type') || 'video/mp4');

      const arrayBuffer = await mediaResponse.arrayBuffer();
      return res.status(200).send(Buffer.from(arrayBuffer));
    } catch (err) {
      return res.status(500).send('Gagal melakukan streaming media.');
    }
  }

  // 3. Handling Extract Link (POST)
  if (req.method === 'POST') {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL YouTube wajib diisi.' });

    try {
      const response = await fetch('https://api.cobalt.tools/api/json', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: url,
          downloadMode: 'auto',
          videoQuality: '480'
        })
      });

      const data = await response.json();
      const directUrl = data.url || (data.picker && data.picker[0] ? data.picker[0].url : null);

      if (!directUrl) {
        return res.status(500).json({ error: 'Gagal mengekstrak URL dari Cobalt.' });
      }

      // Kirim URL yang sudah dibungkus proxy serverless kamu sendiri
      const proxiedStreamUrl = `/api/extract-audio?streamUrl=${encodeURIComponent(directUrl)}`;
      return res.status(200).json({ streamUrl: proxiedStreamUrl });

    } catch (error) {
      return res.status(500).json({ error: 'Terjadi kesalahan pada server.', details: error.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
