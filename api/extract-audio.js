// File: api/extract-audio.js

export default async function handler(req, res) {
  // Header CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL YouTube diperlukan' });
  }

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
        // Gunakan 'auto' agar Cobalt mengembalikan video + audio gabungan (Progressive Stream)
        downloadMode: 'auto',
        videoQuality: '720'
      })
    });

    const data = await response.json();

    // Cobalt API bisa mengembalikan URL di data.url atau di data.picker jika ada opsi kualitas
    const streamUrl = data.url || (data.picker && data.picker[0] ? data.picker[0].url : null);

    if (!streamUrl) {
      console.error("Cobalt Error Response:", data);
      return res.status(500).json({ 
        error: 'Gagal mengekstrak stream. Cobalt membalas dengan status lain.', 
        cobaltStatus: data.status || 'unknown' 
      });
    }

    return res.status(200).json({ streamUrl: streamUrl });
  } catch (error) {
    return res.status(500).json({ error: 'Terjadi kesalahan server', details: error.message });
  }
}
