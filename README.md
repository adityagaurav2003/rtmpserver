# 🎥 Streamyard 

This project is a simple yet powerful web app that lets you **live stream your webcam to YouTube Live** using a dynamic YouTube Live secret key.  
It’s built with **Node.js, Express.js, Socket.io, and ffmpeg**, and is fully **Dockerized** for easy deployment on platforms like Render.

---

## 🌟 Key Features

✅ **Dynamic Secret Key** – Users can enter their **own** YouTube Live secret key directly in the browser.  
✅ **Live Streaming** – Uses **MediaRecorder** to capture webcam & mic, and streams in real time.  
✅ **Streaming to YouTube** – Powered by `ffmpeg`, streams to the YouTube Live RTMP endpoint.  
✅ **Dockerized** – The app is packaged in a Docker container, ensuring it runs the same anywhere.  
✅ **Modern UI** – Stylish and user-friendly interface with neon-themed controls.  
✅ **Basic Controls** – Pause, stop, mute, and hide video buttons for flexibility.

---

## 🌍 Live Demo

👉 **Live App Link**: [https://livestream-l58f.onrender.com](https://livestream-l58f.onrender.com)  
✅ Visit this URL, **allow camera & mic access**  
✅ Enter your **YouTube Live secret key** (from YouTube Studio)  
✅ Click **Start Streaming** – your webcam will start streaming to YouTube Live!

---

## 💻 How It Works

1️⃣ **Client Side**:  
- HTML & JavaScript load a video preview from your camera/mic.  
- The **Start Streaming** button sends the secret key to the backend.  
- Uses **MediaRecorder** to capture video/audio and send binary chunks via WebSockets.

2️⃣ **Backend (Node.js + Express + Socket.io)**:  
- Receives the secret key and starts an **ffmpeg process** with that key.  
- Streams the binary data chunks to ffmpeg’s stdin.  
- ffmpeg then pushes the live video to **YouTube Live** using RTMP.

3️⃣ **Docker & Render**:  
- Render deploys your app using the **Dockerfile** in the repo.  
- Render assigns a dynamic port (`process.env.PORT`), and the app listens on that.  
- Your app becomes globally accessible at the Render-provided URL.

---

## ⚙️ Tech Stack

- **Node.js** – JavaScript runtime for backend.  
- **Express.js** – Web framework for HTTP server.  
- **Socket.io** – Real-time binary data transport.  
- **ffmpeg** – Industry-standard tool for video streaming.  
- **Docker** – Containerized environment for portability.  
- **Render** – Cloud deployment platform.

---

## 📦 How to Deploy (Render)

1️⃣ **Connect Your GitHub Repo to Render**  
2️⃣ **Render Builds Your Docker Image**  
   - Installs ffmpeg & Node.js  
   - Installs your app dependencies  
3️⃣ **Render Starts Your App**  
   - It listens on `process.env.PORT`  
   - It’s accessible to anyone with the Render URL.

---

## 🚨 Important Security Note

Anyone visiting the live Render URL can stream to **any YouTube Live key** they have.  
For private usage:  
- ✅ Add **basic authentication** to restrict usage  
- ✅ Or limit access via Render’s IP-based firewall  
- ⚠️ Never share your YouTube Live secret key publicly!




To run locally for testing:  
```bash
git clone https://github.com/adityagaurav2003/livestream.git
cd livestream
npm install
node index.js
docker compose up
