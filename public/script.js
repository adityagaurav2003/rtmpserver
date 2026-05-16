const userVideo = document.getElementById("user-video");
const startButton = document.getElementById("start-btn");
const secretKeyInput = document.getElementById("secretKeyInput");
const abrPanel = document.getElementById("abr-panel");
const abrQuality = document.getElementById("abr-quality");
const abrLatency = document.getElementById("abr-latency");
const abrHealth = document.getElementById("abr-health");

const pauseButton = document.createElement("button");
pauseButton.textContent = "Pause Stream";
document.body.appendChild(pauseButton);

const resumeButton = document.createElement("button");
resumeButton.textContent = "Resume Stream";
resumeButton.style.display = "none";
document.body.appendChild(resumeButton);

const stopButton = document.createElement("button");
stopButton.textContent = "Stop Stream";
document.body.appendChild(stopButton);

const muteButton = document.createElement("button");
muteButton.textContent = "Mute";
document.body.appendChild(muteButton);

const hideButton = document.createElement("button");
hideButton.textContent = "Hide Video";
document.body.appendChild(hideButton);

const connectionStatus = document.createElement("p");
connectionStatus.textContent = "Socket Disconnected";
connectionStatus.style.color = "red";
document.body.appendChild(connectionStatus);

const CAPTURE_PRESETS = {
  "360p": { videoBitsPerSecond: 800_000 },
  "720p": { videoBitsPerSecond: 2_500_000 },
  "1080p": { videoBitsPerSecond: 4_500_000 },
};

const ABR_PROBE_MS = 2_000;
const ABR_TARGET_MS = 200;

const state = {
  media: null,
  mediaRecorder: null,
  isStreaming: false,
  currentPreset: "720p",
  latencyProbeId: null,
  blockChunks: false,
};

const socket = io();

function getRecorderMimeType() {
  const candidates = [
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=vp9,opus",
    "video/webm",
  ];
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
}

function updateAbrUi(status) {
  if (!status) return;
  const latency =
    status.latencyMs != null ? `${Math.round(status.latencyMs)} ms` : "—";
  abrQuality.textContent = status.preset ?? state.currentPreset;
  abrLatency.textContent = latency;
  const healthy = status.sub200Maintained !== false;
  abrHealth.textContent = healthy
    ? `Maintaining <${ABR_TARGET_MS}ms RTT (${status.underTargetPct ?? 100}% samples)`
    : `Recovering — RTT above ${ABR_TARGET_MS}ms target`;
  abrHealth.classList.toggle("abr-healthy", healthy);
  abrHealth.classList.toggle("abr-degraded", !healthy);
  abrPanel.hidden = false;
}

function createMediaRecorder(preset) {
  const capture = CAPTURE_PRESETS[preset] ?? CAPTURE_PRESETS["720p"];
  const mimeType = getRecorderMimeType();
  const options = {
    audioBitsPerSecond: 128_000,
    videoBitsPerSecond: capture.videoBitsPerSecond,
  };
  if (mimeType) options.mimeType = mimeType;

  const recorder = new MediaRecorder(state.media, options);
  recorder.ondataavailable = (ev) => {
    if (state.blockChunks || !ev.data?.size) return;
    socket.emit("binarystream", ev.data);
  };
  return recorder;
}

function startMediaRecorder(preset) {
  if (!state.media) return;
  state.currentPreset = preset;
  state.mediaRecorder = createMediaRecorder(preset);
  state.mediaRecorder.start(25);
}

function stopMediaRecorder() {
  if (state.mediaRecorder && state.mediaRecorder.state !== "inactive") {
    state.mediaRecorder.stop();
  }
  state.mediaRecorder = null;
}

function applyCapturePreset(preset) {
  if (!state.isStreaming || preset === state.currentPreset) return;
  const wasPaused = state.mediaRecorder?.state === "paused";
  stopMediaRecorder();
  startMediaRecorder(preset);
  if (wasPaused) state.mediaRecorder.pause();
}

function measureAndReportLatency() {
  if (!state.isStreaming) return;
  const t0 = performance.now();
  socket.emit("abr:ping", t0, () => {
    const rtt = performance.now() - t0;
    socket.emit("abr:latency", { rtt });
  });
}

function startLatencyProbe() {
  stopLatencyProbe();
  measureAndReportLatency();
  state.latencyProbeId = setInterval(measureAndReportLatency, ABR_PROBE_MS);
}

function stopLatencyProbe() {
  if (state.latencyProbeId != null) {
    clearInterval(state.latencyProbeId);
    state.latencyProbeId = null;
  }
}

socket.on("connect", () => {
  connectionStatus.textContent = "Socket Connected";
  connectionStatus.style.color = "green";
});

socket.on("disconnect", () => {
  connectionStatus.textContent = "Socket Disconnected";
  connectionStatus.style.color = "red";
  stopLatencyProbe();
});

socket.on("abr:status", updateAbrUi);

socket.on("abr:switch", ({ preset }) => {
  if (!state.isStreaming) return;
  state.blockChunks = true;
  stopMediaRecorder();
  socket.emit("abr:ready", { preset });
});

socket.on("abr:quality", (status) => {
  updateAbrUi(status);
  state.blockChunks = false;
  applyCapturePreset(status.preset);
});

startButton.addEventListener("click", async () => {
  const secretKey = secretKeyInput.value.trim();
  if (!secretKey) return alert("Enter a secret key!");

  socket.emit("stream:broadcaster");

  const res = await fetch("/start-stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secretKey }),
  });
  const data = await res.json();
  if (!data.success) {
    alert("Failed to start streaming.");
    return;
  }

  if (!state.media) return alert("Camera & Mic access needed!");

  state.isStreaming = true;
  startMediaRecorder(data.preset ?? "720p");
  updateAbrUi({
    preset: data.preset ?? "720p",
    targetMs: data.abrTargetMs ?? ABR_TARGET_MS,
    sub200Maintained: true,
    underTargetPct: 100,
  });
  startLatencyProbe();

  startButton.disabled = true;
  stopButton.disabled = false;
  pauseButton.disabled = false;
});

pauseButton.addEventListener("click", () => {
  if (state.mediaRecorder && state.mediaRecorder.state === "recording") {
    state.mediaRecorder.pause();
    pauseButton.style.display = "none";
    resumeButton.style.display = "inline-block";
  }
});

resumeButton.addEventListener("click", () => {
  if (state.mediaRecorder && state.mediaRecorder.state === "paused") {
    state.mediaRecorder.resume();
    resumeButton.style.display = "none";
    pauseButton.style.display = "inline-block";
  }
});

stopButton.addEventListener("click", () => {
  state.isStreaming = false;
  stopLatencyProbe();
  stopMediaRecorder();
  startButton.disabled = false;
  pauseButton.disabled = true;
  stopButton.disabled = true;
  resumeButton.style.display = "none";
  pauseButton.style.display = "inline-block";
});

muteButton.addEventListener("click", () => {
  state.media.getAudioTracks().forEach((track) => {
    track.enabled = !track.enabled;
    muteButton.textContent = track.enabled ? "Mute" : "Unmute";
  });
});

hideButton.addEventListener("click", () => {
  state.media.getVideoTracks().forEach((track) => {
    track.enabled = !track.enabled;
    hideButton.textContent = track.enabled ? "Hide Video" : "Show Video";
  });
});

window.addEventListener("load", async () => {
  try {
    const media = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });
    state.media = media;
    userVideo.srcObject = media;
  } catch (error) {
    console.error("Error accessing camera/microphone", error);
    alert("Failed to access camera/microphone. Please allow permissions.");
  }
});
