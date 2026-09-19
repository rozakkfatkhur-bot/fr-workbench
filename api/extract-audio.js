// File: api/extract-audio.js
const ytdl = require('@distube/ytdl-core');

export default async function handler(req, res) {
  // 1. Set Header CORS Wajib untuk Web Audio API
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

  // 2. Handling Extract & Stream Audio Direct
  if (req.method === 'POST') {
    const { url } = req.body;

    if (!url || !ytdl.validateURL(url)) {
      return res.status(400).json({ error: 'URL YouTube tidak valid atau kosong.' });
    }

    try {
      // Inisialisasi Agent dengan Cookie dari Vercel Environment Variables
      let agent = null;
      if (process.env.YOUTUBE_COOKIES) {
        try {
          const cookies = JSON.parse(process.env.YOUTUBE_COOKIES);
          agent = ytdl.createAgent(cookies);
        } catch (e) {
          console.error("Gagal parsing YOUTUBE_COOKIES JSON:", e.message);
        }
      }

      const options = agent ? { agent } : {};

      // Dapatkan Info Video
      const info = await ytdl.getInfo(url, options);

      // Pilih format khusus audio dengan bitrate/kualitas tertinggi
      const format = ytdl.chooseFormat(info.formats, {
        filter: 'audioonly',
        quality: 'highestaudio'
      });

      if (!format || !format.url) {
        return res.status(404).json({ error: 'Format stream audio tidak ditemukan.' });
      }

      // Kirim URL Direct Audio ke Frontend (Bypass Proxy internal jika format.url sudah CORS-enabled)
      return res.status(200).json({ streamUrl: format.url });

    } catch (err) {
      console.error("YTDL Error:", err.message);
      return res.status(500).json({ 
        error: 'Gagal mengekstrak audio dari YouTube.', 
        details: err.message 
      });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
