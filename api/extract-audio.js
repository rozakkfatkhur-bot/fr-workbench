// File: api/extract-audio.js
const ytdl = require('@distube/ytdl-core');

export default async function handler(req, res) {
  // Set Header CORS Wajib
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // A. Mengambil Informasi Track (POST)
  if (req.method === 'POST') {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL kosong' });

    try {
      const isUrlValid = ytdl.validateURL(url);
      if (!isUrlValid) return res.status(400).json({ error: 'URL tidak valid' });

      // Return URL stream proxy Vercel itu sendiri
      const streamUrl = `/api/extract-audio?streamUrl=${encodeURIComponent(url)}`;
      return res.status(200).json({ streamUrl });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // B. Streaming Audio secara Direct / Native Pipe (GET)
  if (req.method === 'GET') {
    const { streamUrl } = req.query;
    if (!streamUrl) return res.status(400).send('No URL');

    const targetUrl = decodeURIComponent(streamUrl);

    try {
      let agent;
      
      // Load Cookies jika diset di Vercel Environment Variables
      if (process.env.YOUTUBE_COOKIES) {
        try {
          const cookies = JSON.parse(process.env.YOUTUBE_COOKIES);
          agent = ytdl.createAgent(cookies);
        } catch (e) {
          console.warn("Gagal parse YOUTUBE_COOKIES, melanjutkan tanpa cookie.");
        }
      }

      const options = {
        filter: 'audioonly',
        quality: 'highestaudio',
        requestOptions: {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          }
        }
      };

      if (agent) {
        options.agent = agent;
      }

      // Ambil metadata info terlebih dahulu untuk menentukan Mime Type yang presisi
      const info = await ytdl.getInfo(targetUrl, options);
      const format = ytdl.chooseFormat(info.formats, { filter: 'audioonly', quality: 'highestaudio' });

      // Atur Content-Type sesuai format asli (webm/mp4/m4a) agar Web Audio API / Player HTML5 lancar
      res.setHeader('Content-Type', format.mimeType || 'audio/webm');
      res.setHeader('Accept-Ranges', 'bytes');

      // Pipe stream langsung ke response
      ytdl.downloadFromInfo(info, { format })
        .on('error', (err) => {
          console.error("YTDL Stream Error:", err);
          if (!res.headersSent) res.status(500).send("Stream Error");
        })
        .pipe(res);

    } catch (err) {
      console.error("GET Extraction Error:", err);
      if (!res.headersSent) res.status(500).send(err.message);
    }
  }
}
