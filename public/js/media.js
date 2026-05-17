import { PRESETS, DEFAULT_PRESET } from "/shared/presets.js";

const RECORDER_MIME_CANDIDATES = [
  "video/webm;codecs=vp8,opus",
  "video/webm;codecs=vp9,opus",
  "video/webm",
];

function getRecorderMimeType() {
  return RECORDER_MIME_CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

export function createMediaRecorder(media, preset, onChunk) {
  const capture = PRESETS[preset] ?? PRESETS[DEFAULT_PRESET];
  const options = {
    audioBitsPerSecond: 128_000,
    videoBitsPerSecond: capture.videoBitsPerSecond,
  };
  const mimeType = getRecorderMimeType();
  if (mimeType) options.mimeType = mimeType;

  const recorder = new MediaRecorder(media, options);
  recorder.ondataavailable = onChunk;
  return recorder;
}

export async function initCamera(videoEl) {
  const media = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
  videoEl.srcObject = media;
  return media;
}
