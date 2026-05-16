/** FFmpeg + client capture settings per output tier */
export const PRESETS = {
  "360p": {
    height: 360,
    maxrate: "800k",
    bufsize: "1600k",
    crf: "28",
    profile: "baseline",
    level: "3.0",
    videoBitsPerSecond: 800_000,
  },
  "720p": {
    height: 720,
    maxrate: "2500k",
    bufsize: "5000k",
    crf: "25",
    profile: "main",
    level: "3.1",
    videoBitsPerSecond: 2_500_000,
  },
  "1080p": {
    height: 1080,
    maxrate: "4500k",
    bufsize: "9000k",
    crf: "23",
    profile: "high",
    level: "4.0",
    videoBitsPerSecond: 4_500_000,
  },
};

export const PRESET_ORDER = ["360p", "720p", "1080p"];

export const DEFAULT_PRESET = "720p";

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
