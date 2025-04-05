const http = require("http");
const express = require("express");
const multer = require("multer");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Configure file uploads
const upload = multer({ dest: "uploads/" });
app.use("/uploads", express.static(path.resolve("./uploads")));

app.post("/upload", upload.single("file"), (req, res) => {
  res.json({
    filePath: `/uploads/${req.file.filename}`,
    fileName: req.file.originalname,
    mimeType: req.file.mimetype,
  });
});

// Serve static files
app.use(express.static(path.resolve("./public")));

const users = {};

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);
  users[socket.id] = { name: `User_${socket.id.substring(0, 4)}`, id: socket.id };
  io.emit("user-list", Object.values(users));
  io.emit("notification", { type: "connect", user: users[socket.id] });

  socket.on("update-username", (username) => {
    users[socket.id].name = username;
    io.emit("user-list", Object.values(users));
  });

  socket.on("typing", (data) => {
    socket.broadcast.emit("typing", { user: users[socket.id], isTyping: data.isTyping });
  });

  socket.on("user-message", (messageData) => {
    io.emit("message", { user: users[socket.id], ...messageData });
  });

  socket.on("disconnect", () => {
    const user = users[socket.id];
    delete users[socket.id];
    io.emit("user-list", Object.values(users));
    io.emit("notification", { type: "disconnect", user });
  });
});

server.listen(9000, () => console.log("Server running on http://localhost:9000"));
