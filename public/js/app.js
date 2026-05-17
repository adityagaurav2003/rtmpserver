import { DEFAULT_PRESET } from "/shared/presets.js";
import { initCamera } from "./media.js";
import { createAbrUi, createLatencyProbe } from "./abr.js";
import { createStreamController } from "./stream.js";
import { bindStreamControls } from "./controls.js";

const socket = io();

const state = {
  media: null,
  mediaRecorder: null,
  isStreaming: false,
  currentPreset: DEFAULT_PRESET,
  blockChunks: false,
  abrWasPaused: false,
};

const ui = {
  video: document.getElementById("user-video"),
  secretKey: document.getElementById("secretKeyInput"),
  start: document.getElementById("start-btn"),
  pause: document.getElementById("pause-btn"),
  resume: document.getElementById("resume-btn"),
  stop: document.getElementById("stop-btn"),
  mute: document.getElementById("mute-btn"),
  hide: document.getElementById("hide-btn"),
  connection: document.getElementById("connection-status"),
  abr: {
    panel: document.getElementById("abr-panel"),
    quality: document.getElementById("abr-quality"),
    latency: document.getElementById("abr-latency"),
    health: document.getElementById("abr-health"),
  },
};

const abrUi = createAbrUi(ui.abr);
const latencyProbe = createLatencyProbe(socket, () => state.isStreaming);
const stream = createStreamController(socket, state);

const controls = bindStreamControls(ui, state, {
  async onStart() {
    const secretKey = ui.secretKey.value.trim();
    if (!secretKey) return alert("Enter a secret key!");

    socket.emit("stream:broadcaster");

    const res = await fetch("/start-stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secretKey }),
    });
    const data = await res.json();
    if (!data.success) return alert("Failed to start streaming.");
    if (!state.media) return alert("Camera & Mic access needed!");

    state.isStreaming = true;
    stream.startRecorder(data.preset ?? DEFAULT_PRESET);
    abrUi.update(abrUi.initialStatus(data.preset ?? DEFAULT_PRESET));
    latencyProbe.start();
    controls.setStreamingActive(true);
  },
  onStop() {
    state.isStreaming = false;
    latencyProbe.stop();
    stream.stopRecorder();
  },
});

socket.on("connect", () => controls.setConnected(true));
socket.on("disconnect", () => {
  controls.setConnected(false);
  latencyProbe.stop();
});

socket.on("abr:status", (status) => abrUi.update(status, state.currentPreset));

socket.on("abr:switch", async ({ preset }) => {
  if (!state.isStreaming) return;
  state.blockChunks = true;
  state.abrWasPaused = state.mediaRecorder?.state === "paused";
  await stream.stopRecorderAsync();
  socket.emit("abr:ready", { preset });
});

socket.on("abr:quality", (status) => {
  abrUi.update(status, state.currentPreset);
  state.blockChunks = false;
  stream.startRecorderAfterSwitch(status.preset);
});

socket.on("abr:restart", ({ preset }) => {
  state.blockChunks = false;
  stream.startRecorderAfterSwitch(preset ?? state.currentPreset);
});

window.addEventListener("load", async () => {
  try {
    state.media = await initCamera(ui.video);
  } catch (error) {
    console.error("Error accessing camera/microphone", error);
    alert("Failed to access camera/microphone. Please allow permissions.");
  }
});
