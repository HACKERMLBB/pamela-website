const express = require('express');
const cors = require('cors');
const path = require('path');
const ytdlp = require('youtube-dl-exec');
const app = express();
app.use(cors());
app.use(express.json());

// 1. Website එක Serve කරනවා (index.html / player.html / downloader.html)
app.use(express.static(path.join(__dirname, '.')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// 2. yt-dlp Backend - Player එකට
app.get('/api/get-video', async (req, res) => {
  const url = req.query.url;
  if(!url) return res.json({ error: "No URL" });
  try {
    const out = await ytdlp(url, { getUrl: true, format: 'best[ext=mp4]/best', noWarnings: true, noPlaylist: true });
    const direct = out.trim().split("\n")[0];
    if(!direct) throw new Error("No URL");
    if(direct.includes(".m3u8")) return res.json({ m3u8: direct });
    return res.json({ direct });
  } catch(e) {
    try {
      const data = await ytdlp(url, { dumpSingleJson: true, noWarnings: true, noPlaylist: true });
      if(data && data.url) {
        if(data.url.includes(".m3u8")) return res.json({ m3u8: data.url });
        return res.json({ direct: data.url });
      }
      const formats = (data.formats || []).filter(f => f.url).map(f => ({ label: (f.height ? f.height + "p" : f.format_note) + " 💖", url: f.url }));
      if(formats.length) return res.json({ formats });
    } catch(e2) {}
    return res.json({ error: "yt-dlp failed: " + e.message });
  }
});

// 3. yt-dlp Backend - Downloader එකට
app.get('/api/get-qualities', async (req, res) => {
  const url = req.query.url;
  if(!url) return res.json({ error: "No URL" });
  try {
    const data = await ytdlp(url, { dumpSingleJson: true, noWarnings: true, noPlaylist: true });
    const formats = [];
    (data.formats || []).forEach(f => {
      if(!f.url) return;
      const isAudio = f.vcodec === "none";
      const height = f.height || 0;
      formats.push({ label: isAudio ? "🎵 Audio • " + (f.abr ? Math.round(f.abr) + " kbps" : "Audio") : "🎬 " + (height ? height + "p" : (f.format_note || "Video")) + " • " + (f.ext || ""), kind: isAudio ? "audio" : "video", ext: isAudio ? "mp3" : (f.ext || "mp4"), url: f.url, size: f.filesize || f.filesize_approx || 0, note: f.format_note || "", downloadUrl: f.url });
    });
    res.json({ title: data.title || "Video", thumbnail: data.thumbnail || "", formats: formats.slice(0, 20) });
  } catch(e) { res.json({ error: "failed" }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Pamela Website + Backend Running on " + PORT + " 💖"));
