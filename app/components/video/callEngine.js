// Unified WebRTC/PeerJS call engine for portrait-calling and other call UIs.
// Step 2: normalize PeerJS init, ICE config, and connection lifecycle in ONE place.

import { toast } from "react-toastify";
import { EVENTS } from "../../../helpers/events";

// Attempt to load webrtc-adapter to normalize WebRTC behavior across
// Safari/Firefox/Edge/Chrome. If it's not installed yet, we log a warning
// but do not break runtime – the app will still use native implementations.
let adapterLoaded = false;
if (typeof window !== "undefined" && !adapterLoaded) {
  try {
    // eslint-disable-next-line global-require
    require("webrtc-adapter");
    adapterLoaded = true;
    // eslint-disable-next-line no-console
    console.log("[CallEngine] webrtc-adapter loaded");
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(
      "[CallEngine] webrtc-adapter not available; continuing without shim. " +
        "Install it via `npm install webrtc-adapter` for best cross-browser support.",
      e
    );
  }
}

// Fallback ICE servers to ensure basic connectivity when backend does not provide any.
// NOTE: Replace these with your production TURN servers / managed TURN later.
const DEFAULT_ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
];

export function buildIceConfig(startMeetingIceServers) {
  try {
    if (Array.isArray(startMeetingIceServers) && startMeetingIceServers.length > 0) {
      return { iceServers: startMeetingIceServers };
    }

    if (
      startMeetingIceServers &&
      typeof startMeetingIceServers === "object" &&
      Array.isArray(startMeetingIceServers.iceServers)
    ) {
      return { iceServers: startMeetingIceServers.iceServers };
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[CallEngine] Failed to parse startMeeting.iceServers, falling back to defaults:", e);
  }

  return { iceServers: DEFAULT_ICE_SERVERS };
}

export class CallEngine {
  constructor({ PeerLib, socket, fromUser, toUser, sessionId, startMeeting }) {
    this.PeerLib = PeerLib;
    this.socket = socket;
    this.fromUser = fromUser;
    this.toUser = toUser;
    this.sessionId = sessionId;
    this.startMeeting = startMeeting;

    this.peer = null;
    this.activeCall = null;
    this.isConnecting = false;
    this.connectionTimeoutId = null;
  }

  createPeer() {
    if (!this.PeerLib) {
      throw new Error("PeerJS library is not available");
    }

    const uniquePeerId = `${this.fromUser._id}_${this.sessionId}_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;

    const config = buildIceConfig(this.startMeeting?.iceServers);

    // eslint-disable-next-line no-console
    console.log("[CallEngine] Initializing Peer with config:", config);

    const peer = new this.PeerLib(uniquePeerId, {
      config,
    });

    this.peer = peer;
    return peer;
  }

  wirePeerErrors() {
    if (!this.peer) return;

    this.peer.on("error", (error) => {
      // eslint-disable-next-line no-console
      console.error("[CallEngine] Peer error:", error);

      switch (error.type) {
        case "browser-incompatible":
          toast.error("The browser does not support some or all WebRTC features.");
          break;
        case "disconnected":
          toast.error("You have been disconnected from the signaling server.");
          break;
        case "invalid-id":
          toast.error("The call identifier is invalid. Please try again.");
          break;
        case "network":
          toast.error("Network issue while establishing the call. Please check your connection.");
          break;
        case "peer-unavailable":
          toast.error("The other participant is not available.");
          break;
        case "server-error":
          toast.error("Unable to reach the call server. Please try again later.");
          break;
        default:
          toast.error("An error occurred while trying to manage the call.");
      }
    });
  }

  setupConnectionTimeout({ timeoutMs = 15000, onTimeout }) {
    if (this.connectionTimeoutId) {
      clearTimeout(this.connectionTimeoutId);
      this.connectionTimeoutId = null;
    }

    this.connectionTimeoutId = setTimeout(() => {
      if (this.activeCall || !this.isConnecting) return;
      // eslint-disable-next-line no-console
      console.warn("[CallEngine] Connection timeout reached, triggering fallback");

      if (typeof onTimeout === "function") {
        onTimeout();
      } else {
        toast.error("Call could not be established. Please try again.");
      }
    }, timeoutMs);
  }

  clearConnectionTimeout() {
    if (this.connectionTimeoutId) {
      clearTimeout(this.connectionTimeoutId);
      this.connectionTimeoutId = null;
    }
  }

  /**
   * Initialize Peer, wire basic handlers, and emit ON_CALL_JOIN on "open".
   * Returns the Peer instance.
   */
  initPeerAndSignal({ localStream: _localStream } = {}) {
    const peer = this.createPeer();
    this.wirePeerErrors();

    peer.on("open", (peerId) => {
      if (this.socket) {
        this.socket.emit("ON_CALL_JOIN", {
          userInfo: {
            from_user: this.fromUser._id,
            to_user: this.toUser._id,
            sessionId: this.sessionId,
            peerId,
          },
        });
      }
    });

    return peer;
  }

  /**
   * Connect to remote peer using signaling (offer/answer/ICE) via socket.
   * Uses the same event names already present in helpers/events.ts.
   */
  attachSocketSignalingHandlers() {
    if (!this.socket || !this.peer) return;

    const socket = this.socket;

    const handleOffer = (offer) => {
      this.peer?.signal(offer);
    };

    const handleAnswer = (answer) => {
      this.peer?.signal(answer);
    };

    const handleIceCandidate = (candidate) => {
      this.peer?.signal(candidate);
    };

    socket.on(EVENTS.VIDEO_CALL.ON_OFFER, handleOffer);
    socket.on(EVENTS.VIDEO_CALL.ON_ANSWER, handleAnswer);
    socket.on(EVENTS.VIDEO_CALL.ON_ICE_CANDIDATE, handleIceCandidate);

    this._cleanupSignaling = () => {
      socket.off(EVENTS.VIDEO_CALL.ON_OFFER, handleOffer);
      socket.off(EVENTS.VIDEO_CALL.ON_ANSWER, handleAnswer);
      socket.off(EVENTS.VIDEO_CALL.ON_ICE_CANDIDATE, handleIceCandidate);
    };
  }

  cleanup() {
    this.clearConnectionTimeout();
    if (this.activeCall) {
      try {
        this.activeCall.close();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("[CallEngine] Error closing active call:", e);
      }
      this.activeCall = null;
    }
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("[CallEngine] Error destroying peer:", e);
      }
      this.peer = null;
    }
    if (this._cleanupSignaling) {
      this._cleanupSignaling();
      this._cleanupSignaling = null;
    }
  }
}


