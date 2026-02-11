// Lightweight, non-breaking diagnostics helper for video calls.
// Step 1: used to understand real-world environments and failure points
// before we change core call behavior.

export function collectCallEnvironment() {
  if (typeof window === "undefined") {
    return { isBrowser: false };
  }

  const nav = window.navigator || {};
  const mediaDevices = nav.mediaDevices || {};

  const hasRTCPeerConnection = typeof window.RTCPeerConnection === "function";
  const hasGetUserMedia =
    !!mediaDevices.getUserMedia || !!nav.getUserMedia || !!nav.webkitGetUserMedia || !!nav.mozGetUserMedia;

  const connection =
    nav.connection || nav.mozConnection || nav.webkitConnection || nav.msConnection || {};

  return {
    isBrowser: true,
    userAgent: nav.userAgent || "",
    platform: nav.platform || "",
    language: nav.language || "",
    hasRTCPeerConnection,
    hasGetUserMedia,
    connectionType: connection.effectiveType || connection.type || null,
    downlink: typeof connection.downlink === "number" ? connection.downlink : null,
    rtt: typeof connection.rtt === "number" ? connection.rtt : null,
    timestamp: Date.now(),
  };
}

/**
 * Emit a lightweight diagnostics event over the socket.
 * This is intentionally "best effort" and non-blocking.
 */
export function sendCallDiagnostics({ socket, sessionId, role }) {
  try {
    if (!socket) return;

    const env = collectCallEnvironment();

    const payload = {
      sessionId: sessionId || null,
      role: role || null,
      env,
    };

    // Use a raw string event name for now to avoid touching shared EVENT enums in Step 1.
    socket.emit("CLIENT_CALL_DIAGNOSTICS", payload);

    // Also log locally for quick inspection during manual testing.
    // eslint-disable-next-line no-console
    console.log("[CallDiagnostics] Sent diagnostics payload:", payload);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[CallDiagnostics] Failed to send diagnostics:", err);
  }
}


