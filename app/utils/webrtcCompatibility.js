/**
 * Comprehensive WebRTC Compatibility Utility
 * Handles browser differences, polyfills, and fallbacks for maximum compatibility
 */

// Browser detection
export const BrowserInfo = {
  isChrome: () => /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor),
  isFirefox: () => /Firefox/.test(navigator.userAgent),
  isSafari: () => /Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor),
  isEdge: () => /Edge/.test(navigator.userAgent) || /Edg/.test(navigator.userAgent),
  isOpera: () => /Opera/.test(navigator.userAgent) || /OPR/.test(navigator.userAgent),
  isMobile: () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
  isIOS: () => /iPhone|iPad|iPod/i.test(navigator.userAgent),
  isAndroid: () => /Android/i.test(navigator.userAgent),
  getVersion: () => {
    const ua = navigator.userAgent;
    if (BrowserInfo.isChrome()) {
      const match = ua.match(/Chrome\/(\d+)/);
      return match ? parseInt(match[1]) : null;
    }
    if (BrowserInfo.isFirefox()) {
      const match = ua.match(/Firefox\/(\d+)/);
      return match ? parseInt(match[1]) : null;
    }
    if (BrowserInfo.isSafari()) {
      const match = ua.match(/Version\/(\d+)/);
      return match ? parseInt(match[1]) : null;
    }
    return null;
  }
};

/**
 * Get RTCPeerConnection with fallbacks for different browsers
 */
export function getRTCPeerConnection(config = {}) {
  if (typeof window === 'undefined') {
    throw new Error('RTCPeerConnection is not available in this environment');
  }

  // Try standard RTCPeerConnection first
  if (window.RTCPeerConnection) {
    return new window.RTCPeerConnection(config);
  }

  // Fallback to webkit prefix (older Chrome/Safari)
  if (window.webkitRTCPeerConnection) {
    return new window.webkitRTCPeerConnection(config);
  }

  // Fallback to moz prefix (older Firefox)
  if (window.mozRTCPeerConnection) {
    return new window.mozRTCPeerConnection(config);
  }

  throw new Error('RTCPeerConnection is not supported in this browser');
}

/**
 * Check if RTCPeerConnection is available
 */
export function hasRTCPeerConnection() {
  if (typeof window === 'undefined') return false;
  return !!(
    window.RTCPeerConnection ||
    window.webkitRTCPeerConnection ||
    window.mozRTCPeerConnection
  );
}

/**
 * Get getUserMedia with fallbacks for different browsers
 */
export async function getUserMedia(constraints = { video: true, audio: true }) {
  if (typeof navigator === 'undefined') {
    throw new Error('getUserMedia is not available in this environment');
  }

  // Modern API (preferred)
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      // Handle specific error cases
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        throw new Error('Camera and microphone permissions were denied. Please allow access and try again.');
      }
      if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        throw new Error('No camera or microphone found. Please connect a device and try again.');
      }
      if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        throw new Error('Camera or microphone is already in use by another application.');
      }
      if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
        // Try with less strict constraints
        const fallbackConstraints = {
          video: constraints.video ? true : false,
          audio: constraints.audio ? true : false
        };
        return await navigator.mediaDevices.getUserMedia(fallbackConstraints);
      }
      throw error;
    }
  }

  // Fallback for older browsers
  const getUserMediaFallback = 
    navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia ||
    navigator.msGetUserMedia;

  if (getUserMediaFallback) {
    return new Promise((resolve, reject) => {
      getUserMediaFallback.call(
        navigator,
        constraints,
        (stream) => resolve(stream),
        (error) => {
          // Convert callback error to Promise rejection with better messages
          if (error.name === 'PermissionDeniedError' || error.name === 'NotAllowedError') {
            reject(new Error('Camera and microphone permissions were denied. Please allow access and try again.'));
          } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            reject(new Error('No camera or microphone found. Please connect a device and try again.'));
          } else {
            reject(error);
          }
        }
      );
    });
  }

  throw new Error('getUserMedia is not supported in this browser. Please use a modern browser like Chrome, Firefox, Safari, or Edge.');
}

/**
 * Get display media (screen share) with fallbacks
 */
export async function getDisplayMedia(constraints = { video: true, audio: true }) {
  if (typeof navigator === 'undefined') {
    throw new Error('getDisplayMedia is not available in this environment');
  }

  // Modern API
  if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
    try {
      return await navigator.mediaDevices.getDisplayMedia(constraints);
    } catch (error) {
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        throw new Error('Screen sharing permission was denied. Please allow access and try again.');
      }
      throw error;
    }
  }

  // Fallback for older Chrome
  if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia === undefined) {
    if (navigator.getDisplayMedia) {
      try {
        return await navigator.getDisplayMedia(constraints);
      } catch (error) {
        throw new Error('Screen sharing is not supported in this browser.');
      }
    }
  }

  throw new Error('Screen sharing is not supported in this browser.');
}

/**
 * Check if getUserMedia is available
 */
export function hasGetUserMedia() {
  if (typeof navigator === 'undefined') return false;
  return !!(
    (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) ||
    navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia ||
    navigator.msGetUserMedia
  );
}

/**
 * Check if getDisplayMedia is available
 */
export function hasGetDisplayMedia() {
  if (typeof navigator === 'undefined') return false;
  return !!(
    (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) ||
    navigator.getDisplayMedia
  );
}

/**
 * Enumerate media devices with fallbacks
 */
export async function enumerateDevices() {
  if (typeof navigator === 'undefined') {
    return [];
  }

  if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
    try {
      return await navigator.mediaDevices.enumerateDevices();
    } catch (error) {
      console.warn('Failed to enumerate devices:', error);
      return [];
    }
  }

  return [];
}

/**
 * Get optimal video constraints based on device capabilities
 */
export function getOptimalVideoConstraints() {
  const isMobile = BrowserInfo.isMobile();
  const isIOS = BrowserInfo.isIOS();

  // iOS Safari has specific requirements
  if (isIOS) {
    return {
      video: {
        facingMode: 'user',
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 30 }
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    };
  }

  // Mobile devices - use lower resolution for better performance
  if (isMobile) {
    return {
      video: {
        width: { ideal: 640, max: 1280 },
        height: { ideal: 480, max: 720 },
        frameRate: { ideal: 30, max: 30 }
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    };
  }

  // Desktop - use higher resolution
  return {
    video: {
      width: { ideal: 1280, max: 1920 },
      height: { ideal: 720, max: 1080 },
      frameRate: { ideal: 30, max: 60 }
    },
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      sampleRate: 48000
    }
  };
}

/**
 * Check browser compatibility and return detailed info
 */
export function checkBrowserCompatibility() {
  const compatibility = {
    supported: true,
    warnings: [],
    errors: [],
    browser: {
      name: 'Unknown',
      version: null,
      isMobile: BrowserInfo.isMobile(),
      isIOS: BrowserInfo.isIOS(),
      isAndroid: BrowserInfo.isAndroid()
    },
    features: {
      rtcPeerConnection: hasRTCPeerConnection(),
      getUserMedia: hasGetUserMedia(),
      getDisplayMedia: hasGetDisplayMedia(),
      enumerateDevices: !!(navigator.mediaDevices && navigator.mediaDevices.enumerateDevices)
    }
  };

  // Detect browser
  if (BrowserInfo.isChrome()) {
    compatibility.browser.name = 'Chrome';
    compatibility.browser.version = BrowserInfo.getVersion();
  } else if (BrowserInfo.isFirefox()) {
    compatibility.browser.name = 'Firefox';
    compatibility.browser.version = BrowserInfo.getVersion();
  } else if (BrowserInfo.isSafari()) {
    compatibility.browser.name = 'Safari';
    compatibility.browser.version = BrowserInfo.getVersion();
  } else if (BrowserInfo.isEdge()) {
    compatibility.browser.name = 'Edge';
  } else if (BrowserInfo.isOpera()) {
    compatibility.browser.name = 'Opera';
  }

  // Check critical features
  if (!compatibility.features.rtcPeerConnection) {
    compatibility.supported = false;
    compatibility.errors.push('WebRTC is not supported. Please use Chrome, Firefox, Safari, or Edge.');
  }

  if (!compatibility.features.getUserMedia) {
    compatibility.supported = false;
    compatibility.errors.push('Camera and microphone access is not supported in this browser.');
  }

  // Warnings for older browsers
  if (compatibility.browser.version) {
    if (compatibility.browser.name === 'Chrome' && compatibility.browser.version < 60) {
      compatibility.warnings.push('You are using an older version of Chrome. Please update for the best experience.');
    }
    if (compatibility.browser.name === 'Firefox' && compatibility.browser.version < 60) {
      compatibility.warnings.push('You are using an older version of Firefox. Please update for the best experience.');
    }
    if (compatibility.browser.name === 'Safari' && compatibility.browser.version < 11) {
      compatibility.warnings.push('You are using an older version of Safari. Please update for the best experience.');
    }
  }

  // iOS Safari specific warnings
  if (compatibility.browser.isIOS && compatibility.browser.name === 'Safari') {
    compatibility.warnings.push('iOS Safari has limited WebRTC support. For best results, use Chrome or Firefox on iOS.');
  }

  return compatibility;
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyError(error) {
  if (typeof error === 'string') {
    return error;
  }

  if (!error || !error.name) {
    return 'An unknown error occurred. Please try again.';
  }

  const errorMessages = {
    NotAllowedError: 'Camera and microphone permissions were denied. Please allow access in your browser settings and try again.',
    PermissionDeniedError: 'Camera and microphone permissions were denied. Please allow access in your browser settings and try again.',
    NotFoundError: 'No camera or microphone found. Please connect a device and try again.',
    DevicesNotFoundError: 'No camera or microphone found. Please connect a device and try again.',
    NotReadableError: 'Camera or microphone is already in use by another application. Please close other applications and try again.',
    TrackStartError: 'Camera or microphone is already in use by another application. Please close other applications and try again.',
    OverconstrainedError: 'Your device does not support the requested video settings. Trying with lower quality...',
    ConstraintNotSatisfiedError: 'Your device does not support the requested video settings. Trying with lower quality...',
    AbortError: 'The operation was aborted. Please try again.',
    TypeError: 'Invalid parameters provided. Please refresh the page and try again.',
    SecurityError: 'Camera and microphone access is blocked by your browser security settings. Please check your browser settings.',
    NetworkError: 'Network error occurred. Please check your internet connection and try again.',
  };

  return errorMessages[error.name] || error.message || 'An error occurred. Please try again.';
}

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff(fn, maxRetries = 3, initialDelay = 1000) {
  let lastError;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on permission errors
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        throw error;
      }
      
      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

/**
 * Check network quality
 */
export function getNetworkInfo() {
  if (typeof navigator === 'undefined' || !navigator.connection) {
    return {
      type: 'unknown',
      effectiveType: 'unknown',
      downlink: null,
      rtt: null,
      saveData: false
    };
  }

  const connection = navigator.connection || 
                    navigator.mozConnection || 
                    navigator.webkitConnection || 
                    navigator.msConnection;

  return {
    type: connection.type || 'unknown',
    effectiveType: connection.effectiveType || 'unknown',
    downlink: connection.downlink || null,
    rtt: connection.rtt || null,
    saveData: connection.saveData || false
  };
}


