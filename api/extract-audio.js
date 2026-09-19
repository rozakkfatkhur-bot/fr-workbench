// File: api/extract-audio.js

export default async function handler(req, res) {
  // Atur Header CORS biar nggak diblokir browser
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
    // Memanggil API Extractor dari Vercel Serverless
    const response = await fetch('https://api.cobalt.tools/api/json', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: url,
        downloadMode: 'audio',
        audioFormat: 'mp3'
      })
    });

    const data = await response.json();

    if (!data.url) {
      return res.status(500).json({ error: 'Gagal mengekstrak audio dari link tersebut' });
    }

    return res.status(200).json({ streamUrl: data.url });
  } catch (error) {
    return res.status(500).json({ error: 'Terjadi kesalahan server', details: error.message });
  }
}
