const express = require("express");
const axios = require("axios");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ── Fetch video info + download links via tikwm.com (free, no key needed) ──
app.post("/api/fetch", async (req, res) => {
  const { url } = req.body;

  if (!url || (!url.includes("tiktok.com") && !url.includes("vm.tiktok.com"))) {
    return res.status(400).json({ error: "Invalid TikTok URL" });
  }

  try {
    const response = await axios.post(
      "https://www.tikwm.com/api/",
      new URLSearchParams({ url, count: 12, cursor: 0, web: 1, hd: 1 }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const data = response.data;

    if (!data || data.code !== 0) {
      return res.status(400).json({ error: "Could not fetch video. Make sure the link is public." });
    }

    const v = data.data;

    return res.json({
      title: v.title || "TikTok Video",
      author: v.author?.nickname || "unknown",
      username: "@" + (v.author?.unique_id || "unknown"),
      cover: v.cover,
      duration: v.duration,
      play_count: v.play_count,
      // no-watermark versions
      downloads: {
        "4K":    v.hdplay || v.play,
        "1080p": v.play,
        "720p":  v.wmplay || v.play,
        "MP3":   v.music,
      },
    });
  } catch (err) {
    console.error("Fetch error:", err.message);
    return res.status(500).json({ error: "Server error. Try again shortly." });
  }
});

// ── Proxy the download so the browser gets a file instead of a redirect ──
app.get("/api/download", async (req, res) => {
  const { url: videoUrl, filename } = req.query;

  if (!videoUrl) return res.status(400).send("Missing URL");

  try {
    const stream = await axios.get(videoUrl, {
      responseType: "stream",
      headers: {
        Referer: "https://www.tiktok.com/",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      },
    });

    const ext = filename && filename.endsWith(".mp3") ? "mp3" : "mp4";
    const safeName = (filename || "tiktok_video").replace(/[^a-z0-9_\-\.]/gi, "_");

    res.setHeader("Content-Disposition", `attachment; filename="${safeName}.${ext}"`);
    res.setHeader("Content-Type", ext === "mp3" ? "audio/mpeg" : "video/mp4");

    if (stream.headers["content-length"]) {
      res.setHeader("Content-Length", stream.headers["content-length"]);
    }

    stream.data.pipe(res);
  } catch (err) {
    console.error("Download error:", err.message);
    res.status(500).send("Download failed");
  }
});

app.listen(PORT, () => {
  console.log(`TikTok Downloader running on http://localhost:${PORT}`);
});
