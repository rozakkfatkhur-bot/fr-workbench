// File: api/extract-audio.js

export default async function handler(req, res) {
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

  // A. POST METHOD: Ekstrak Stream dari Link YouTube
  if (req.method === 'POST') {
    let { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL YouTube diperlukan' });

    // Hapus query tracking seperti ?si=... jika terbawa
    url = url.split('&si=')[0].split('?si=')[0];

    try {
      const response = await fetch('https://api.cobalt.tools/api/json', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        },
        body: JSON.stringify({
          url: url,
          downloadMode: 'auto',
          videoQuality: '480'
        })
      });

      const data = await response.json();

      let directUrl = null;
      if (data.url) {
        directUrl = data.url;
      } else if (data.picker && data.picker.length > 0) {
        directUrl = data.picker[0].url;
      }

      if (!directUrl) {
        return res.status(500).json({ 
          error: 'Cobalt gagal ekstrak link.', 
          cobaltResponse: data 
        });
      }

      // Bungkus dengan proxy serverless Vercel kamu
      const proxiedStreamUrl = `/api/extract-audio?streamUrl=${encodeURIComponent(directUrl)}`;
      return res.status(200).json({ streamUrl: proxiedStreamUrl });

    } catch (error) {
      return res.status(500).json({ error: 'Kesalahan Server', details: error.message });
    }
  }

  // B. GET METHOD: Stream Proxy agar Bebas Blokir CORS
  if (req.method === 'GET') {
    const { streamUrl } = req.query;
    if (!streamUrl) return res.status(400).send('Stream URL tidak ditemukan');

    try {
      const mediaResponse = await fetch(decodeURIComponent(streamUrl));
      res.setHeader('Content-Type', mediaResponse.headers.get('content-type') || 'video/mp4');
      
      const arrayBuffer = await mediaResponse.arrayBuffer();
      return res.status(200).send(Buffer.from(arrayBuffer));
    } catch (err) {
      return res.status(500).send('Proxy streaming gagal');
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
