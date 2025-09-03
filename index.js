const express = require("express");
const app = express();
const cors = require("cors");
const { Users, GetUsers } = require("./DatabackUp");
const { MapToArray } = require("./ConverToMap");
const server = require("http").Server(app);
const { Server } = require("socket.io");

// server.js
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
// 👇 Add these lines
const ffmpegInstaller = require("@ffmpeg-installer/ffmpeg");
const ffprobeInstaller = require("@ffprobe-installer/ffprobe");

const { VideoPorcessor } = require("./public/fireFunc");
const { scrapeYouTubeVideoSrc } = require("./public/ExtractUrl");
const {
  GetVideos,
  publicVideoMap,
  keyWorList,
} = require("./public/YoutubeApi");
const { downloadToCache, streamVideoToResponse } = require("./ExtractContent");
const { MapData } = require("./TESTdata");
const { getURLVideo } = require("./TeVidExtartor");
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);
// Enable CORS
app.use(bodyParser.json({ limit: "50mb" })); // allow large chunks

//room socket

const io = new Server(server, {
  cors: { origin: "http://localhost:8081", methods: ["GET", "POST"] },
});

const users = new Map(); // userId -> socketId
const rooms = new Map(); // roomId -> room data

// ===== Socket.IO =====
io.on("connection", (socket) => {
  console.log("🔌 New client:", socket.id);

  if (rooms.size > 0) {
    io.to(socket.id).emit("rooms", MapToArray(rooms));
  }
  socket.on("register", (userId) => {
    users.set(userId, socket.id);
    socket.userId = userId;
    console.log(`✅ register: ${userId} (${socket.id})`);

    if (users.size > 0) {
      io.emit("userList", Array.from(users.keys()));
    }
  });

  socket.on("create-room", ({ roomId, userData }) => {
    console.log(`✅ create-room: ${userData.userId} (${roomId})`);

    const room = {
      peerId: userData.userId,
      requestGuest: new Map(),
      users: new Map(),
      hostId: userData.userId,
      guest: new Map(),
      moderators: new Map(),
      socketId: socket.id,
      streams: new Map(),
      hostData: userData,
    };
    rooms.set(roomId, room);

    socket.join(roomId);
    const data = {
      hostId: room.hostId,
      users: MapToArray(room.users),
      requestGuest: MapToArray(room.requestGuest),
      moderators: MapToArray(room.moderators),
      streams: MapToArray(room.streams),
      hostData: room.hostData,
    };

    io.to(roomId).emit("get-room", data);

    io.emit("rooms", MapToArray(rooms));
  });
  // Join room (for group calls)
  socket.on("joinRoom", ({ roomId, userData }) => {
    if (rooms.has(roomId)) {
      const room = rooms.get(roomId);
      room.users.set(userData.userId, {
        moderator: false,
        peerId: userData.userId,
        socketId: socket.id,
        userData: userData,
      });
      socket.join(roomId);
      console.log(
        ` socket id: ${socket.id} assign to user ${userData.userId} has joined roomId: ${roomId}`
      );
      const data = {
        hostId: room.hostId,
        users: MapToArray(room.users),
        requestGuest: MapToArray(room.requestGuest),
        moderators: MapToArray(room.moderators),
        streams: MapToArray(room.streams),
        hostData: room.hostData,
      };

      io.to(roomId).emit("get-room", { ...data });

      // Notify others in the room
      io.to(roomId).emit("newPeer", {
        NewUserId: socket.userId,
        hostId: room.hostId,
      });
    }
  });
  // request to join the users room
  socket.on("make-request", ({ userId, roomId }) => {
    console.log("🔌 make-request:", userId, roomId);

    if (rooms.has(roomId)) {
      const room = rooms.get(roomId);
      const reqGuest = room.requestGuest;
      const dateAndTime = new Date().getTime();

      if (!reqGuest.has(userId)) {
        reqGuest.set(userId, { time: dateAndTime, userId: userId });
        const userData = room?.users.get(userId)?.userData;
        io.to(roomId).emit("request-made", {
          data: MapToArray(reqGuest),
          hostId: room.hostId,
          userData: userData,
        });
      }
    }
  });

  socket.on("request-accept", ({ userId, toUserId, roomId }) => {
    console.log(`✅ request-accept: ${userId} to ${toUserId}  (${roomId})`);
    if (rooms.has(roomId)) {
      const room = rooms.get(roomId);
      const RequestList = room.requestGuest;
      const guest = room.guest;
      const dateAndTime = new Date().getTime();

      if (RequestList.has(toUserId)) {
        if (!guest.has(toUserId)) {
          guest.set(toUserId, { userId: toUserId, date: dateAndTime });
        }
        RequestList.delete(toUserId);
      }

      if (users.has(toUserId)) {
        const user = users.get(toUserId);
        console.log(`✅ request-accept: ${user}`);
        socket.to(user).emit("guest-accept", {
          toUserId: toUserId,
          state: true,
          fromUser: userId,
        });
      }
      io.to(roomId).emit("guestList", { data: MapToArray(guest) });
    }
  });

  socket.on("start-stream", ({ roomId, userId, role, type, userData }) => {
    console.log(
      `✅ starting stream: ${roomId} ${userId} ${role}  ${type} ${userData}`
    );

    if (rooms.has(roomId)) {
      const room = rooms.get(roomId);
      if (type !== null) {
        if (room.streams.has(userId)) {
          room.streams.delete(userId);
        }

        const data = {
          peerId: userId,
          role,
          hostId: room.hostId,
          type: type,
          userData,
        };

        room.streams.set(userId, { ...data });

        io.to(roomId).emit("new-stream", {
          data: data,
        });
      }
    }
  });

  socket.on("mute-stream", ({ roomId, peerId, mute, role, content }) => {
    console.log(` sute-stream: `, roomId, peerId, mute, role, content);

    io.to(roomId).emit("get-muted", { peerId, mute, role, content });
  });

  socket.on("stop-stream", ({ roomId, userId, role }) => {
    console.log(`❌ stop stream: ${roomId} ${userId} ${role}`);
    if (rooms.has(roomId)) {
      const room = rooms.get(roomId);
      if (room.streams.has(userId)) {
        room.streams.delete(userId);
      }
    }

    io.to(roomId).emit("stream-close", { roomId, peerId: userId, role });
  });

  socket.on("message", ({ message, roomId, userId }) => {
    console.log("messages", message, roomId, userId);
    if (rooms.has(roomId)) {
      const room = rooms.get(roomId);

      if (room.hostId === userId) {
        console.log(`✅ message: ${message} ${roomId} ${userId}`);
        const time = new Date().getTime();

        io.to(roomId).emit("new-message", {
          from: userId,
          roomId,
          msg: { message: message, time: time, userData: { ...room.hostData } },
        });
      }
      if (room.users.has(userId)) {
        const users = room.users.get(userId);

        console.log(`✅ message: ${message} ${roomId} ${userId}`);
        const time = new Date().getTime();
        io.to(roomId).emit("new-message", {
          from: userId,
          roomId,
          msg: {
            message: message,
            time: time,
            userData: { ...users.userData },
          },
        });
      }
    }
  });

  // Offer
  socket.on("offer", ({ to, offer }) => {
    const target = users.get(to);
    if (target) io.to(target).emit("offer", { from: socket.userId, offer });
  });

  // Answer
  socket.on("answer", ({ to, answer }) => {
    const target = users.get(to);
    if (target) io.to(target).emit("answer", { from: socket.userId, answer });
  });

  // ICE
  socket.on("ice", ({ to, candidate }) => {
    const target = users.get(to);
    if (target) io.to(target).emit("ice", { from: socket.userId, candidate });
  });

  // Disconnect
  socket.on("disconnect", () => {
    if (socket.userId) {
      rooms.entries().forEach((r) => {
        if (r[1].hostId === socket.userId) {
          io.to(r[0]).emit("room-Closed", { roomId: r[0] });
          rooms.delete(r[0]);
        }
        if (rooms.has(r[0]) && rooms.get(r[0]).users.has(socket.userId)) {
          io.to(r[0]).emit("user-Left", { LefUuserId: socket.userId });

          const room = rooms.get(r[0]);
          const users = room.users;
          if (users.has(socket.userId)) {
            users.delete(socket.userId);
          }
        }
      });
      users.delete(socket.userId);
      io.emit("userList", Array.from(users.keys()));
      console.log(`❌ Disconnected: ${socket.userId}`);
    }
  });
});

//  youtube Api

const upload = multer({ dest: "uploads/" });

app.use(express.static("public"));
app.use(cors({ origin: "*", methods: ["GET", "POST"] }));

app.use(express.json());

app.post(
  "/process",
  upload.fields([{ name: "video" }, { name: "audio" }]),
  (req, res) => VideoPorcessor(req, res)
);

// GetVideos();

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

app.post("/Get/YVideos", (req, res) => {
  const { userId } = req.body;
  console.log("YVideos", userId);
  if (userId) {
    res.json({
      data: MapData,
    });
  }
});

app.post("/Get/YKeyWord", (req, res) => {
  const { userId, keyWord } = req.body;
  console.log("YKeyWord", userId);

  if (keyWord) {
    const List = MapToArray(publicVideoMap)?.filter((item) =>
      item.title?.toLowerCase().includes(keyWord.toLowerCase())
    );

    res.json({ data: MapToArray(List) });
  }
});
app.post("/Get/GetVideUrl", (req, res) => {
  const { videoId } = req.body;
  console.log("videoId", videoId);

  if (videoId) {
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`; // Example
    scrapeYouTubeVideoSrc(youtubeUrl)
      .then((src) => {
        if (src) {
          console.log("✅ Video source found:", src);
          res.json({ url: String(src) });
        } else {
          console.log("❌ Failed to get video source.");
        }
      })
      .catch((e) => {
        console.log("❌ Failed Error", e);
      });
  }
});
app.get("/stream/:videoId", (req, res) => {
  const { videoId } = req.params;
  const { type, resolution, seekTime } = req.query;

  if (videoId) {
    console.log(
      "videoId",
      videoId,
      "type",
      type,
      "resolution",
      resolution,
      "seekTime",
      seekTime
    );
    downloadToCache({
      videoId,
      type,
      res,
      resolution,
      seekTime: Number(seekTime),
    });
  }
});

app.post("/getYVideo", (req, res) => {
  const { videoId, type } = req.body;

  if (videoId && type) {
    console.log("videoId getYVideo", videoId, type);
    downloadToCache({ videoId, type, res });
  }
});

server.listen(3000, () => {
  console.log("server is runing on port 3000 heresc");
});
