const express = require("express");
const axios = require("axios");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static files from the root directory
app.use(express.static(__dirname));

// ── Fetch video info ──
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
      downloads: {
        "4K": v.hdplay || v.play,
        "1080p": v.play,
      },
    });
  } catch (err) {
    console.error("Fetch error:", err.message);
    return res.status(500).json({ error: "Server error. Try again shortly." });
  }
});

// ── Proxy the download ──
app.get("/api/download", async (req, res) => {
  const { url: videoUrl, filename } = req.query;

  if (!videoUrl) return res.status(400).send("Missing URL");

  try {
    const response = await axios.get(videoUrl, {
      responseType: "stream",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Referer": "https://www.tiktok.com/",
        "Accept": "*/*",
      },
    });

    res.setHeader("Content-Disposition", `attachment; filename="${filename || 'tiktok'}.mp4"`);
    res.setHeader("Content-Type", "video/mp4");

    if (response.headers["content-length"]) {
      res.setHeader("Content-Length", response.headers["content-length"]);
    }
    
    response.data.pipe(res);
  } catch (err) {
    console.error("Proxy error:", err.message);
    res.status(500).send("Download failed. The video link may have expired.");
  }
});

app.listen(PORT, () => {
  console.log(`TikTok Downloader running on http://localhost:${PORT}`);
});
