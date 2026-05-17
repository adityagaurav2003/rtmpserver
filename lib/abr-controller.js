import { PRESET_ORDER, DEFAULT_PRESET } from "../shared/presets.js";

const TARGET_LATENCY_MS = 200;
const UPGRADE_LATENCY_MS = 120;
const SAMPLE_WINDOW = 12;
const SWITCH_COOLDOWN_MS = 8_000;
const CONSECUTIVE_FOR_SWITCH = 3;
const MIN_SAMPLES_BEFORE_SWITCH = 8;
const MIN_STREAM_MS_BEFORE_UPGRADE = 30_000;

/**
 * Adaptive bitrate controller driven by WebSocket RTT samples.
 * Downgrades when p75 latency exceeds 200ms; upgrades when p75 stays under 120ms.
 */
export class AbrController {
  constructor({ onPresetChange, targetMs = TARGET_LATENCY_MS } = {}) {
    this.onPresetChange = onPresetChange;
    this.targetMs = targetMs;
    this.currentPreset = DEFAULT_PRESET;
    this.samples = [];
    this.lastSwitchAt = 0;
    this.downgradeStreak = 0;
    this.upgradeStreak = 0;
    this.sub200Maintained = true;
    this.streamStartedAt = 0;
    this.metrics = {
      samplesUnderTarget: 0,
      totalSamples: 0,
      lastP75Ms: null,
    };
  }

  recordLatency(rttMs) {
    if (!Number.isFinite(rttMs) || rttMs < 0) return this.getStatus();

    this.samples.push(rttMs);
    if (this.samples.length > SAMPLE_WINDOW) this.samples.shift();

    this.metrics.totalSamples += 1;
    if (rttMs < this.targetMs) this.metrics.samplesUnderTarget += 1;

    const p75 = percentile(this.samples, 75);
    this.metrics.lastP75Ms = p75;

    const underTargetRatio =
      this.samples.filter((s) => s < this.targetMs).length / this.samples.length;
    this.sub200Maintained = underTargetRatio >= 0.85;

    if (this.samples.length < MIN_SAMPLES_BEFORE_SWITCH) return this.getStatus();

    if (p75 > this.targetMs) {
      this.downgradeStreak += 1;
      this.upgradeStreak = 0;
    } else if (p75 < UPGRADE_LATENCY_MS) {
      this.upgradeStreak += 1;
      this.downgradeStreak = 0;
    } else {
      this.downgradeStreak = 0;
      this.upgradeStreak = 0;
    }

    if (Date.now() - this.lastSwitchAt < SWITCH_COOLDOWN_MS) {
      return this.getStatus();
    }

    const idx = PRESET_ORDER.indexOf(this.currentPreset);

    if (this.downgradeStreak >= CONSECUTIVE_FOR_SWITCH && idx > 0) {
      this.applyPreset(PRESET_ORDER[idx - 1], "latency_high", p75);
    } else if (
      this.upgradeStreak >= CONSECUTIVE_FOR_SWITCH &&
      idx < PRESET_ORDER.length - 1 &&
      Date.now() - this.streamStartedAt >= MIN_STREAM_MS_BEFORE_UPGRADE
    ) {
      this.applyPreset(PRESET_ORDER[idx + 1], "latency_low", p75);
    }

    return this.getStatus();
  }

  applyPreset(preset, reason, p75Ms) {
    if (preset === this.currentPreset) return;
    this.currentPreset = preset;
    this._resetSwitchState();
    this.onPresetChange?.(preset, { reason, p75Ms });
  }

  setPreset(preset) {
    this.currentPreset = preset;
    this._resetSwitchState();
    this.streamStartedAt = Date.now();
  }

  _resetSwitchState() {
    this.lastSwitchAt = Date.now();
    this.downgradeStreak = 0;
    this.upgradeStreak = 0;
  }

  getStatus() {
    const recent = this.samples.slice(-SAMPLE_WINDOW);
    const p75 = recent.length ? percentile(recent, 75) : null;
    return {
      preset: this.currentPreset,
      targetMs: this.targetMs,
      latencyMs: p75,
      sub200Maintained: this.sub200Maintained,
      sampleCount: this.samples.length,
      underTargetPct: this.metrics.totalSamples
        ? Math.round((this.metrics.samplesUnderTarget / this.metrics.totalSamples) * 100)
        : 100,
    };
  }
}

function percentile(sortedInput, p) {
  const arr = [...sortedInput].sort((a, b) => a - b);
  if (!arr.length) return null;
  const idx = Math.ceil((p / 100) * arr.length) - 1;
  return arr[Math.max(0, idx)];
}
