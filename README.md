# 🎥 Streamyard

A production-grade browser-based live streaming app that streams your webcam directly to **YouTube Live via RTMP**, featuring **Adaptive Bitrate (ABR) switching** driven by real-time WebSocket RTT measurement.

Built with **Node.js, Express.js, Socket.io, and FFmpeg** — fully Dockerized for deployment on Render or any container platform.

---

## 🌟 Key Features

- **Adaptive Bitrate Switching** — Automatically switches between 360p / 720p / 1080p based on real-time WebSocket round-trip latency, maintaining sub-200ms streaming quality.
- **P75 Latency Algorithm** — Uses a 12-sample sliding window and 75th-percentile RTT (not raw spikes) for stable, noise-resistant quality decisions.
- **Graceful Preset Handoff** — On quality switch, chunk sending is paused, MediaRecorder is restarted at the new bitrate, and FFmpeg is respawned — no corrupt frames mid-stream.
- **Dynamic Secret Key** — Users enter their own YouTube Live stream key directly in the browser; no server-side key storage.
- **Multi-stage Media Pipeline** — MediaRecorder API → Socket.io binary transport → FFmpeg stdin → YouTube RTMP endpoint.
- **Session Health Tracking** — Live ABR panel shows current quality tier, RTT latency, and % of session time spent under the 200ms target.
- **Basic Controls** — Pause, resume, stop, mute, and hide video with full MediaRecorder lifecycle management.
- **Dockerized** — Single `docker compose up` runs the full stack anywhere.

---

## 🌍 Live Demo

👉 **[https://livestream-l58f.onrender.com](https://livestream-l58f.onrender.com)**

1. Visit the URL and allow camera & mic access
2. Enter your YouTube Live stream key (from YouTube Studio → Go Live → Stream Key)
3. Click **Start Streaming** — your webcam streams to YouTube Live instantly

---

## ⚙️ How Adaptive Bitrate Works

```
Client (browser)
  │
  ├─ ping/pong every 2s ──────────────────────► Server
  │   measures RTT via performance.now()        records P75 over 12-sample window
  │
  ├─ emits abr:latency { rtt } ──────────────► AbrController.recordLatency()
  │                                              evaluates downgrade/upgrade streak
  │
  ◄── abr:switch { preset } ─────────────────── triggers if streak ≥ 3 consecutive
  │
  ├─ blockChunks = true
  ├─ stopMediaRecorder()
  ├─ emits abr:ready { preset } ─────────────► server spawns new FFmpeg process
  │
  ◄── abr:quality { preset, latencyMs, ... } ── switch complete
  │
  ├─ blockChunks = false
  └─ startMediaRecorder(newPreset)
```

### Quality Tiers

| Preset | Resolution | Max Bitrate | Buffer | H.264 Profile |
|--------|-----------|-------------|--------|---------------|
| 360p   | 640×360   | 800 kbps    | 1600k  | Baseline 3.0  |
| 720p   | 1280×720  | 2500 kbps   | 5000k  | Main 3.1      |
| 1080p  | 1920×1080 | 4500 kbps   | 9000k  | High 4.0      |

### Switch Logic

| Condition | Action |
|-----------|--------|
| P75 RTT > 200ms for 3 consecutive readings | Downgrade one tier |
| P75 RTT < 120ms for 3 consecutive readings | Upgrade one tier |
| Any switch | 8-second cooldown before next switch |
| Stream age < 30s | Upgrades blocked (stabilisation period) |
| Fewer than 8 samples | No decision made yet |

---

## 💻 Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js (ESM) |
| HTTP server | Express.js |
| Real-time transport | Socket.io (binary frames) |
| Video encoding | FFmpeg (libx264 + AAC, ultrafast + zerolatency) |
| ABR engine | Custom `AbrController` (P75 sliding window) |
| Containerisation | Docker + Docker Compose |
| Deployment | Render |

---

## 🗂️ Project Structure

```
rtmpserver/
├── index.js                 # Express server, Socket.io events, FFmpeg process manager
├── lib/
│   ├── abr-controller.js    # ABR engine — P75 latency, streak detection, preset switching
│   └── ffmpeg-presets.js    # Per-tier FFmpeg args (resolution, bitrate, H.264 profile)
├── public/
│   ├── index.html           # UI — video preview, stream key input, ABR status panel
│   └── script.js            # Client ABR — ping/pong, MediaRecorder lifecycle, preset handoff
├── Dockerfile
├── docker-compose.yml
└── package.json
```

---

## 🚀 Run Locally

### With Node.js

```bash
git clone https://github.com/adityagaurav2003/livestream.git
cd livestream
npm install
node index.js
```

Open [http://localhost:3000](http://localhost:3000)

> **Requires:** FFmpeg installed and available on PATH (`brew install ffmpeg` / `apt install ffmpeg`)

### With Docker

```bash
docker compose up
```

Open [http://localhost:3000](http://localhost:3000)

> FFmpeg is bundled in the Docker image — no local install needed.

---

## ☁️ Deploy to Render

1. Push your repo to GitHub
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your GitHub repo
4. Render auto-detects the `Dockerfile` and builds the image
5. Set environment variables if needed (none required by default)
6. Deploy — Render assigns a public URL and handles `process.env.PORT` automatically

---

## 🚨 Security Notes

- Anyone with the Render URL can stream using their own YouTube key — the app does not store or validate keys server-side.
- For private/team use:
  - Add HTTP Basic Auth via an Express middleware
  - Restrict access via Render's IP allowlist
  - Never share or commit your YouTube Live stream key

---

## 📊 ABR Panel (Live UI)

During streaming, the ABR status panel shows:

- **Quality** — current preset (360p / 720p / 1080p)
- **Latency** — latest P75 RTT in milliseconds
- **Health** — whether sub-200ms target is being maintained, and % of session samples under target

---

## 📄 License

MIT
