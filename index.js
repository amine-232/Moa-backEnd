const express = require("express");
const app = express();
const cors = require("cors");
const { Users, GetUsers } = require("./DatabackUp");
const { MapToArray } = require("./ConverToMap");
const server = require("http").Server(app);

// server.js
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");
// 👇 Add these lines
const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");
const ffprobeInstaller = require("@ffprobe-installer/ffprobe");

const { VideoPorcessor } = require("./public/fireFunc");
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);
// Enable CORS

const upload = multer({ dest: "uploads/" });

app.use(express.static("public"));
app.use(cors({ origin: "*", methods: ["GET", "POST"] }));

app.use(express.json());

app.post(
  "/process",
  upload.fields([{ name: "video" }, { name: "audio" }]),
  (req, res) => VideoPorcessor(req, res)
);

app.post("/Get/User", (req, res) => {
  const { userId } = req.body;

  if (userId) {
    if (Users.size > 0) {
      res.json({ state: true, data: MapToArray(Users) });
    } else {
      GetUsers({ res });
    }
  }
});

server.listen(3000, () => {
  console.log("server is runing on port 3000 here");
});
