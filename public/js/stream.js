import { createMediaRecorder } from "./media.js";

export function createStreamController(socket, state) {
  function onChunk(ev) {
    if (state.blockChunks || !ev.data?.size) return;
    socket.emit("binarystream", ev.data);
  }

  function startRecorder(preset) {
    if (!state.media) return;
    state.currentPreset = preset;
    state.mediaRecorder = createMediaRecorder(state.media, preset, onChunk);
    state.mediaRecorder.start(25);
  }

  function stopRecorder() {
    if (state.mediaRecorder?.state !== "inactive") {
      state.mediaRecorder.stop();
    }
    state.mediaRecorder = null;
  }

  function stopRecorderAsync() {
    return new Promise((resolve) => {
      const recorder = state.mediaRecorder;
      if (!recorder || recorder.state === "inactive") {
        state.mediaRecorder = null;
        resolve();
        return;
      }

      recorder.addEventListener(
        "stop",
        () => {
          state.mediaRecorder = null;
          resolve();
        },
        { once: true }
      );

      try {
        if (recorder.state === "recording") recorder.requestData();
      } catch (_) { /* ignore */ }
      recorder.stop();
    });
  }

  /** After ABR switch — recorder was already stopped; always start fresh WebM */
  function startRecorderAfterSwitch(preset) {
    if (!state.media || !state.isStreaming) return;
    state.currentPreset = preset;
    state.mediaRecorder = createMediaRecorder(state.media, preset, onChunk);
    state.mediaRecorder.start(25);
    if (state.abrWasPaused) {
      state.mediaRecorder.pause();
      state.abrWasPaused = false;
    }
  }

  function applyPreset(preset) {
    if (!state.isStreaming || preset === state.currentPreset) return;
    const wasPaused = state.mediaRecorder?.state === "paused";
    stopRecorder();
    startRecorder(preset);
    if (wasPaused) state.mediaRecorder.pause();
  }

  return {
    startRecorder,
    stopRecorder,
    stopRecorderAsync,
    startRecorderAfterSwitch,
    applyPreset,
  };
}
