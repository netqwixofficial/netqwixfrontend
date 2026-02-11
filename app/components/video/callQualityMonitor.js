// Connection quality monitoring for WebRTC calls
// Collects stats from RTCPeerConnection and reports quality metrics

export function collectCallQualityStats(peer, call) {
  if (!peer || !call) {
    return null;
  }

  try {
    // Get the underlying RTCPeerConnection from PeerJS call
    const pc = call.peerConnection || call._pc;
    if (!pc || typeof pc.getStats !== "function") {
      return null;
    }

    return new Promise((resolve) => {
      pc.getStats()
        .then((stats) => {
          const statsReport = {
            timestamp: Date.now(),
            audio: {},
            video: {},
            connection: {},
          };

          stats.forEach((report) => {
            // Audio stats
            if (report.type === "inbound-rtp" && report.mediaType === "audio") {
              statsReport.audio.inbound = {
                packetsReceived: report.packetsReceived || 0,
                packetsLost: report.packetsLost || 0,
                bytesReceived: report.bytesReceived || 0,
                jitter: report.jitter || 0,
              };
            }
            if (report.type === "outbound-rtp" && report.mediaType === "audio") {
              statsReport.audio.outbound = {
                packetsSent: report.packetsSent || 0,
                bytesSent: report.bytesSent || 0,
              };
            }

            // Video stats
            if (report.type === "inbound-rtp" && report.mediaType === "video") {
              statsReport.video.inbound = {
                packetsReceived: report.packetsReceived || 0,
                packetsLost: report.packetsLost || 0,
                bytesReceived: report.bytesReceived || 0,
                framesReceived: report.framesReceived || 0,
                framesDropped: report.framesDropped || 0,
                frameWidth: report.frameWidth || 0,
                frameHeight: report.frameHeight || 0,
              };
            }
            if (report.type === "outbound-rtp" && report.mediaType === "video") {
              statsReport.video.outbound = {
                packetsSent: report.packetsSent || 0,
                bytesSent: report.bytesSent || 0,
                framesSent: report.framesSent || 0,
                frameWidth: report.frameWidth || 0,
                frameHeight: report.frameHeight || 0,
              };
            }

            // Connection stats
            if (report.type === "candidate-pair" && report.selected) {
              statsReport.connection = {
                rtt: report.currentRoundTripTime || 0,
                availableOutgoingBitrate: report.availableOutgoingBitrate || 0,
                availableIncomingBitrate: report.availableIncomingBitrate || 0,
                localCandidateType: report.localCandidateType || "unknown",
                remoteCandidateType: report.remoteCandidateType || "unknown",
              };
            }
          });

          // Calculate quality scores (0-100, higher is better)
          const audioLoss =
            statsReport.audio.inbound?.packetsLost /
            (statsReport.audio.inbound?.packetsReceived || 1);
          const videoLoss =
            statsReport.video.inbound?.packetsLost /
            (statsReport.video.inbound?.packetsReceived || 1);

          statsReport.quality = {
            audioScore: Math.max(0, 100 - audioLoss * 100),
            videoScore: Math.max(0, 100 - videoLoss * 100),
            overallScore: Math.max(
              0,
              100 - ((audioLoss + videoLoss) / 2) * 100
            ),
            rtt: statsReport.connection.rtt,
            usingRelay:
              statsReport.connection.localCandidateType === "relay" ||
              statsReport.connection.remoteCandidateType === "relay",
          };

          resolve(statsReport);
        })
        .catch((err) => {
          console.warn("[CallQualityMonitor] Failed to get stats:", err);
          resolve(null);
        });
    });
  } catch (err) {
    console.warn("[CallQualityMonitor] Error collecting stats:", err);
    return Promise.resolve(null);
  }
}

export function startQualityMonitoring({ peer, call, socket, sessionId, role, intervalMs = 10000 }) {
  if (!peer || !call || !socket) {
    return null;
  }

  const intervalId = setInterval(async () => {
    const stats = await collectCallQualityStats(peer, call);
    if (stats && socket && socket.connected) {
      socket.emit("CALL_QUALITY_STATS", {
        sessionId,
        role,
        stats,
      });
    }
  }, intervalMs);

  return intervalId;
}

