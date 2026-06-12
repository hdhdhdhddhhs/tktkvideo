const express = require("express");
const axios = require("axios");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// API to fetch video data
app.post("/api/fetch", async (req, res) => {
  const { url } = req.body;
  try {
    const response = await axios.post("https://www.tikwm.com/api/", new URLSearchParams({ url, hd: 1 }), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });
    res.json(response.data.data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch" });
  }
});

// API to proxy the download
app.get("/api/download", async (req, res) => {
  const { url } = req.query;
  try {
    const { data, headers } = await axios.get(url, {
      responseType: "stream",
      headers: { "User-Agent": "Mozilla/5.0", "Referer": "https://www.tiktok.com/" }
    });
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Disposition", "attachment; filename=video.mp4");
    data.pipe(res);
  } catch (err) {
    res.status(500).send("Download failed");
  }
});

app.listen(PORT, () => console.log(`Running on ${PORT}`));
