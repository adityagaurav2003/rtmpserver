export function bindStreamControls(ui, state, actions) {
  const { start, pause, resume, stop, mute, hide, connection } = ui;

  start.addEventListener("click", actions.onStart);
  pause.addEventListener("click", () => {
    if (state.mediaRecorder?.state === "recording") {
      state.mediaRecorder.pause();
      pause.style.display = "none";
      resume.style.display = "inline-block";
    }
  });
  resume.addEventListener("click", () => {
    if (state.mediaRecorder?.state === "paused") {
      state.mediaRecorder.resume();
      resume.style.display = "none";
      pause.style.display = "inline-block";
    }
  });
  stop.addEventListener("click", () => {
    actions.onStop();
    start.disabled = false;
    pause.disabled = true;
    stop.disabled = true;
    resume.style.display = "none";
    pause.style.display = "inline-block";
  });
  mute.addEventListener("click", () => {
    state.media.getAudioTracks().forEach((track) => {
      track.enabled = !track.enabled;
      mute.textContent = track.enabled ? "Mute" : "Unmute";
    });
  });
  hide.addEventListener("click", () => {
    state.media.getVideoTracks().forEach((track) => {
      track.enabled = !track.enabled;
      hide.textContent = track.enabled ? "Hide Video" : "Show Video";
    });
  });

  return {
    setConnected(connected) {
      connection.textContent = connected ? "Socket Connected" : "Socket Disconnected";
      connection.style.color = connected ? "green" : "red";
    },
    setStreamingActive(active) {
      start.disabled = active;
      stop.disabled = !active;
      pause.disabled = !active;
    },
  };
}
