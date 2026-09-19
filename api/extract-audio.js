// File: api/extract-audio.js

export default async function handler(req, res) {
  // Set Header CORS Lengkap
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // A. BACA STREAMING (Proxy Mode via GET ?streamUrl=...)
  if (req.method === 'GET') {
    const { streamUrl } = req.query;
    if (!streamUrl) return res.status(400).send('Stream URL diperlukan');

    try {
      const mediaResponse = await fetch(decodeURIComponent(streamUrl), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      });

      res.setHeader('Content-Type', mediaResponse.headers.get('content-type') || 'video/mp4');
      
      // Ambil arrayBuffer lalu kirim sebagai Buffer
      const arrayBuffer = await mediaResponse.arrayBuffer();
      return res.status(200).send(Buffer.from(arrayBuffer));
    } catch (err) {
      return res.status(500).send('Gagal melakukan proxy stream media');
    }
  }

  // B. EKSTRAKSI LINK DARI COBALT (POST)
  if (req.method === 'POST') {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL YouTube diperlukan' });

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
          videoQuality: '480' // Gunakan resolusi ringan agar proxy Vercel cepat
        })
      });

      const data = await response.json();
      const directUrl = data.url || (data.picker && data.picker[0] ? data.picker[0].url : null);

      if (!directUrl) {
        return res.status(500).json({ error: 'Cobalt gagal mengekstrak link' });
      }

      // Bungkus direct URL ke endpoint Proxy Vercel kamu sendiri
      const proxiedStreamUrl = `/api/extract-audio?streamUrl=${encodeURIComponent(directUrl)}`;

      return res.status(200).json({ streamUrl: proxiedStreamUrl });
    } catch (error) {
      return res.status(500).json({ error: 'Terjadi kesalahan server', details: error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
