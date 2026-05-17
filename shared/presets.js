/** Shared quality tiers — used by server (FFmpeg) and client (MediaRecorder) */
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
export const ABR_TARGET_MS = 200;
export const ABR_PROBE_MS = 2_000;
