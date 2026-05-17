import { PRESETS, DEFAULT_PRESET } from "../shared/presets.js";

export { PRESETS, DEFAULT_PRESET } from "../shared/presets.js";

export function buildFfmpegArgs(presetKey, secretKey) {
  const p = PRESETS[presetKey] ?? PRESETS[DEFAULT_PRESET];
  return [
    "-f", "webm",
    "-i", "-",
    "-vf", `scale=-2:${p.height}:flags=fast_bilinear`,
    "-c:v", "libx264", "-preset", "ultrafast", "-tune", "zerolatency",
    "-r", "25", "-g", "50", "-keyint_min", "25",
    "-crf", p.crf,
    "-maxrate", p.maxrate, "-bufsize", p.bufsize,
    "-pix_fmt", "yuv420p", "-sc_threshold", "0",
    "-profile:v", p.profile, "-level", p.level,
    "-c:a", "aac", "-b:a", "128k", "-ar", "32000",
    "-f", "flv",
    `rtmp://a.rtmp.youtube.com/live2/${secretKey}`,
  ];
}
