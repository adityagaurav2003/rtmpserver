import http from "http";
import path from "path";
import { spawn } from "child_process";
import express from "express";
import { Server as SocketIO } from "socket.io";
import { AbrController } from "./lib/abr-controller.js";
import { buildFfmpegArgs, DEFAULT_PRESET } from "./lib/ffmpeg-presets.js";

const app = express();
const server = http.createServer(app);
const io = new SocketIO(server);

let ffmpegProcess = null;
const streamSession = {
  secretKey: null,
  preset: DEFAULT_PRESET,
  broadcasterId: null,
  acceptBinary: true,
  pendingPreset: null,
  pendingReason: null,
};

const abr = new AbrController({
  onPresetChange: (preset, meta) => {
    if (!streamSession.secretKey || !streamSession.broadcasterId) return;
    if (streamSession.pendingPreset) return;

    streamSession.pendingPreset = preset;
    streamSession.pendingReason = meta.reason;
    streamSession.acceptBinary = false;
    console.log(
      `[ABR] switching ${streamSession.preset} → ${preset} (p75=${Math.round(meta.p75Ms)}ms, ${meta.reason})`
    );

    io.to(streamSession.broadcasterId).emit("abr:switch", {
      preset,
      reason: meta.reason,
    });
  },
});

function completeAbrSwitch(preset) {
  if (!streamSession.secretKey) return;

  startFfmpeg(preset, streamSession.secretKey);
  const reason = streamSession.pendingReason;
  streamSession.pendingPreset = null;
  streamSession.pendingReason = null;
  streamSession.acceptBinary = true;

  const status = abr.getStatus();
  if (streamSession.broadcasterId) {
    io.to(streamSession.broadcasterId).emit("abr:quality", {
      ...status,
      reason,
    });
  }
}

function attachFfmpegHandlers(proc) {
  proc.stderr.on("data", (d) => console.error("ffmpeg:", d.toString()));
  proc.on("close", (c) => {
    console.log("ffmpeg exited with code:", c);
    if (ffmpegProcess === proc) ffmpegProcess = null;
  });
}

function startFfmpeg(preset, secretKey) {
  if (ffmpegProcess) {
    try {
      ffmpegProcess.stdin.end();
    } catch (_) { /* ignore */ }
    ffmpegProcess.kill("SIGINT");
  }

  streamSession.preset = preset;
  streamSession.secretKey = secretKey;
  abr.setPreset(preset);

  const options = buildFfmpegArgs(preset, secretKey);
  ffmpegProcess = spawn("ffmpeg", options);
  ffmpegProcess.on("error", (err) => {
    console.error("ffmpeg spawn error:", err.message);
  });
  attachFfmpegHandlers(ffmpegProcess);
}

app.use(express.static(path.resolve("./public")));
app.use(express.json());

app.post("/start-stream", (req, res) => {
  const { secretKey } = req.body;
  if (!secretKey) return res.json({ success: false });

  startFfmpeg(DEFAULT_PRESET, secretKey);

  res.json({
    success: true,
    preset: streamSession.preset,
    abrTargetMs: abr.targetMs,
  });
});

io.on("connection", (socket) => {
  console.log("Socket Connected", socket.id);

  socket.on("stream:broadcaster", () => {
    streamSession.broadcasterId = socket.id;
  });

  socket.on("abr:ping", (_clientTs, ack) => {
    if (typeof ack === "function") ack(Date.now());
  });

  socket.on("abr:latency", ({ rtt }) => {
    if (socket.id !== streamSession.broadcasterId) return;
    const status = abr.recordLatency(rtt);
    socket.emit("abr:status", status);
  });

  socket.on("abr:ready", ({ preset }) => {
    if (socket.id !== streamSession.broadcasterId) return;
    if (!streamSession.pendingPreset || preset !== streamSession.pendingPreset) return;
    completeAbrSwitch(preset);
  });

  socket.on("binarystream", (stream) => {
    if (!streamSession.acceptBinary) return;
    if (ffmpegProcess?.stdin?.writable) {
      ffmpegProcess.stdin.write(stream, (err) => {
        if (err) console.error("stdin write error", err);
      });
    }
  });

  socket.on("disconnect", () => {
    if (socket.id === streamSession.broadcasterId) {
      streamSession.broadcasterId = null;
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`HTTP Server is running on PORT ${PORT}`));
