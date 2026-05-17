import http from "http";
import path from "path";
import express from "express";
import { Server as SocketIO } from "socket.io";
import { createStreamSession } from "./lib/stream-session.js";
import { registerSocketHandlers, startStream } from "./lib/socket-handlers.js";

const app = express();
const server = http.createServer(app);
const io = new SocketIO(server);
const session = createStreamSession();
const abr = registerSocketHandlers(io, session);

app.use(express.static(path.resolve("./public")));
app.use("/shared", express.static(path.resolve("./shared")));
app.use(express.json());

app.post("/start-stream", async (req, res) => {
  const { secretKey } = req.body;
  if (!secretKey) return res.json({ success: false });
  try {
    const result = await startStream(session, abr, secretKey);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("start-stream error:", err.message);
    res.json({ success: false });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`HTTP Server is running on PORT ${PORT}`));
