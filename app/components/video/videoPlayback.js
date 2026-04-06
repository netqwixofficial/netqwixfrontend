/**
 * Reliable HTML5 video play for clip/call UIs.
 * - Forces muted + inline attributes (required for autoplay/programmatic play on iOS).
 * - Retries once after loadeddata/canplay when the first play() fails (common when the user
 *   taps play before the element has enough buffered data — trainer side; trainee often plays
 *   later via socket when the video is ready).
 */

const MIN_READY =
  typeof HTMLMediaElement !== "undefined"
    ? HTMLMediaElement.HAVE_CURRENT_DATA
    : 2;

export function ensureClipVideoAttributes(video) {
  if (!video) return;
  try {
    video.muted = true;
    video.defaultMuted = true;
    video.setAttribute?.("muted", "");
    video.setAttribute?.("playsinline", "");
    video.setAttribute?.("webkit-playsinline", "");
  } catch (_) {
    /* ignore */
  }
}

/**
 * @returns {Promise<boolean>} true if playback started
 */
export function safePlayVideoElement(video) {
  if (!video) return Promise.resolve(false);

  const attempt = () => {
    ensureClipVideoAttributes(video);
    const p = video.play();
    if (p && typeof p.then === "function") {
      return p
        .then(() => true)
        .catch(() => {
          if (video.readyState >= MIN_READY) {
            return false;
          }
          return new Promise((resolve) => {
            const onReady = () => {
              video.removeEventListener("loadeddata", onReady);
              video.removeEventListener("canplay", onReady);
              ensureClipVideoAttributes(video);
              const p2 = video.play();
              if (p2 && typeof p2.then === "function") {
                p2
                  .then(() => resolve(true))
                  .catch(() => resolve(false));
              } else {
                resolve(true);
              }
            };
            video.addEventListener("loadeddata", onReady, { once: true });
            video.addEventListener("canplay", onReady, { once: true });
          });
        });
    }
    return Promise.resolve(true);
  };

  return attempt();
}

/**
 * Play two videos in sequence (same user gesture chain on more browsers than parallel play()).
 * @returns {Promise<boolean>}
 */
export function safePlayTwoVideoElements(video1, video2) {
  if (!video1 || !video2) return Promise.resolve(false);
  return safePlayVideoElement(video1).then((ok1) => {
    if (!ok1) return false;
    return safePlayVideoElement(video2);
  });
}
