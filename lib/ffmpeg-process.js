import { spawn } from "child_process";
import { buildFfmpegArgs } from "./ffmpeg-presets.js";

let ffmpegProcess = null;
const FFMPEG_STOP_TIMEOUT_MS = 500;

function attachHandlers(proc) {
  proc.stderr.on("data", (d) => console.error("ffmpeg:", d.toString()));
  proc.on("close", (c) => {
    console.log("ffmpeg exited with code:", c);
    if (ffmpegProcess === proc) ffmpegProcess = null;
  });
  proc.on("error", (err) => console.error("ffmpeg spawn error:", err.message));
}

export function stopFfmpeg() {
  return new Promise((resolve) => {
    if (!ffmpegProcess) {
      resolve();
      return;
    }

    const proc = ffmpegProcess;
    ffmpegProcess = null;

    const done = () => resolve();
    proc.once("close", done);
    setTimeout(done, FFMPEG_STOP_TIMEOUT_MS);

    try {
      proc.stdin.end();
    } catch (_) { /* ignore */ }
    proc.kill("SIGINT");
  });
}

export async function startFfmpeg(preset, secretKey) {
  await stopFfmpeg();
  ffmpegProcess = spawn("ffmpeg", buildFfmpegArgs(preset, secretKey));
  attachHandlers(ffmpegProcess);
  return ffmpegProcess;
}

export function writeChunk(stream) {
  if (!ffmpegProcess?.stdin?.writable) return;
  ffmpegProcess.stdin.write(stream, (err) => {
    if (err) console.error("stdin write error", err);
  });
}
