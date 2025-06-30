const { UploadFile } = require("./FireBaseFunc");

const VideoPorcessor = (req, res) => {
  try {
    const {
      videoStartTime,
      videoEndTime,
      musicStartTime,
      musicEndTime,
      musicVolume,
    } = req.body;

    const video = req.files.video[0];
    const audio = req.files.audio[0];

    console.log("🎬 Received process request with:");
    console.log("videoStartTime:", videoStartTime);
    console.log("videoEndTime:", videoEndTime);
    console.log("musicStartTime:", musicStartTime);
    console.log("musicEndTime:", musicEndTime);
    console.log("musicVolume:", musicVolume);

    // Validate inputs
    const vStart = parseFloat(videoStartTime);
    const vEnd = parseFloat(videoEndTime);
    const mStart = parseFloat(musicStartTime);
    const mEnd = parseFloat(musicEndTime);
    const vol = parseFloat(musicVolume);

    if (
      isNaN(vStart) ||
      isNaN(vEnd) ||
      isNaN(mStart) ||
      isNaN(mEnd) ||
      isNaN(vol) ||
      vEnd <= vStart ||
      mEnd <= mStart
    ) {
      return res.status(400).send("Invalid time or volume parameters.");
    }

    const videoDuration = vEnd - vStart;
    const audioDuration = mEnd - mStart;

    // Ensure processed directory exists
    const processedDir = path.join(__dirname, "processed");
    if (!fs.existsSync(processedDir)) {
      fs.mkdirSync(processedDir);
      console.log("📁 Created processed directory.");
    } else {
      console.log("📁 Processed directory exists.");
    }

    const outputFileName = `output-${Date.now()}.mp4`;
    const outputPath = path.join(processedDir, outputFileName);
    console.log("📤 Output path:", outputPath);

    // Start processing with ffmpeg
    console.log("🎞️ Starting FFmpeg processing...");

    ffmpeg()
      // Input 0: video
      .input(video.path)
      .setStartTime(vStart)
      .setDuration(videoDuration)
      // Input 1: audio
      .input(audio.path)
      .seekInput(mStart)
      .setDuration(audioDuration)
      // Apply volume filter on audio input (index 1)
      .complexFilter([
        {
          filter: "volume",
          options: vol,
          inputs: "1:a",
          outputs: "a1",
        },
      ])
      .outputOptions([
        `-t ${Math.min(videoDuration, audioDuration)}`,
        "-map 0:v", // video from input 0
        "-map [a1]", // audio filtered from input 1
        "-c:v libx264",
        "-c:a aac",
        "-shortest",
        "-movflags +faststart", // improve mp4 streaming
      ])
      .output(outputPath)
      .on("start", (cmdLine) => {
        console.log("🛠 FFmpeg command:", cmdLine);
      })
      .on("progress", (progress) => {
        console.log(
          `🔄 Processing: ${
            progress.percent ? progress.percent.toFixed(2) : "?"
          }% done`
        );
      })
      .on("end", () => {
        console.log("✅ FFmpeg processing complete.");

        try {
          const stats = fs.statSync(outputPath);
          console.log("📦 Output file size (bytes):", stats.size);

          if (stats.size === 0) {
            console.error("❌ Output file is empty.");
            fs.unlinkSync(outputPath);
            return res.status(500).send("Empty output file.");
          }

          UploadFile(outputPath, "shorts");

          res.download(outputPath, (err) => {
            if (err) {
              console.error("❌ Error sending file:", err);
              return res.status(500).send("Error sending file.");
            }

            // Cleanup all temp files
            try {
              fs.unlinkSync(video.path);
              fs.unlinkSync(audio.path);
              fs.unlinkSync(outputPath);

              cleanUploads();
              console.log("🧹 Cleanup done.");
            } catch (cleanupErr) {
              console.warn("⚠️ Cleanup error:", cleanupErr);
            }
          });
        } catch (err) {
          console.error("❌ File error:", err);
          res.status(500).send("File processing error.");
        }
      })
      .on("error", (err) => {
        console.error("❌ FFmpeg error:", err);
        res.status(500).send("Processing error.");
      })
      .run();
  } catch (err) {
    console.error("❌ Unexpected error:", err);
    res.status(500).send("Unexpected server error.");
  }
};

const cleanUploads = () => {
  const uploadDir = path.join(__dirname, "uploads");
  fs.readdir(uploadDir, (err, files) => {
    if (err) return console.warn("⚠️ Uploads cleanup error:", err);

    for (const file of files) {
      const filePath = path.join(uploadDir, file);
      fs.unlink(filePath, (unlinkErr) => {
        if (unlinkErr) {
          console.warn("⚠️ Failed to delete file:", filePath, unlinkErr);
        }
      });
    }
  });
};

module.exports = { VideoPorcessor };
