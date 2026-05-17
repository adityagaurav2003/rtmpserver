import { DEFAULT_PRESET } from "../shared/presets.js";

export function createStreamSession() {
  return {
    secretKey: null,
    preset: DEFAULT_PRESET,
    broadcasterId: null,
    acceptBinary: true,
    pendingPreset: null,
    pendingReason: null,
  };
}

export function isBroadcaster(socket, session) {
  return socket.id === session.broadcasterId;
}

export function emitToBroadcaster(io, session, event, payload) {
  if (session.broadcasterId) {
    io.to(session.broadcasterId).emit(event, payload);
  }
}
