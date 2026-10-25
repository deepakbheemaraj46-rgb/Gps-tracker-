const express = require("express");
const http = require("http");
const crypto = require("crypto");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

// Sessions are stored in memory only. They disappear when this server restarts.
const sessions = new Map();

app.use(express.json({ limit: "10kb" }));
app.use(express.static(path.join(__dirname, "public")));

function randomToken(bytes = 24) {
  return crypto.randomBytes(bytes).toString("hex");
}

app.post("/api/sessions", (req, res) => {
  const id = randomToken(8);
  const shareToken = randomToken();
  const viewerToken = randomToken();
  sessions.set(id, {
    shareToken,
    viewerToken,
    location: null,
    updatedAt: null,
    sharing: false
  });
  res.json({
    shareUrl: `/share/${id}?key=${shareToken}`,
    viewerUrl: `/view/${id}?key=${viewerToken}`
  });
});

app.get("/api/sessions/:id", (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found. It may have expired or the server restarted." });
  if (req.query.key !== session.viewerToken) return res.status(403).json({ error: "Invalid private viewer link." });
  res.json({
    location: session.location,
    updatedAt: session.updatedAt,
    sharing: session.sharing
  });
});

io.use((socket, next) => {
  const { sessionId, role, key } = socket.handshake.auth || {};
  const session = sessions.get(sessionId);
  if (!session) return next(new Error("Session not found. Create a new sharing session."));
  if (role === "sharer" && key === session.shareToken) {
    socket.sessionId = sessionId;
    socket.role = role;
    return next();
  }
  if (role === "viewer" && key === session.viewerToken) {
    socket.sessionId = sessionId;
    socket.role = role;
    return next();
  }
  return next(new Error("Invalid sharing link."));
});

io.on("connection", (socket) => {
  const session = sessions.get(socket.sessionId);
  if (!session) return socket.disconnect(true);
  socket.join(socket.sessionId);

  if (socket.role === "viewer") {
    socket.emit("location-state", {
      location: session.location,
      updatedAt: session.updatedAt,
      sharing: session.sharing
    });
  }

  socket.on("location-update", (data) => {
    if (socket.role !== "sharer") return;
    if (!data || typeof data.latitude !== "number" || typeof data.longitude !== "number") return;
    if (!Number.isFinite(data.latitude) || !Number.isFinite(data.longitude)) return;
    if (data.latitude < -90 || data.latitude > 90 || data.longitude < -180 || data.longitude > 180) return;

    session.location = {
      latitude: data.latitude,
      longitude: data.longitude,
      accuracy: Number.isFinite(data.accuracy) ? Math.max(0, data.accuracy) : null
    };
    session.updatedAt = new Date().toISOString();
    session.sharing = true;
    io.to(socket.sessionId).emit("location-state", {
      location: session.location,
      updatedAt: session.updatedAt,
      sharing: true
    });
  });

  socket.on("sharing-stopped", () => {
    if (socket.role !== "sharer") return;
    session.sharing = false;
    session.location = null;
    session.updatedAt = new Date().toISOString();
    io.to(socket.sessionId).emit("location-state", {
      location: null,
      updatedAt: session.updatedAt,
      sharing: false
    });
  });
});

app.get("/share/:id", (req, res) => res.sendFile(path.join(__dirname, "public", "share.html")));
app.get("/view/:id", (req, res) => res.sendFile(path.join(__dirname, "public", "view.html")));
app.get("/health", (req, res) => res.json({ ok: true }));

server.listen(PORT, () => console.log(`Live GPS sharing server listening on ${PORT}`));
