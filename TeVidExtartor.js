const ytdl = require("@distube/ytdl-core");
const ffmpeg = require("fluent-ffmpeg");
const axios = require("axios");

const getRandomProxy = async () => {
  try {
    const res = await axios.get(
      "https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=1000&country=all&ssl=all&anonymity=elite"
    );
    const proxies = res.data.split("\n").filter(Boolean);
    if (!proxies.length) return null;
    const randomProxy = proxies[Math.floor(Math.random() * proxies.length)];
    return `http://${randomProxy}`;
  } catch (error) {
    console.error("Error fetching proxies:", error);
    return null;
  }
};

const getURLVideo = async (videoId, type, res) => {
  try {
    const url = `https://www.youtube.com/watch?v=${videoId}`;

    const proxy = await getRandomProxy();
    console.log("Using proxy:", proxy);

    if (!proxy) {
      return res.status(500).json({ error: "No proxy available" });
    }

    // Use createProxyAgent from ytdl-core (this is correct)
    const agent = ytdl.createProxyAgent(proxy);

    const info = await ytdl.getInfo(url, {
      requestOptions: {
        agent,
      },
    });

    if (type === "mp4") {
      const format = ytdl.chooseFormat(info.formats, {
        quality: "highestvideo",
        filter: "audioandvideo",
      });

      if (!format || !format.url) {
        return res.status(400).json({ error: "Could not retrieve video URL." });
      }

      return res.json({ url: format.url });
    } else if (type === "mp3") {
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${info.videoDetails.title}.mp3"`
      );
      res.setHeader("Content-Type", "audio/mpeg");

      const audioStream = ytdl.downloadFromInfo(info, {
        quality: "highestaudio",
        filter: "audioonly",
      });

      ffmpeg(audioStream)
        .audioBitrate(128)
        .format("mp3")
        .on("error", (err) => {
          console.error("FFmpeg error:", err);
          if (!res.headersSent) res.status(500).send("Conversion error");
        })
        .pipe(res, { end: true });
    } else {
      return res.status(400).json({ error: "Invalid type requested." });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error retrieving video URL." });
  }
};

module.exports = { getURLVideo };
