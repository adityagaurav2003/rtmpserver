import { AbrController } from "./abr-controller.js";
import { startFfmpeg, writeChunk } from "./ffmpeg-process.js";
import { isBroadcaster, emitToBroadcaster } from "./stream-session.js";
import { DEFAULT_PRESET } from "../shared/presets.js";

export function registerSocketHandlers(io, session) {
  const abr = new AbrController({
    onPresetChange(preset, meta) {
      if (!session.secretKey || !session.broadcasterId || session.pendingPreset) return;

      session.pendingPreset = preset;
      session.pendingReason = meta.reason;
      session.acceptBinary = false;
      console.log(
        `[ABR] switching ${session.preset} → ${preset} (p75=${Math.round(meta.p75Ms)}ms, ${meta.reason})`
      );
      emitToBroadcaster(io, session, "abr:switch", { preset, reason: meta.reason });
    },
  });

  io.on("connection", (socket) => {
    console.log("Socket Connected", socket.id);

    socket.on("stream:broadcaster", () => {
      session.broadcasterId = socket.id;
    });

    socket.on("abr:ping", (_clientTs, ack) => {
      if (typeof ack === "function") ack(Date.now());
    });

    socket.on("abr:latency", ({ rtt }) => {
      if (!isBroadcaster(socket, session)) return;
      socket.emit("abr:status", abr.recordLatency(rtt));
    });

    socket.on("abr:ready", async ({ preset }) => {
      if (!isBroadcaster(socket, session)) return;
      if (!session.pendingPreset || preset !== session.pendingPreset) return;

      try {
        await startFfmpeg(preset, session.secretKey);
        session.preset = preset;
        abr.setPreset(preset);

        const reason = session.pendingReason;
        session.pendingPreset = null;
        session.pendingReason = null;
        session.acceptBinary = true;

        emitToBroadcaster(io, session, "abr:quality", { ...abr.getStatus(), reason });
      } catch (err) {
        console.error("[ABR] switch failed:", err.message);
        session.pendingPreset = null;
        session.pendingReason = null;
        session.acceptBinary = true;
        emitToBroadcaster(io, session, "abr:restart", { preset: session.preset });
      }
    });

    socket.on("binarystream", (stream) => {
      if (!session.acceptBinary) return;
      writeChunk(stream);
    });

    socket.on("disconnect", () => {
      if (isBroadcaster(socket, session)) session.broadcasterId = null;
    });
  });

  return abr;
}

export async function startStream(session, abr, secretKey) {
  await startFfmpeg(DEFAULT_PRESET, secretKey);
  session.secretKey = secretKey;
  session.preset = DEFAULT_PRESET;
  abr.setPreset(DEFAULT_PRESET);
  return { preset: session.preset, abrTargetMs: abr.targetMs };
}
