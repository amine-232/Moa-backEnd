const { alldl } = require("rahad-all-downloader");
// const { yt720, yt480, yt360 } = require("y2mate-dl");

const fs = require("fs");
const os = require("os");

const youtubedl = require("youtube-dl-exec");

const ytdl = require("@distube/ytdl-core");
const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const resolutionMap = {
  "144p": "256x144",
  "240p": "426x240",
  "360p": "640x360",
  "480p": "854x480",
  "720p": "1280x720",
  "1080p": "1920x1080",
  "1440p": "2560x1440",
  "2160p": "3840x2160",
  "4320p": "7680x4320",
};

// const downloadToCache = async ({
//   videoId,
//   type,
//   resolution,
//   res,
//   seekTime = 0,
// }) => {
//   if (!videoId) return res.status(400).send("Missing videoId");

//   const url = `https://www.youtube.com/watch?v=${videoId}`;
//   const filename = `${videoId}.${type}`;
//   const cacheDir = path.resolve("./cache");
//   const filePath = path.join(cacheDir, filename);

//   if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

//   // ✅ If file exists already in cache, just send it
//   if (fs.existsSync(filePath)) {
//     console.log("Serving from cache:", filePath);
//     return res.download(filePath, filename);
//   }

//   console.log("Downloading new file:", filename);

//   const stream = ytdl(url, {
//     quality: resolution ? Number(resolution) : "highest",
//   });

//   let command;

//   if (type === "mp3") {
//     command = ffmpeg(stream)
//       .format("mp3")
//       .audioBitrate(128)
//       .on("error", (err) => {
//         console.error("FFmpeg error:", err);
//         if (!res.headersSent) res.status(500).send("Conversion error");
//       })
//       .on("end", () => {
//         console.log("Finished converting to mp3");
//         res.download(filePath, filename); // send after conversion
//       })
//       .save(filePath); // save to cache
//   } else if (type === "mp4") {
//     command = stream
//       .pipe(fs.createWriteStream(filePath))
//       .on("finish", () => {
//         console.log("Finished saving mp4");
//         res.download(filePath, filename);
//       })
//       .on("error", (err) => {
//         console.error("Stream error:", err);
//         if (!res.headersSent) res.status(500).send("Streaming failed");
//       });
//   } else {
//     const formatMap = {
//       flv: { container: "flv", videoCodec: "flv", audioCodec: "libmp3lame" },
//       ts: { container: "mpegts", videoCodec: "libx264", audioCodec: "aac" },
//       mpeg: { container: "mpeg", videoCodec: "mpeg1video", audioCodec: "mp2" },
//     };

//     const { container, videoCodec, audioCodec } = formatMap[type];

//     command = ffmpeg(stream)
//       .format(container)
//       .videoCodec(videoCodec)
//       .audioCodec(audioCodec);

//     if (seekTime > 0) command.setStartTime(seekTime);

//     command
//       .on("error", (err) => {
//         console.error("FFmpeg error:", err);
//         if (!res.headersSent) res.status(500).send("Conversion error");
//       })
//       .on("end", () => {
//         console.log(`Finished converting to ${type}`);
//         res.download(filePath, filename);
//       })
//       .save(filePath);
//   }
// };

// Optional: structured logging function

const GetMedia = async (videoId, type, resolution, res) => {
  if (!videoId || !type) {
    return res.status(400).json({ error: "Missing videoId or type." });
  }

  const url = `https://www.youtube.com/watch?v=${videoId}`;

  const [width, height] = String(resolutionMap[resolution]).split("x");

  try {
    const info = await youtubedl(url, {
      dumpSingleJson: true,
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      youtubeSkipDashManifest: true,
    });

    if (!info.formats || info.formats.length === 0) {
      return res.status(404).json({ error: "No formats found." });
    }

    let format;

    if (type === "mp4") {
      const formatsWithVideoAudio = info.formats.filter(
        (f) => f.ext === "mp4" && f.vcodec !== "none" && f.acodec !== "none"
      );

      // Try exact resolution match
      format = formatsWithVideoAudio.find((f) => `${f.height}p` === resolution);

      if (!format) {
        // Sort descending by resolution and find the next best
        const sorted = formatsWithVideoAudio.sort(
          (a, b) => b.height - a.height
        );
        format =
          sorted.find(
            (f) => f.height <= parseInt(resolution.replace("p", ""), 10)
          ) || sorted[0];
      }
    } else if (type === "mp3") {
      // Pick best available audio-only stream
      const audioFormats = info.formats.filter(
        (f) => f.acodec !== "none" && f.vcodec === "none"
      );

      // Prefer mp3 or m4a
      format =
        audioFormats.find((f) => f.ext === "mp3") ||
        audioFormats.find((f) => f.ext === "m4a") ||
        audioFormats[0];
    } else {
      return res
        .status(400)
        .json({ error: "Invalid type, must be 'mp4' or 'mp3'." });
    }

    if (!format || !format.url) {
      return res.status(404).json({ error: "Suitable format not found." });
    }

    return res.json({ url: format.url });
  } catch (err) {
    console.error("GetMedia error:", err.stderr || err.message || err);
    return res.status(500).json({ error: "Failed to retrieve media." });
  }
};

//ytv('youtube link','quality','y2mate server')

// const videoUrlLink = require("video-url-link");

/**
 * 🔹 Download video temporarily to ./cache folder
 * Deletes after `expireMs` (default 10 minutes)
 */
// const downloadToCache = async (videoId, expireMs = 10 * 60 * 1000) => {
//   const url = `https://www.youtube.com/watch?v=${videoId}`;
//   const filePath = path.join(CACHE_DIR, `${videoId}.mp4`);

//   return new Promise((resolve, reject) => {
//     if (fs.existsSync(filePath)) {
//       console.log("Cached file exists:", filePath);
//       return resolve(filePath);
//     }

//     const stream = ytdl(url, { quality: "highest" });
//     const file = fs.createWriteStream(filePath);

//     stream.pipe(file);

//     stream.on("end", () => {
//       console.log("Download complete:", filePath);

//       // Schedule delete
//       setTimeout(() => {
//         fs.unlink(filePath, (err) => {
//           if (err) console.error("Delete error:", err);
//           else console.log(`Deleted temp file: ${filePath}`);
//         });
//       }, expireMs);

//       resolve(filePath);
//     });

//     stream.on("error", (err) => {
//       console.error("Download error:", err);
//       reject(err);
//     });
//   });
// };

// const videoId = req.params.videoId;
// const url = `https://youtu.be/${videoId}`;

// try {
//   const info = await ytmp3(url);
//   if (info.status) {
//     // Return JSON with MP3 download URL
//     res.json({
//       title: info.title,
//       size: info.size,
//       mp3Url: info.mp3,
//     });
//   } else {
//     res.status(404).json({ error: 'Audio not found' });
//   }
// } catch (err) {
//   res.status(500).json({ error: err.message });
// }
/**
 * 🔹 Stream video directly from YouTube to client
 * No file saved
 */
const streamVideoToResponse = (videoId, res) => {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  res.setHeader("Content-Type", "video/mp4");

  const stream = ytdl(url, {
    format: "mp4",
    quality: "highest",
  });

  stream.pipe(res);

  res.on("finish", () => {
    console.log(`Streaming finished for ${videoId}`);
  });

  stream.on("error", (err) => {
    console.error("Stream error:", err);
    res.status(500).send("Streaming failed");
  });
};

/**
 * 🔹 Get download links using rahad-all-downloader
 */
const getAllDownloadLinks = async (videoId) => {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  try {
    const result = await alldl(url);

    if (result) {
      console.log("Direct download link:", result);

      return result;
    }
  } catch (err) {
    console.error("alldl error:", err.message);
    throw err;
  }
};

const mimeMap = {
  mp4: "video/mp4",
  flv: "video/x-flv",
  ts: "video/mp2t",
  mpeg: "video/mpeg",
  mp3: "audio/mpeg",
};
const downloadToCache = async ({ videoId, type, res }) => {
  if (!videoId || !type) return res.status(400).send("Missing params");

  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const tmpFile = path.join(os.tmpdir(), `${videoId}.${type}`);

  try {
    if (type === "mp3") {
      // Still need FFmpeg to extract audio
      const audioStream = ytdl(url, { quality: "highestaudio" });

      await new Promise((resolve, reject) => {
        const ffmpegProcess = require("fluent-ffmpeg")(audioStream)
          .audioBitrate(128)
          .toFormat("mp3")
          .save(tmpFile)
          .on("end", resolve)
          .on("error", reject);

        res.on("close", () => ffmpegProcess.kill("SIGKILL"));
      });
    } else {
      // MP4 or other video formats — pick YouTube's highest combined stream
      const info = await ytdl.getInfo(url);
      const format = ytdl.chooseFormat(info.formats, {
        quality: "highest",
        filter: "audioandvideo",
      });

      if (!format) return res.status(400).send("No suitable format found");

      // Download directly without re-encoding
      await new Promise((resolve, reject) => {
        const videoStream = ytdl.downloadFromInfo(info, { format });
        const fileStream = fs.createWriteStream(tmpFile);

        videoStream.pipe(fileStream);

        videoStream.on("error", reject);
        fileStream.on("finish", resolve);
        fileStream.on("error", reject);

        res.on("close", () => videoStream.destroy());
      });
    }

    // Send file to client
    res.setHeader("Content-Type", mimeMap[type] || "application/octet-stream");
    res.download(tmpFile, `${videoId}.${type}`, (err) => {
      if (err) console.error("Download error:", err);
      fs.unlink(tmpFile, () => {});
    });
  } catch (err) {
    console.error("Download failed:", err);
    if (!res.headersSent) res.status(500).send("Download failed");
  }
};

// const downloadToCache = async (videoId, res) => {
// fetchAudio(`${videoId}`);
// fetchVideo(`${videoId}`);

// async function fetchAudio(videoId) {
//   const url = `https://youtu.be/${videoId}`;
//   const info = await ytmp3(url);
//   console.log("Audio info:", info);
// }

// };

module.exports = {
  downloadToCache,
  streamVideoToResponse,
  getAllDownloadLinks,
  GetMedia,
};
