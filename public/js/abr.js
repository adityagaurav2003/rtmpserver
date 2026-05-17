import { ABR_PROBE_MS, ABR_TARGET_MS, DEFAULT_PRESET } from "/shared/presets.js";

export function createAbrUi(elements) {
  const { panel, quality, latency, health } = elements;

  function update(status, fallbackPreset) {
    if (!status) return;
    const latencyText =
      status.latencyMs != null ? `${Math.round(status.latencyMs)} ms` : "—";
    quality.textContent = status.preset ?? fallbackPreset;
    latency.textContent = latencyText;
    const healthy = status.sub200Maintained !== false;
    health.textContent = healthy
      ? `Maintaining <${ABR_TARGET_MS}ms RTT (${status.underTargetPct ?? 100}% samples)`
      : `Recovering — RTT above ${ABR_TARGET_MS}ms target`;
    health.classList.toggle("abr-healthy", healthy);
    health.classList.toggle("abr-degraded", !healthy);
    panel.hidden = false;
  }

  function initialStatus(preset = DEFAULT_PRESET) {
    return {
      preset,
      targetMs: ABR_TARGET_MS,
      sub200Maintained: true,
      underTargetPct: 100,
    };
  }

  return { update, initialStatus };
}

export function createLatencyProbe(socket, isStreaming) {
  let probeId = null;

  function measure() {
    if (!isStreaming()) return;
    const t0 = performance.now();
    socket.emit("abr:ping", t0, () => {
      socket.emit("abr:latency", { rtt: performance.now() - t0 });
    });
  }

  function start() {
    stop();
    measure();
    probeId = setInterval(measure, ABR_PROBE_MS);
  }

  function stop() {
    if (probeId != null) {
      clearInterval(probeId);
      probeId = null;
    }
  }

  return { start, stop };
}
