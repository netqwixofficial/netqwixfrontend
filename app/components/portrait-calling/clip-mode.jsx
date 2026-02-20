import { useCallback, useState } from "react";
import {
  Aperture,
  ChevronDown,
  Maximize,
  Minimize,
  MinusCircle,
  PenTool,
  PlusCircle,
} from "react-feather";
import { CanvasMenuBar } from "../video/canvas.menubar";
// import VideoContainer from "./video-container";
import { UserBox, UserBoxMini, VideoMiniBox } from "./user-box";
import TimeRemaining from "./time-remaining";
import { useRef } from "react";
import CustomVideoControls from "./custom-video-controls";
import { AccountType, SHAPES } from "../../common/constants";
import { useAppSelector } from "../../store";
import { authState } from "../auth/auth.slice";
import { SocketContext } from "../socket";
import { useContext } from "react";
import { EVENTS } from "../../../helpers/events";
import { useEffect } from "react";
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { Utils } from "../../../utils/utils";
import _debounce from "lodash/debounce";
import { toast } from "react-toastify";
import { pushProfilePhotoToS3 } from "../common/common.api";
import { screenShotTake } from "../videoupload/videoupload.api";
import html2canvas from "html2canvas";
import { FaLock, FaUndo, FaUnlock } from "react-icons/fa";
import NextImage from "next/image";

let isDrawing = false;
let savedPos = { canvas1: null, canvas2: null };
let startPos = { canvas1: null, canvas2: null };
let currPos = { canvas1: null, canvas2: null };
let strikes = { canvas1: [], canvas2: [] };

let drawingStep = "baseline"
let canvasConfigs = {
  sender: {
    strokeStyle: "red",
    lineWidth: 3,
    lineCap: "round",
  },
  receiver: {
    strokeStyle: "green",
    lineWidth: 3,
    lineCap: "round",
  },
};

let selectedShape = null;

let state = {
  mousedown: { canvas1: false, canvas2: false },
};

let storedLocalDrawPaths = {
  canvas1: { sender: [], receiver: [] },
  canvas2: { sender: [], receiver: [] }, // Separate history for each canvas
};

let lastDrawingStep;

let anglePoint = { canvas1: null, canvas2: null };
let textInputs = { canvas1: [], canvas2: [] }; // Store text annotations
let textInputState = { canvas1: null, canvas2: null }; // Current text input state
let extraStream;
let localVideoRef;
let Peer;

// Clip playback: we handle video.play() as a Promise so that devices/browsers that block
// programmatic play (e.g. iOS autoplay policy) don't leave UI out of sync; on reject we set
// isPlaying false and log so the user can tap Play again (user gesture often unblocks).

const VideoContainer = ({
  drawingMode,
  isMaximized,
  canvasRef,
  clip,
  isLock,
  index,
  videoRef,
  videoRef2,
  isPlaying,
  setIsPlaying,
  isSingle,
  fromUser,
  toUser,
  stopDrawing,
  sendDrawEvent,
  undoDrawing,
  isLandscape,
  videoContainerRef,
  lockPoint = 0,
  sharedTogglePlayPause,
  sharedHandleSeek,
  sessionId,
}) => {
  // const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(true);
  // const [videoProgress, setVideoProgress] = useState(0);
  const { accountType } = useAppSelector(authState);
  const socket = useContext(SocketContext);
  // const videoContainerRef = useRef(null);
  const movingVideoContainerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [scale, setScale] = useState(1); // Zoom level (scale)
  const [lastTouch, setLastTouch] = useState(0);
  // Keep translate fixed at (0,0) so clips stay in their original position.
  const [translate, setTranslate] = useState({
    x: 0,
    y: 0,
  });
  const [dragStart, setDragStart] = useState(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  // Queue for remote sync events that may arrive before the student's video is ready
  const pendingPlayStateRef = useRef(null);
  const pendingTimeRef = useRef(null);
  const pendingTimeoutRefs = useRef([]);

  // Zoom logic
  const onWheel = (e) => {
    if (accountType === AccountType.TRAINEE) return;

    const delta = e.deltaY;
    const zoomFactor = delta < 0 ? 1.1 : 0.9;
    const newScale = Math.max(1, Math.min(5, scale * zoomFactor));

    console.log("🔍 [VideoContainer] Wheel zoom event", {
      delta,
      zoomFactor,
      oldScale: scale,
      newScale,
      clipId: clip?._id,
      index,
      accountType
    });

    setScale(newScale);

    socket?.emit(EVENTS?.ON_VIDEO_ZOOM_PAN, {
      videoId: clip._id,
      zoom: newScale,
      pan: translate,
      userInfo: { from_user: fromUser?._id, to_user: toUser?._id },
      sessionId,
    });
  };

  const zoomIn = () => {
    if (accountType === AccountType.TRAINEE) return;

    // Increase the scale by 0.5, with a maximum value of 5
    const newScale = Math.min(5, scale + 0.2);
    
    console.log("🔍 [VideoContainer] Zoom in button clicked", {
      oldScale: scale,
      newScale,
      clipId: clip?._id,
      index,
      accountType
    });
    
    setScale(newScale);

    socket?.emit(EVENTS?.ON_VIDEO_ZOOM_PAN, {
      videoId: clip._id,
      zoom: newScale,
      pan: translate,
      userInfo: { from_user: fromUser?._id, to_user: toUser?._id },
      sessionId,
    });
  };

  const zoomOut = () => {
    if (accountType === AccountType.TRAINEE) return;

    // Decrease the scale by 0.5, with a minimum value of 1
    const newScale = Math.max(1, scale - 0.2);
    
    console.log("🔍 [VideoContainer] Zoom out button clicked", {
      oldScale: scale,
      newScale,
      clipId: clip?._id,
      index,
      accountType
    });
     
    setScale(newScale);

    socket?.emit(EVENTS?.ON_VIDEO_ZOOM_PAN, {
      videoId: clip._id,
      zoom: newScale,
      pan: translate,
      userInfo: { from_user: fromUser?._id, to_user: toUser?._id },
      sessionId,
    });
  };

  const handleTouchMove = (e) => {
    if (accountType === AccountType.TRAINEE) return;

    if (e.touches.length === 2) {
      // Zoom Handling - prevent panning during pinch zoom
      const [touch1, touch2] = Array.from(e.touches);
      const currentDistance = Math.hypot(
        touch2.pageX - touch1.pageX,
        touch2.pageY - touch1.pageY
      );

      if (lastTouch) {
        const scaleChange = currentDistance / lastTouch;
        const newScale = Math.max(1, Math.min(5, scale * scaleChange));

        console.log("🔍 [VideoContainer] Touch zoom", {
          oldScale: scale,
          newScale,
          scaleChange,
          currentDistance,
          lastTouch,
          clipId: clip?._id,
          index
        });

        setScale(newScale);
        // Reset drag start to prevent panning during zoom
        setDragStart(null);
      }
      setLastTouch(currentDistance);
    } else if (e.touches.length === 1 && dragStart) {
      // Single finger drag - panning
      const touch = e.touches[0];
      const deltaX = touch.clientX - dragStart.x;
      const deltaY = touch.clientY - dragStart.y;
      
      const newTranslate = {
        x: translate.x + deltaX / scale,
        y: translate.y + deltaY / scale,
      };
      
      setTranslate(newTranslate);
      setDragStart({ x: touch.clientX, y: touch.clientY });
      
      // Emit pan event
      socket?.emit(EVENTS?.ON_VIDEO_ZOOM_PAN, {
        videoId: clip._id,
        zoom: scale,
        pan: newTranslate,
        userInfo: { from_user: fromUser?._id, to_user: toUser?._id },
        sessionId,
      });
    }
  };

  const handleTouchStart = (e) => {
    if (accountType === AccountType.TRAINEE) return;
    
    if (e.touches.length === 1) {
      // Single finger - start panning
      const touch = e.touches[0];
      setDragStart({ x: touch.clientX, y: touch.clientY });
      setLastTouch(0); // Reset zoom tracking
    } else if (e.touches.length === 2) {
      // Two fingers - prepare for zoom
      const [touch1, touch2] = Array.from(e.touches);
      const distance = Math.hypot(
        touch2.pageX - touch1.pageX,
        touch2.pageY - touch1.pageY
      );
      setLastTouch(distance);
      setDragStart(null); // Disable panning during zoom
    }
  };

  const handleTouchEnd = () => {
    if (accountType === AccountType.TRAINEE) return;
    // Small delay before resetting lastTouch to prevent accidental panning after zoom
    setTimeout(() => {
    setLastTouch(0);
    }, 100);
    setDragStart(null);
  };

  // Handle mouse drag for panning
  const handleMouseDown = (e) => {
    if (accountType === AccountType.TRAINEE) return;
    if (e.button !== 0) return; // Only left mouse button
    setDragStart({ x: e.clientX, y: e.clientY });
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (accountType === AccountType.TRAINEE || !dragStart) return;
    
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    const newTranslate = {
      x: translate.x + deltaX / scale,
      y: translate.y + deltaY / scale,
    };
    
    setTranslate(newTranslate);
    setDragStart({ x: e.clientX, y: e.clientY });
    
    // Emit pan event
    socket?.emit(EVENTS?.ON_VIDEO_ZOOM_PAN, {
      videoId: clip._id,
      zoom: scale,
      pan: newTranslate,
      userInfo: { from_user: fromUser?._id, to_user: toUser?._id },
      sessionId,
    });
  };

  const handleMouseUp = () => {
    if (accountType === AccountType.TRAINEE) return;
    setDragStart(null);
  };

  // Apply CSS transformations directly to the element
  const transformStyle = {
    transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
  };

  // Toggle visibility of custom controls when clicking on the video
  const handleVideoClick = () => {
    setControlsVisible((prev) => !prev);
  };

  // const [cu,setCurrentTime]
  const togglePlayPauseLocal = () => {
    const video = videoRef?.current;
    console.log("🎬 [VideoContainer] togglePlayPause called", {
      videoExists: !!video,
      videoPaused: video?.paused,
      clipId: clip?._id,
      currentTime: video?.currentTime,
      duration: video?.duration,
      isVideoLoading,
      accountType,
      index
    });
    
    if (video) {
      if (video.paused) {
        console.log("▶️ [VideoContainer] Playing video", {
          clipId: clip?._id,
          currentTime: video.currentTime,
          duration: video.duration,
          index
        });
        const p = video.play();
        if (p && typeof p.then === "function") {
          p.then(() => {
            setIsPlaying(true);
            socket?.emit(EVENTS?.ON_VIDEO_PLAY_PAUSE, {
              videoId: clip?._id,
              userInfo: { from_user: fromUser?._id, to_user: toUser?._id },
              isPlaying: true,
            });
          }).catch((err) => {
            console.warn("VideoContainer play() failed (e.g. policy or device)", { clipId: clip?._id, index, err: err?.message || err });
            setIsPlaying(false);
          });
        } else {
          setIsPlaying(true);
          socket?.emit(EVENTS?.ON_VIDEO_PLAY_PAUSE, {
            videoId: clip?._id,
            userInfo: { from_user: fromUser?._id, to_user: toUser?._id },
            isPlaying: true,
          });
        }
      } else {
        console.log("⏸️ [VideoContainer] Pausing video", {
          clipId: clip?._id,
          currentTime: video.currentTime,
          duration: video.duration,
          index
        });
        video.pause();
        setIsPlaying(false);
        socket?.emit(EVENTS?.ON_VIDEO_PLAY_PAUSE, {
          videoId: clip?._id,
          userInfo: { from_user: fromUser?._id, to_user: toUser?._id },
          isPlaying: false,
        });
      }
    } else {
      console.warn("⚠️ [VideoContainer] Video not loaded yet", { clipId: clip?._id, index });
    }
  };

  const togglePlayPause = () => {
    if (isLock && typeof sharedTogglePlayPause === "function") {
      sharedTogglePlayPause();
      return;
    }
    togglePlayPauseLocal();
  };

  useEffect(() => {
    if (!socket) return;

    const handlePlayPause = (data) => {
      const video = videoRef?.current;

      console.log("📡 [VideoContainer] Received ON_VIDEO_PLAY_PAUSE event", {
        receivedData: data,
        clipId: clip?._id,
        isMatch: data?.videoId === clip?._id,
        shouldPlay: data?.isPlaying,
        videoPaused: video?.paused,
        index,
      });

      if (data?.videoId !== clip?._id) return;

      // If video element is not ready yet on the trainee side, store desired state
      if (!video) {
        if (accountType === AccountType.TRAINEE) {
          pendingPlayStateRef.current = data.isPlaying;
        }
        return;
      }

      if (data.isPlaying) {
        if (video.paused) {
          console.log("▶️ [VideoContainer] Playing video from socket event", {
            clipId: clip?._id,
            currentTime: video.currentTime,
            index,
          });
          const p = video.play();
          if (p && typeof p.then === "function") {
            p.then(() => setIsPlaying(true)).catch((err) => {
              console.warn("VideoContainer play error from socket", { clipId: clip?._id, err: err?.message || err });
              setIsPlaying(false);
            });
          } else {
            setIsPlaying(true);
          }
        }
      } else {
        if (!video.paused) {
          console.log("⏸️ [VideoContainer] Pausing video from socket event", {
            clipId: clip?._id,
            currentTime: video.currentTime,
            index,
          });
          video.pause();
          setIsPlaying(false);
        }
      }

      // Clear any pending play state since we've just applied the latest one
      pendingPlayStateRef.current = null;
    };

    const handleTime = (data) => {
      const video = videoRef?.current;

      console.log("📡 [VideoContainer] Received ON_VIDEO_TIME event", {
        receivedData: data,
        clipId: clip?._id,
        isMatch: data?.videoId === clip?._id,
        isTrainee: accountType === AccountType.TRAINEE,
        currentTime: video?.currentTime,
        newTime: data?.progress,
        index,
      });

      if (data?.videoId === clip?._id && accountType === AccountType.TRAINEE) {
        // If video not ready (need at least HAVE_CURRENT_DATA for reliable seek on some devices), queue and apply when ready
        const minReady = typeof HTMLMediaElement !== "undefined" ? HTMLMediaElement.HAVE_CURRENT_DATA : 2;
        if (!video || video.readyState < minReady) {
          pendingTimeRef.current = data.progress;
          return;
        }

        const oldTime = video.currentTime;
        try {
          video.currentTime = data.progress;
        } catch (seekErr) {
          console.warn("VideoContainer seek failed, queuing for later", { clipId: clip?._id, progress: data.progress, err: seekErr?.message });
          pendingTimeRef.current = data.progress;
          return;
        }
        console.log("⏩ [VideoContainer] Video time synced from socket", {
          clipId: clip?._id,
          from: oldTime,
          to: data.progress,
          index,
        });
        pendingTimeRef.current = null;
      }
    };
    const handleZoomPanChange = (data) => {
      if (!data || clip?._id == null) return;
      const clipMatch = data.videoId === clip._id || data.clipId === clip._id;
      if (!clipMatch) return;
      // On trainee side, follow both zoom and pan from trainer
      if (accountType === AccountType.TRAINEE) {
        if (typeof data.zoom === "number") {
          setScale((s) => (s !== data.zoom ? data.zoom : s));
        }
        if (data.pan && typeof data.pan.x === "number" && typeof data.pan.y === "number") {
          setTranslate({ x: data.pan.x, y: data.pan.y });
        }
      }
    };

    // Listen for events from the socket (stable deps so we don't miss events when trainer pans/zooms)
    socket?.on(EVENTS?.ON_VIDEO_PLAY_PAUSE, handlePlayPause);
    socket?.on(EVENTS?.ON_VIDEO_TIME, handleTime);
    socket?.on(EVENTS?.ON_VIDEO_ZOOM_PAN, handleZoomPanChange);

    // Clean up on unmount
    return () => {
      socket?.off(EVENTS?.ON_VIDEO_PLAY_PAUSE, handlePlayPause);
      socket?.off(EVENTS?.ON_VIDEO_TIME, handleTime);
      socket?.off(EVENTS?.ON_VIDEO_ZOOM_PAN, handleZoomPanChange);
    };
  }, [socket, clip?._id, videoRef, accountType]);

  // Apply any queued remote sync events once the trainee's video is ready
  useEffect(() => {
    const video = videoRef?.current;
    if (!video || accountType !== AccountType.TRAINEE) return;

    // Only attempt to apply when we've finished the initial loading state
    if (isVideoLoading) return;

    const minReady = typeof HTMLMediaElement !== "undefined" ? HTMLMediaElement.HAVE_CURRENT_DATA : 2;
    if (video.readyState < minReady) return;

    const applyPending = () => {
      try {
        if (pendingTimeRef.current != null) {
          const targetTime = pendingTimeRef.current;
          const oldTime = video.currentTime;
          try {
            video.currentTime = targetTime;
          } catch (e) {
            console.warn("VideoContainer queued time apply failed", { clipId: clip?._id, targetTime, err: e?.message });
            return;
          }
          console.log("⏩ [VideoContainer] Applying queued time sync", {
            clipId: clip?._id,
            from: oldTime,
            to: targetTime,
            index,
          });
          pendingTimeRef.current = null;
        }

        if (pendingPlayStateRef.current != null) {
          const shouldPlay = pendingPlayStateRef.current;
          console.log("▶️ [VideoContainer] Applying queued play/pause sync", {
            clipId: clip?._id,
            shouldPlay,
            currentPaused: video.paused,
            index,
          });
          if (shouldPlay && video.paused) {
            const p = video.play();
            if (p && typeof p.then === "function") {
              p.then(() => setIsPlaying(true)).catch((err) => {
                console.warn("VideoContainer play error from queued state", { clipId: clip?._id, err: err?.message || err });
                setIsPlaying(false);
              });
            } else {
              setIsPlaying(true);
            }
          } else if (!shouldPlay && !video.paused) {
            video.pause();
            setIsPlaying(false);
          }
          pendingPlayStateRef.current = null;
        }
      } catch (err) {
        console.warn("VideoContainer failed to apply queued sync state", err);
      }
    };

    applyPending();
  }, [videoRef, accountType, isVideoLoading, clip?._id, setIsPlaying]);
  //  
  // useEffect(() => {
  //   const video = videoRef?.current;
  //   if (!video) return;
  
  //   // let isHandlingLoad = false; // Prevent multiple handlers from conflicting
  //   // let loadTimeout; // Declare timeout variable
  
  //   // const handleVideoLoadComplete = () => {
  //   //   if (isHandlingLoad) return;
  //   //   isHandlingLoad = true;
      
  //   //   // Clear the timeout since video loaded successfully
  //   //   if (loadTimeout) {
  //   //     clearTimeout(loadTimeout);
  //   //     loadTimeout = null;
  //   //   }
      
  //   //   setIsVideoLoading(false);
  //   //   setVideoProgress(100);
  //   //   setIsVideoLoaded(true);
      
  //   //    
  //   // };
  
  //   // const handleError = (error,isMessage=true) => {
  //   //   console.error("Video failed to load:", error);
      
  //   //   // Clear the timeout since we're handling the error
  //   //   if (loadTimeout) {
  //   //     clearTimeout(loadTimeout);
  //   //     loadTimeout = null;
  //   //   }
      
  //   //   setIsVideoLoading(false);
  //   //   setVideoProgress(0);
  //   //   setIsVideoLoaded(false);
  //   //   if(isMessage){
  //   //     toast.error("Failed to load video");
  //   //   }
  //   // };
  
  //   // const handleStalled = () => {
  //   //    
  //   //   // Don't reset loading state on stall, just log it
  //   // };
  
  //   // const handleWaiting = () => {
  //   //    
  //   //   // Don't reset loading state on waiting, just log it
  //   // };

  //   // const handleVideoLoadStart = () => {
  //   //    
  //   //   setIsVideoLoading(true);
  //   //   setVideoProgress(0);
  //   //   setIsVideoLoaded(false);
      
  //   //   // Start with a small progress to show loading has begun
  //   //   setTimeout(() => {
  //   //     if (!isVideoLoaded && videoProgress === 0) {
  //   //       setVideoProgress(5);
  //   //        
  //   //     }
  //   //   }, 200);
  //   // };

  //   // const handleVideoProgress = (event) => {
  //   //   const video = event.target;
  //   //   if (video.buffered.length > 0 && video.duration) {
  //   //     const bufferedEnd = video.buffered.end(video.buffered.length - 1);
  //   //     const duration = video.duration;
  //   //     const progress = (bufferedEnd / duration) * 100;
  //   //     setVideoProgress(Math.round(progress));
  //   //      }%`);
  //   //   }
  //   // };

  //   // Add a more frequent progress check using setInterval
  //   const progressInterval = setInterval(() => {
  //     if (video && !isVideoLoaded) {
  //       let newProgress = videoProgress;
        
  //       // Check buffered ranges
  //       if (video.buffered.length > 0 && video.duration) {
  //         const bufferedEnd = video.buffered.end(video.buffered.length - 1);
  //         const duration = video.duration;
  //         const bufferedProgress = (bufferedEnd / duration) * 100;
          
  //         if (bufferedProgress > newProgress) {
  //           newProgress = Math.round(bufferedProgress);
  //         }
  //       }
        
  //       // Also check readyState for more granular progress
  //       const readyStateProgress = (video.readyState / 4) * 100; // readyState goes from 0 to 4
  //       if (readyStateProgress > newProgress) {
  //         newProgress = Math.round(readyStateProgress);
  //       }
        
  //       // Ensure progress doesn't go backwards and has minimum increments
  //       if (newProgress > videoProgress && newProgress <= 100) {
  //         // Ensure minimum progress increment to show movement
  //         const minIncrement = Math.max(1, Math.floor((100 - videoProgress) / 10));
  //         const finalProgress = Math.max(videoProgress + minIncrement, newProgress);
          
  //         setVideoProgress(Math.min(finalProgress, 100));
  //          }%`);
  //       }
        
  //       // If video is ready but we haven't completed, force completion
  //       if (video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA && videoProgress >= 85) {
  //         setTimeout(() => handleVideoLoadComplete(), 200);
  //       }
  //     }
  //   }, 150); // Check every 150ms for smoother progress updates

  //   const handleVideoCanPlay = () => {
  //      
  //     if (video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
  //       // Ensure we show some progress before completing
  //       if (videoProgress < 90) {
  //         setVideoProgress(90);
  //          
  //       }
  //       setTimeout(() => handleVideoLoadComplete(), 100);
  //     }
  //   };

  //   const handleVideoCanPlayThrough = () => {
  //      
  //     // Ensure we show some progress before completing
  //     if (videoProgress < 95) {
  //       setVideoProgress(95);
  //        
  //     }
  //     setTimeout(() => handleVideoLoadComplete(), 100);
  //   };

  //   const handleVideoLoadedData = () => {
  //      
  //     if (video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
  //       // Ensure we show some progress before completing
  //       if (videoProgress < 85) {
  //         setVideoProgress(85);
  //          
  //       }
  //       setTimeout(() => handleVideoLoadComplete(), 100);
  //     }
  //   };

  //   // Add loading progress events
  //   video.addEventListener('loadstart', handleVideoLoadStart);
  //   video.addEventListener('progress', handleVideoProgress);
  //   video.addEventListener('canplay', handleVideoCanPlay);
  //   video.addEventListener('canplaythrough', handleVideoCanPlayThrough);
  //   video.addEventListener('loadeddata', handleVideoLoadedData);
  //   video.addEventListener('stalled', handleStalled);
  //   video.addEventListener('waiting', handleWaiting);
  //   video.addEventListener('error', handleError);
  
  //   // Additional check for cases where video might already be ready
  //   if (video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
  //     // If video is already ready, show some progress before completing
  //     if (videoProgress === 0) {
  //       setVideoProgress(50);
  //       setTimeout(() => {
  //         setVideoProgress(100);
  //         setTimeout(() => handleVideoLoadComplete(), 100);
  //       }, 100);
  //     } else {
  //       handleVideoLoadComplete();
  //     }
  //   }
  
  //   // Set preload for better loading behavior
  //   video.preload = "auto";
  
  //   // Add timeout to prevent infinite loading - but only if video hasn't loaded
  //   loadTimeout = setTimeout(() => {
  //     // Only show timeout error if video is still loading and not ready
  //     if (!isVideoLoaded && video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA) {
  //       console.warn(`Video ${clip?.id} loading timeout - readyState: ${video.readyState}`);
  //       handleError(new Error('Loading timeout'),false);
  //     } else if (isVideoLoaded) {
  //        
  //     }
  //   }, 15000); // 15 second timeout
  
  //   return () => {
  //     if (loadTimeout) {
  //       clearTimeout(loadTimeout);
  //       loadTimeout = null;
  //     }
  //     clearInterval(progressInterval);
  //     video.removeEventListener('loadstart', handleVideoLoadStart);
  //     video.removeEventListener('progress', handleVideoProgress);
  //     video.removeEventListener('canplay', handleVideoCanPlay);
  //     video.removeEventListener('canplaythrough', handleVideoCanPlayThrough);
  //     video.removeEventListener('loadeddata', handleVideoLoadedData);
  //     video.removeEventListener('stalled', handleStalled);
  //     video.removeEventListener('waiting', handleWaiting);
  //     video.removeEventListener('error', handleError);
  //   };
  // }, [videoRef, clip?.id, isVideoLoaded]);

   
   
   
   

  // // Handle volume change
  // const changeVolume = (e) => {
  //   const volume = parseFloat(e.target.value);
  //   const video = videoRef.current;
  //   if (video) {
  //     video.volume = volume;
  //     setVolume(volume);
  //   }
  // };

  // // Mute/unmute video
  // const toggleMute = () => {
  //   const video = videoRef.current;
  //   video.muted = !video.muted;
  //   setIsMuted(!isMuted);
  // };

  // Toggle fullscreen mode
  const toggleFullscreen = () => {
    const videoContainer = videoContainerRef.current;
    if (videoContainer) {
      if (!document.fullscreenElement) {
        videoContainer.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  const handleSeekLocal = (e) => {
    const video = videoRef?.current;
    const progress = parseFloat(e.target.value);
    
    console.log("🎯 [VideoContainer] handleSeek called", {
      progress,
      oldTime: video?.currentTime,
      duration: video?.duration,
      clipId: clip?._id,
      index,
      accountType
    });
    
    if (video) {
      const oldTime = video.currentTime;
      video.currentTime = progress;
      setCurrentTime(progress);
      
      console.log("⏩ [VideoContainer] Video seeked", {
        clipId: clip?._id,
        from: oldTime,
        to: progress,
        duration: video.duration,
        index
      });
      
      socket?.emit(EVENTS?.ON_VIDEO_TIME, {
        userInfo: { from_user: fromUser?._id, to_user: toUser?._id },
        videoId: clip._id,
        progress,
      });
    } else {
      console.warn("⚠️ [VideoContainer] Cannot seek - video not available", {
        clipId: clip?._id,
        index
      });
    }
  };

  // Wrapper used by controls: in lock mode, delegate to shared dual-video handler
  const handleSeek = (e) => {
    if (isLock && typeof sharedHandleSeek === "function") {
      sharedHandleSeek(e);
      return;
    }
    handleSeekLocal(e);
  };

  const [aspectRatio, setAspectRatio] = useState("16 / 9");

  useEffect(() => {
    if (videoRef.current) {
      const video = videoRef.current;
      video.onloadedmetadata = () => {
        const ratio = video.videoWidth / video.videoHeight;
        setAspectRatio(`${video.videoWidth} / ${video.videoHeight}`);
      };
    }
  }, [videoRef]);
  
  useEffect(() => {
    const updateCanvasSize = () => {
      if (!canvasRef.current || !videoContainerRef.current) return;
      
      const canvas = canvasRef.current;
      const container = videoContainerRef.current;

      // Preserve existing drawing before resizing, because changing
      // canvas width/height clears its content.
      let prevDataUrl = null;
      const prevWidth = canvas.width;
      const prevHeight = canvas.height;
      if (prevWidth && prevHeight) {
        try {
          prevDataUrl = canvas.toDataURL();
        } catch (e) {
          console.warn("🎨 [VideoContainer] Failed to snapshot canvas before resize", e);
        }
      }

      // Get actual displayed size
      const { width, height } = container.getBoundingClientRect();

      // Set internal resolution to match display size
      canvas.width = width;
      canvas.height = height;

      // Restore previous drawing scaled to new size (if we had one)
      if (prevDataUrl) {
        const img = new Image();
        img.onload = () => {
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          try {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          } catch (err) {
            console.warn("🎨 [VideoContainer] Failed to restore canvas after resize", err);
          }
        };
        img.src = prevDataUrl;
      }
    };
  
    // Initial setup
    updateCanvasSize();
  
    // Handle window resizing
    const resizeObserver = new ResizeObserver(updateCanvasSize);
    resizeObserver.observe(videoContainerRef.current);
  
    return () => resizeObserver.disconnect();
  }, [canvasRef, videoContainerRef]);

  useEffect(() => {
    console.log("🔄 [VideoContainer] Clip changed, resetting video state", {
      clipId: clip?._id,
      index,
      accountType
    });
    
    // Check if video is already ready when clip changes
    const checkVideoReady = () => {
      const video = videoRef?.current;
      if (video) {
        if (video.readyState >= 3) { // HAVE_FUTURE_DATA or higher - video can play
          console.log("✅ [VideoContainer] Video already ready, no loading needed", {
            clipId: clip?._id,
            readyState: video.readyState,
            index
          });
          setIsVideoLoading(false);
        } else if (video.readyState >= 2) { // HAVE_CURRENT_DATA - has some data
          console.log("⏳ [VideoContainer] Video has some data, checking if more needed", {
            clipId: clip?._id,
            readyState: video.readyState,
            index
          });
          // Only show loading if video is not already playing
          if (video.paused) {
            setIsVideoLoading(true);
          } else {
            setIsVideoLoading(false);
          }
        } else {
          // Video has no data yet
          setIsVideoLoading(true);
        }
      } else {
        // Video element not ready yet
        setIsVideoLoading(true);
      }
    };
    
    // Check immediately
    checkVideoReady();
    
    // Also check after video element is available
    const timeoutId = setTimeout(checkVideoReady, 200);
    
    // Safety timeout: Clear loading after 10 seconds to prevent infinite loading
    const safetyTimeout = setTimeout(() => {
      const video = videoRef?.current;
      if (video) {
        console.warn("⚠️ [VideoContainer] Loading timeout - clearing loading state", {
          clipId: clip?._id,
          index,
          readyState: video.readyState,
          networkState: video.networkState
        });
        setIsVideoLoading(false);
      }
    }, 10000);
    
    return () => {
      clearTimeout(timeoutId);
      clearTimeout(safetyTimeout);
    };
  }, [clip?._id, index, accountType, videoRef]);

  // Calculate responsive height based on device and state
  // Account for: time remaining (~50px), action buttons (~70px), controls (~60px), padding (~20px)
  const getVideoContainerHeight = () => {
    const isMobile = window.innerWidth <= 576;
    const isTablet = window.innerWidth > 576 && window.innerWidth <= 1024;
    
    if (isSingle) {
      // Single clip mode - takes more space
      if (isMaximized) {
        // Maximized: use most of viewport, leave minimal space for controls
        if (isMobile) {
          return "calc(100vh - 140px)"; // Reduced for mobile
        } else if (isTablet) {
          return "calc(100vh - 150px)";
        } else {
          return "calc(100vh - 160px)";
        }
      } else {
        // Normal: use good portion of viewport
        if (isMobile) {
          return "calc(100vh - 160px)"; // Reduced for mobile
        } else if (isTablet) {
          return "calc(100vh - 170px)";
        } else {
          return "calc(100vh - 180px)";
        }
      }
    } else {
      // Dual clip mode - splits viewport
      if (isMaximized) {
        // Maximized: split viewport in half with minimal gap
        if (isMobile) {
          return isLock ? "calc(50vh - 75px)" : "calc(50vh - 80px)";
        } else if (isTablet) {
          return isLock ? "calc(50vh - 80px)" : "calc(50vh - 85px)";
        } else {
          return isLock ? "calc(50vh - 85px)" : "calc(50vh - 90px)";
        }
      } else {
        // Normal: smaller split with more space for other elements
        if (isMobile) {
          return isLock ? "calc(50vh - 85px)" : "calc(50vh - 90px)";
        } else if (isTablet) {
          return isLock ? "calc(50vh - 90px)" : "calc(50vh - 95px)";
        } else {
          return isLock ? "calc(50vh - 100px)" : "calc(50vh - 110px)";
        }
      }
    }
  };

  return (
    <>
    
      <div
        id="video-container"
        ref={videoContainerRef}
        className={`clip-player-frame relative overflow-hidden video-container-clip ${isSingle ? 'video-container-single' : 'video-container-dual'} ${isMaximized ? 'video-container-maximized' : 'video-container-normal'}`}
        style={{
          height: getVideoContainerHeight(),
          width: "100%",
          maxWidth: "100%",
          maxHeight: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "stretch",
          alignItems: "stretch",
          background: "#fff",
          position: "relative",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {drawingMode && accountType === AccountType.TRAINER && (
          <div
            className="absolute hide-in-screenshot"
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "5px",
              flexDirection: "column",
              right: "10px",
              top: "10px",
              zIndex: 10,
            }}
          >
            <div
              className="button"
              onClick={() => {

                undoDrawing(
                  {
                    coordinates: storedLocalDrawPaths[`canvas${index}`].sender,
                    theme: canvasConfigs.sender,
                  },
                  {
                    coordinates:
                      storedLocalDrawPaths[`canvas${index}`].receiver,
                    theme: {
                      lineWidth: canvasConfigs.receiver.lineWidth,
                      strokeStyle: canvasConfigs.receiver.strokeStyle,
                    },
                  },
                  true,
                  index
                )
              }
              }
            >
              <FaUndo />
            </div>
          </div>
        )}
        {/* Video area: fills frame; controls sit in a bar below */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            position: "relative",
          }}
        >
          <div
            onWheel={onWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
              ...transformStyle,
              width: "fit-content",
              height: "100%",
              touchAction: "none",
              cursor: dragStart ? "grabbing" : "grab",
            }}
            ref={movingVideoContainerRef}
          >
            <div
              style={{
                position: "relative",
                width: "fit-content",
                height: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                overflow: "hidden"
              }}
            >
              <div style={{ position: "relative", width: "100%", height: "100%" }}>
              <video
                controls={false}
                ref={videoRef}
                playsInline
                webkit-playsinline="true"
                style={{
                  touchAction: "manipulation",
                  maxWidth: "100%",
                  width: "auto",
                  height: `${100}%`,
                  // maxHeight:"100%",
                  aspectRatio: aspectRatio, // Force a correct aspect ratio
                  objectFit: "contain", // Prevent stretching
                  opacity: isVideoLoading ? 0.6 : 1,
                  pointerEvents: isVideoLoading ? "none" : "auto",
                  backgroundColor: "#fff",
                }}
                id={clip?.id}
                autoPlay={false}
                muted={true}
                poster={Utils?.generateThumbnailURL(clip)}
                preload="auto"
                crossOrigin="anonymous"
                onLoadedMetadata={(e) => {
                  try {
                    const video = e.currentTarget;
                    console.log("📹 [VideoContainer] Video metadata loaded", {
                      clipId: clip?._id,
                      index,
                      readyState: video.readyState,
                      duration: video.duration
                    });
                    // Clear loading if video has enough data
                    if (video.readyState >= 2) {
                      setIsVideoLoading(false);
                    }
                  } catch (error) {
                    console.error("❌ [VideoContainer] Error in onLoadedMetadata event", error);
                  }
                }}
                onLoadedData={(e) => {
                  try {
                  const video = e.currentTarget;
                  console.log("📹 [VideoContainer] Video data loaded", {
                    clipId: clip?._id,
                    index,
                    currentTime: video.currentTime,
                    duration: video.duration,
                    readyState: video.readyState
                  });
                  setIsVideoLoading(false);
                  } catch (error) {
                    console.error("❌ [VideoContainer] Error in onLoadedData event", error);
                  }
                }}
                onCanPlay={(e) => {
                  try {
                    const video = e.currentTarget;
                    console.log("✅ [VideoContainer] Video can play", {
                      clipId: clip?._id,
                      index,
                      readyState: video.readyState
                    });
                    setIsVideoLoading(false);
                  } catch (error) {
                    console.error("❌ [VideoContainer] Error in onCanPlay event", error);
                  }
                }}
                onCanPlayThrough={(e) => {
                  try {
                  console.log("✅ [VideoContainer] Video can play through", {
                    clipId: clip?._id,
                    index,
                    currentTime: e?.currentTarget?.currentTime,
                    duration: e?.currentTarget?.duration
                  });
                  setIsVideoLoading(false);
                  } catch (error) {
                    console.error("❌ [VideoContainer] Error in onCanPlayThrough event", error);
                  }
                }} 
                onWaiting={(e) => {
                  try {
                    console.log("⏳ [VideoContainer] Video waiting for data", {
                      clipId: clip?._id,
                      index,
                      currentTime: e?.currentTarget?.currentTime,
                      readyState: e?.currentTarget?.readyState
                    });
                    // Only show loading if video doesn't have enough data
                    if (e?.currentTarget?.readyState < 3) {
                      setIsVideoLoading(true);
                    }
                  } catch (error) {
                    console.error("❌ [VideoContainer] Error in onWaiting event", error);
                  }
                }}
                onStalled={(e) => {
                  try {
                    console.warn("⚠️ [VideoContainer] Video stalled", {
                      clipId: clip?._id,
                      index,
                      networkState: e?.currentTarget?.networkState
                    });
                    // Show loading only if network state indicates issue
                    if (e?.currentTarget?.networkState === 2) {
                      setIsVideoLoading(true);
                    }
                  } catch (error) {
                    console.error("❌ [VideoContainer] Error in onStalled event", error);
                  }
                }}
                onSuspend={(e) => {
                  try {
                    console.log("⏸️ [VideoContainer] Video suspended", {
                      clipId: clip?._id,
                      index
                    });
                    // Don't show loading on suspend - video is just paused by browser
                  } catch (error) {
                    console.error("❌ [VideoContainer] Error in onSuspend event", error);
                  }
                }} 
                onPlay={(e) => {
                  try {
                    console.log("▶️ [VideoContainer] Video play event triggered", {
                      clipId: clip?._id,
                      index,
                      currentTime: e.currentTarget.currentTime,
                      duration: e.currentTarget.duration
                    });
                    // Ensure loading state is cleared once playback starts
                    setIsVideoLoading(false);
                  } catch (error) {
                    console.error("❌ [VideoContainer] Error in onPlay event", error);
                  }
                }}
                onError={(e) => {
                  try {
                    console.error("❌ [VideoContainer] Video error occurred", {
                      clipId: clip?._id,
                      index,
                      error: e.currentTarget.error,
                      networkState: e.currentTarget.networkState
                    });
                    setIsVideoLoading(false);
                    // Show error message to user
                    if (e.currentTarget.error) {
                      const errorCode = e.currentTarget.error.code;
                      let errorMessage = "Video failed to load";
                      if (errorCode === 4) {
                        errorMessage = "Video format not supported or connection error";
                      } else if (errorCode === 2) {
                        errorMessage = "Network error - please check your connection";
                      } else if (errorCode === 3) {
                        errorMessage = "Video decoding error";
                      }
                      toast.error(errorMessage);
                    }
                  } catch (error) {
                    console.error("❌ [VideoContainer] Error in onError event handler", error);
                  }
                }}
                onClick={handleVideoClick}
              >
                <source src={Utils?.generateVideoURL(clip)} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
              
              {/* Single loader - only shows when video is actually loading */}
              {isVideoLoading && (
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    background: "rgba(0, 0, 0, 0.75)",
                    borderRadius: "8px",
                    padding: "16px 20px",
                    color: "white",
                    textAlign: "center",
                    zIndex: 15,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                    minWidth: "120px"
                  }}
                >
                  <div className="spinner-border spinner-border-sm text-white" role="status" style={{ width: "2rem", height: "2rem" }}>
                    <span className="sr-only">Loading...</span>
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: "500" }}>Loading video...</div>
                </div>
              )}
            </div>
          </div>
        </div>
        <canvas
          ref={canvasRef}
          id="drawing-canvas"
          className="canvas"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: drawingMode ? "block" : "none",
            pointerEvents: drawingMode ? "auto" : "none",
          }}
        />
        {drawingMode && accountType === AccountType.TRAINER && (
          <div
            className="absolute hide-in-screenshot"
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "5px",
              flexDirection: "column",
              right: "10px",
              bottom: "10px",
              zIndex: 10,
            }}
          >
            <div className="button" onClick={zoomIn}>
              <PlusCircle />
            </div>
            <div className="button" onClick={zoomOut}>
              <MinusCircle />
            </div>
          </div>
        )}
        </div>
        {/* Controls bar (timeline, play/pause) only for trainer; trainee has no clip controls */}
        {accountType === AccountType.TRAINER && (
          <div
            className="clip-player-controls"
            style={{
              flexShrink: 0,
              width: "100%",
              minHeight: 48,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "6px 10px",
              background: "rgba(0, 0, 0, 0.75)",
              borderTop: "1px solid rgba(255, 255, 255, 0.15)",
            }}
          >
            <CustomVideoControls
              handleSeek={handleSeek}
              isFullscreen={isFullscreen}
              isPlaying={isPlaying}
              toggleFullscreen={toggleFullscreen}
              togglePlayPause={togglePlayPause}
              videoRef={videoRef}
              setIsPlaying={setIsPlaying}
              setCurrentTime={setCurrentTime}
              isLock={isLock}
              lockPoint={lockPoint}
              videoRef2={null}
              handleSeekMouseDown={() => {}}
              handleSeekMouseUp={() => {}}
              volume={1}
              changeVolume={() => {}}
              currentTime={currentTime}
              controlsVisible={controlsVisible}
            />
          </div>
        )}
      </div>
    </>
  );
};

const ClipModeCall = ({
  sessionId,
  timeRemaining,
  bothUsersJoined = false,
  bufferSecondsRemaining = null,
  isMaximized,
  setIsMaximized,
  selectedClips,
  setSelectedClips,
  isLock,
  setIsLock,
  localVideoRef,
  remoteVideoRef,
  toUser,
  fromUser,
  localStream,
  remoteStream,
  isRemoteStreamOff,
  isLocalStreamOff,
  takeScreenshot,
  isLandscape,
  canvasRef,
  canvasRef2,
  videoRef,
  videoRef2,
  videoContainerRef,
  videoContainerRef2,
  setShowScreenshotButton,
  lockPoint,
  setLockPoint
}) => {
  const socket = useContext(SocketContext);
  const [drawingMode, setDrawingMode] = useState(false);
  const [showDrawingTools, setShowDrawingTools] = useState(false);
  const { accountType } = useAppSelector(authState);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setShowScreenshotButton(true)
  }, [])

  const [sketchPickerColor, setSketchPickerColor] = useState({
    r: 241,
    g: 112,
    b: 19,
    a: 1,
  });
  const [currentTime, setCurrentTime] = useState(0);
  const [isCanvasMenuNoteShow, setIsCanvasMenuNoteShow] = useState(false);
  const [micNote, setMicNote] = useState(false);
  const [clipSelectNote, setClipSelectNote] = useState(false);
  const [countClipNoteOpen, setCountClipNoteOpen] = useState(false);

  const [isPlayingBoth, setIsPlayingBoth] = useState(false); // Track video playback state
  const [isPlaying1, setIsPlaying1] = useState(false); // Track video playback state
  const [isPlaying2, setIsPlaying2] = useState(false); // Track video playback state
  const [isFullscreen, setIsFullscreen] = useState(false); // Track fullscreen state
  const [selectedUser, setSelectedUser] = useState(null);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInputPosition, setTextInputPosition] = useState({ x: 0, y: 0, canvasIndex: 1 });
  const [textInputValue, setTextInputValue] = useState("");
  // Track which videos are hidden (dragged outside viewport)
  const [hiddenVideos, setHiddenVideos] = useState({
    student: false,
    teacher: false,
    clips: false
  });
  const longPressTimerRef = useRef(null);

  // Long press (3s) to hide teacher & student videos on trainer side
  const startLongPressHide = () => {
    if (accountType !== AccountType.TRAINER) return;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    longPressTimerRef.current = setTimeout(() => {
      setHiddenVideos((prev) => ({
        ...prev,
        student: true,
        teacher: true,
      }));
    }, 3000);
  };

  const cancelLongPressHide = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleHideVideo = (videoType) => {
    setHiddenVideos(prev => ({ ...prev, [videoType]: true }));
    // Emit socket event to sync hide state
    socket?.emit(EVENTS.ON_VIDEO_HIDE, {
      userInfo: { from_user: fromUser._id, to_user: toUser._id },
      videoType, // 'student' | 'teacher' | 'clips'
    });
  };

  const handleRestoreVideo = (videoType) => {
    setHiddenVideos(prev => ({ ...prev, [videoType]: false }));
    // Emit socket event to sync show state
    socket?.emit(EVENTS.ON_VIDEO_SHOW, {
      userInfo: { from_user: fromUser._id, to_user: toUser._id },
      videoType, // 'student' | 'teacher' | 'clips'
    });
  };

  function handleUserClick(id) {
    if (accountType === AccountType.TRAINER) {
      setSelectedUser(id);
      if (id) {
        setShowScreenshotButton(false)
      } else {
        setShowScreenshotButton(true)
      }
      emitVideoSelectEvent("swap", id);
    }
  }

  const emitVideoSelectEvent = (type, id) => {
    socket.emit(EVENTS.ON_VIDEO_SELECT, {
      userInfo: { from_user: fromUser._id, to_user: toUser._id },
      type,
      id,
    });
  };

  useEffect(() => {
    if (!socket) return;

    const handlePlayPause = (data) => {
      const video1 = videoRef.current;
      const video2 = videoRef2.current;

      console.log("📡 [ClipModeCall] Received ON_VIDEO_PLAY_PAUSE event (dual)", {
        receivedData: data,
        isBoth: data?.both,
        shouldPlay: data?.isPlaying,
        video1Paused: video1?.paused,
        video2Paused: video2?.paused,
        accountType,
      });

      if (!data?.both || !video1 || !video2) return;

      if (data.isPlaying) {
        console.log("▶️ [ClipModeCall] Playing both videos from socket event");
        const p1 = video1.play();
        const p2 = video2.play();
        const all = [p1, p2].every((p) => p && typeof p.then === "function")
          ? Promise.all([p1, p2])
          : Promise.resolve();
        all
          .then(() => setIsPlayingBoth(true))
          .catch((err) => {
            console.warn("ClipModeCall socket play() failed", { err: err?.message || err });
            setIsPlayingBoth(false);
          });
      } else {
        console.log("⏸️ [ClipModeCall] Pausing both videos from socket event");
        video1.pause();
        video2.pause();
        setIsPlayingBoth(false);
      }
    };

    const handleTime = (data) => {
      const video1 = videoRef.current;
      const video2 = videoRef2.current;

      console.log("📡 [ClipModeCall] Received ON_VIDEO_TIME event (dual)", {
        receivedData: data,
        isBoth: data?.both,
        isTrainee: accountType === AccountType.TRAINEE,
        video1Time: video1?.currentTime,
        video2Time: video2?.currentTime,
        newTime: data?.progress,
      });

      if (!data?.both || accountType !== AccountType.TRAINEE || !video1 || !video2) {
        return;
      }

      const oldTime1 = video1.currentTime;
      const oldTime2 = video2.currentTime;

      try {
        video1.currentTime = data.progress;
        video2.currentTime = data.progress;
      } catch (e) {
        console.warn("ClipModeCall dual time sync failed", { progress: data.progress, err: e?.message });
        return;
      }

      console.log("⏩ [ClipModeCall] Both videos synced from socket", {
        from: { video1: oldTime1, video2: oldTime2 },
        to: data.progress,
      });
    };

    const handleToggleDrawingMode = (data) => {
      if (accountType === AccountType.TRAINEE) {
        setDrawingMode(data.drawingMode);
      }
    };

    const handleToggleFullscreen = (data) => {
      if (accountType === AccountType.TRAINEE) {
        setIsMaximized(data.isMaximized);
      }
    };

    const handleToggleLockMode = (data) => {
      console.log("📡 [ClipModeCall] Received TOGGLE_LOCK_MODE event", {
        receivedData: data,
        isTrainee: accountType === AccountType.TRAINEE,
        currentLockState: isLock,
        newLockState: data.isLockMode,
      });

      if (accountType === AccountType.TRAINEE) {
        console.log("🔒 [ClipModeCall] Updating lock mode from socket", {
          from: isLock,
          to: data.isLockMode,
        });
        setIsLock(data.isLockMode);
      }
    };

    const handleClearCanvasSocket = () => {
      clearCanvas();
    };

    const handleVideoHide = (data) => {
      console.log("📡 [ClipModeCall] Received ON_VIDEO_HIDE event", {
        receivedData: data,
        videoType: data?.videoType,
      });
      if (data?.videoType) {
        setHiddenVideos(prev => ({ ...prev, [data.videoType]: true }));
      }
    };

    const handleVideoShow = (data) => {
      console.log("📡 [ClipModeCall] Received ON_VIDEO_SHOW event", {
        receivedData: data,
        videoType: data?.videoType,
      });
      if (data?.videoType) {
        setHiddenVideos(prev => ({ ...prev, [data.videoType]: false }));
      }
    };

    socket.on(EVENTS.ON_VIDEO_PLAY_PAUSE, handlePlayPause);
    socket.on(EVENTS.ON_VIDEO_TIME, handleTime);
    socket.on(EVENTS.TOGGLE_DRAWING_MODE, handleToggleDrawingMode);
    socket.on(EVENTS.TOGGLE_FULL_SCREEN, handleToggleFullscreen);
    socket.on(EVENTS.TOGGLE_LOCK_MODE, handleToggleLockMode);
    socket.on(EVENTS.ON_CLEAR_CANVAS, handleClearCanvasSocket);
    socket.on(EVENTS.ON_VIDEO_HIDE, handleVideoHide);
    socket.on(EVENTS.ON_VIDEO_SHOW, handleVideoShow);

    // Clean up on unmount
    return () => {
      socket.off(EVENTS.ON_VIDEO_PLAY_PAUSE, handlePlayPause);
      socket.off(EVENTS.ON_VIDEO_TIME, handleTime);
      socket.off(EVENTS.TOGGLE_DRAWING_MODE, handleToggleDrawingMode);
      socket.off(EVENTS.TOGGLE_FULL_SCREEN, handleToggleFullscreen);
      socket.off(EVENTS.TOGGLE_LOCK_MODE, handleToggleLockMode);
      socket.off(EVENTS.ON_CLEAR_CANVAS, handleClearCanvasSocket);
      socket.off(EVENTS.ON_VIDEO_HIDE, handleVideoHide);
      socket.off(EVENTS.ON_VIDEO_SHOW, handleVideoShow);
    };
  }, [socket, videoRef, videoRef2, accountType, isLock]);

  // Handle video select events (for swapping videos)
  useEffect(() => {
    if (!socket) return;

    const handleVideoSelect = ({ id, type }) => {
      if (type === "swap" && accountType === AccountType.TRAINEE) {
        setSelectedUser(id);
      }
    };

    socket.on(EVENTS.ON_VIDEO_SELECT, handleVideoSelect);

    return () => {
      if (socket) {
        socket.off(EVENTS.ON_VIDEO_SELECT, handleVideoSelect);
      }
    };
  }, [socket, accountType, setSelectedUser]);

  // Play/pause video
  const togglePlayPause = () => {
    const video1 = videoRef.current;
    const video2 = videoRef2.current;
    
    console.log("🎬 [ClipModeCall] togglePlayPause called (dual video)", {
      video1Exists: !!video1,
      video2Exists: !!video2,
      video1Paused: video1?.paused,
      video2Paused: video2?.paused,
      video1Time: video1?.currentTime,
      video2Time: video2?.currentTime,
      video1Duration: video1?.duration,
      video2Duration: video2?.duration,
      isLock,
      accountType
    });
    
    if (video1 && video2) {
      if (video1.paused) {
        console.log("▶️ [ClipModeCall] Playing both videos", {
          video1Time: video1.currentTime,
          video2Time: video2.currentTime
        });
        const p1 = video1.play();
        const p2 = video2.play();
        const all = [p1, p2].every((p) => p && typeof p.then === "function")
          ? Promise.all([p1, p2])
          : Promise.resolve();
        all
          .then(() => {
            setIsPlayingBoth(true);
            socket?.emit(EVENTS?.ON_VIDEO_PLAY_PAUSE, {
              both: true,
              userInfo: { from_user: fromUser?._id, to_user: toUser?._id },
              isPlaying: true,
            });
          })
          .catch((err) => {
            console.warn("ClipModeCall play() failed on one or both videos", { err: err?.message || err });
            setIsPlayingBoth(false);
          });
      } else {
        console.log("⏸️ [ClipModeCall] Pausing both videos", {
          video1Time: video1.currentTime,
          video2Time: video2.currentTime
        });
        video1.pause();
        video2.pause();
        setIsPlayingBoth(false);
        socket?.emit(EVENTS?.ON_VIDEO_PLAY_PAUSE, {
          both: true,
          userInfo: { from_user: fromUser?._id, to_user: toUser?._id },
          isPlaying: false,
        });
      }
    } else {
      console.warn("⚠️ [ClipModeCall] Cannot toggle play/pause - videos not available", {
        video1Exists: !!video1,
        video2Exists: !!video2
      });
    }
  };

  const handleSeek = (e) => {
    const newProgress = parseFloat(e.target.value);

    console.log("🎯 [ClipModeCall] handleSeek called (dual video)", {
      newProgress,
      video1Exists: !!videoRef?.current,
      video2Exists: !!videoRef2?.current,
      video1Time: videoRef?.current?.currentTime,
      video2Time: videoRef2?.current?.currentTime,
      video1Duration: videoRef?.current?.duration,
      video2Duration: videoRef2?.current?.duration,
      isLock,
      accountType
    });

    if (!videoRef?.current || !videoRef2?.current) {
      console.warn("⚠️ [ClipModeCall] Cannot seek - videos not available");
      return;
    }

    const video1 = videoRef.current;
    const video2 = videoRef2.current;

    const isVideo1Longer = video1.duration >= video2.duration;
    const longerVideo = isVideo1Longer ? video1 : video2;
    const shorterVideo = isVideo1Longer ? video2 : video1;

    const oldTime1 = video1.currentTime;
    const oldTime2 = video2.currentTime;

    // Calculate the delta (difference) in progress
    const delta = newProgress - longerVideo.currentTime;

    console.log("⏩ [ClipModeCall] Seeking both videos", {
      isVideo1Longer,
      longerVideoDuration: longerVideo.duration,
      shorterVideoDuration: shorterVideo.duration,
      oldTime1,
      oldTime2,
      newProgress,
      delta
    });

    // Apply delta to both videos while ensuring shorterVideo does not exceed limits
    longerVideo.currentTime = newProgress;
    shorterVideo.currentTime = Math.min(
      Math.max(shorterVideo.currentTime + delta, 0),
      shorterVideo.duration
    );

    // Update state
    setCurrentTime(longerVideo.currentTime);

    console.log("✅ [ClipModeCall] Videos seeked successfully", {
      video1NewTime: video1.currentTime,
      video2NewTime: video2.currentTime,
      longerVideoTime: longerVideo.currentTime,
      shorterVideoTime: shorterVideo.currentTime
    });

    // Emit event with the new progress
    socket?.emit(EVENTS?.ON_VIDEO_TIME, {
      userInfo: { from_user: fromUser?._id, to_user: toUser?._id },
      both: true,
      progress: longerVideo.currentTime, // Sync using the longer video
    });
  };



  const sendClearCanvasEvent = () => {
    if (remoteVideoRef && remoteVideoRef.current) {
      socket.emit(EVENTS.EMIT_CLEAR_CANVAS, {
        userInfo: { from_user: fromUser._id, to_user: toUser._id },
      });
    }
  };

  const clearCanvas = () => {
    const canvas1 = canvasRef?.current;
    const canvas2 = canvasRef2?.current;

    // Clear canvas1
    const context1 = canvas1?.getContext("2d");
    if (context1 && canvas1) {
      context1.clearRect(0, 0, canvas1.width, canvas1.height);
    }

    // Clear canvas2
    const context2 = canvas2?.getContext("2d");
    if (context2 && canvas2) {
      context2.clearRect(0, 0, canvas2.width, canvas2.height);
    }
  };

  const sendStopDrawingEvent = (canvasIndex = 1) => {
     
    if (remoteVideoRef && remoteVideoRef.current) {
      socket.emit(EVENTS.STOP_DRAWING, {
        userInfo: { from_user: fromUser._id, to_user: toUser._id },
        canvasIndex,
      });
    }
  };

  // const [drawingStep, setDrawingStep] = useState("baseline")
  //  
  const stopDrawing = (event, canvasIndex = 1) => {
     
    event.preventDefault();

    if (selectedShape === SHAPES.ANGLE) {
      if (drawingStep === 'baseline' && currPos[`canvas${canvasIndex}`]) {
         

        // If we're in baseline step and we completed it, move to angle drawing step
        lastDrawingStep = "baseline"
        drawingStep = "angle";
      } else if (drawingStep === 'angle' && anglePoint[`canvas${canvasIndex}`]) {
        // Save the angle calculation here
        drawingStep = "baseline";
        lastDrawingStep = "angle"
        anglePoint = { canvas1: null, canvas2: null };
      }
    }

    if (state.mousedown[`canvas${canvasIndex}`]) {
      sendDrawEvent(canvasIndex);
      sendStopDrawingEvent(canvasIndex);
      isDrawing = false;
      state.mousedown[canvasIndex] = false;
    }
  };

  const sendDrawEvent = (canvasIndex = 1) => {
     
    try {
      const canvas =
        canvasIndex === 1 ? canvasRef?.current : canvasRef2?.current;
      if (!canvas) return;
      const { width, height } = canvas;
      canvas.toBlob((blob) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (!(event && event.target)) return;
          const binaryData = event.target.result;

          socket.emit(EVENTS.DRAW, {
            userInfo: { from_user: fromUser._id, to_user: toUser._id },
            strikes: binaryData,
            canvasSize: { width, height },
            canvasIndex,
          });
        };
        reader.readAsArrayBuffer(blob);
      });
    } catch (error) {
       
    }
  };

  // Handle drawing coordinates from socket
  useEffect(() => {
    if (!socket) return;

    const handleDrawingCoords = ({ strikes, canvasSize, canvasIndex }) => {
      const canvas =
        canvasIndex === 1 ? canvasRef?.current : canvasRef2?.current;
      const context = canvas?.getContext("2d");
      if (!context || !canvas) return;
      const blob = new Blob([strikes]);
      const image = new Image();
      image.src = URL.createObjectURL(blob);
      image.onload = () => {
        const { width, height } = canvasSize;
        const scaleX = canvas.width / width;
        const scaleY = canvas.height / height;
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, width * scaleX, height * scaleY);
      };
    };

    socket.on(EVENTS.EMIT_DRAWING_CORDS, handleDrawingCoords);

    return () => {
      if (socket) {
        socket.off(EVENTS.EMIT_DRAWING_CORDS, handleDrawingCoords);
      }
    };
  }, [socket, canvasRef, canvasRef2]);

  const sendEmitUndoEvent = useCallback((canvasIndex) => {
    _debounce(() => sendDrawEvent(canvasIndex), 500)();
  }, []);

  const undoDrawing = async (
    senderConfig,
    extraCoordinateConfig,
    removeLastCoordinate = true,
    canvasIndex = 1
  ) => {
     
    try {
      const canvas =
        canvasIndex === 1 ? canvasRef?.current : canvasRef2?.current;
      const context = canvas?.getContext("2d");
      if (!context || !canvas) return;
      context.clearRect(0, 0, canvas.width, canvas.height);

      if (removeLastCoordinate)
        storedLocalDrawPaths[`canvas${canvasIndex}`].sender.splice(-1, 1);



      // Draw all the paths in the paths array
      await senderConfig.coordinates.forEach((path) => {
        context.beginPath();
        context.strokeStyle = senderConfig.theme.strokeStyle;
        context.lineWidth = senderConfig.theme.lineWidth;
        context.lineCap = "round";
        if (path && Array.isArray(path)) {
          context.moveTo(path[0][0], path[0][1]);
          for (let i = 0; i < path.length; i++) {
            context.lineTo(path[i][0], path[i][1]);
          }
          context.stroke();
        }
      });

      await extraCoordinateConfig.coordinates.forEach((path) => {
        context.beginPath();
        context.strokeStyle = extraCoordinateConfig.theme.strokeStyle;
        context.lineWidth = extraCoordinateConfig.theme.lineWidth;
        context.lineCap = "round";

        if (path && Array.isArray(path)) {
          context.moveTo(path[0][0], path[0][1]);
          for (let i = 0; i < path.length; i++) {
            context.lineTo(path[i][0], path[i][1]);
          }
          context.stroke();
        }
      });

      if (strikes[`canvas${canvasIndex}`].length <= 0) return;
      context.putImageData(strikes[`canvas${canvasIndex}`].pop(), 0, 0);
       
      if (drawingStep === "baseline" && selectedShape === SHAPES.ANGLE && lastDrawingStep === "angle") {
        context.putImageData(strikes[`canvas${canvasIndex}`].pop(), 0, 0);
      }
      // Send event to the other user (if needed)
      if (removeLastCoordinate) {
        sendEmitUndoEvent(canvasIndex);
      }
    } catch (error) {
       
    }
  };

  const calculateAngle = (start, end, angle) => {
     
    const dx1 = end.x - start.x;
    const dy1 = end.y - start.y;
    const dx2 = angle.x - end.x;
    const dy2 = angle.y - end.y;
     
    const dotProduct = -(dx1 * dx2 + dy1 * dy2);
     
    const magnitude1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
    const magnitude2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
     
    let angleRad = Math.acos(dotProduct / (magnitude1 * magnitude2));
    let angleDeg = (angleRad * 180) / Math.PI;
     

    return isNaN(angleDeg) ? 0 : angleDeg;
  };

  const calculateCompleteAngle = (start, end, angle) => {
    // Vector from start to end point (baseline)
    const dx1 = end.x - start.x;
    const dy1 = end.y - start.y;

    // Vector from end point to angle point
    const dx2 = angle.x - end.x;
    const dy2 = angle.y - end.y;

    // Calculate the angle between the two vectors
    const angleRad = Math.atan2(dy2, dx2) - Math.atan2(dy1, dx1);
    let angleDeg = (angleRad * 180) / Math.PI;

    // Normalize to 0-360 range
    if (angleDeg < 0) {
      angleDeg += 360;
    }

    return isNaN(angleDeg) ? 0 : angleDeg;
  };

  useEffect(() => {
    const video1 = videoRef.current;
    const video2 = videoRef2.current;

    const canvas1 = canvasRef?.current;
    const canvas2 = canvasRef2?.current;

    const context1 = canvas1?.getContext("2d");
    const context2 = canvas2?.getContext("2d");

    const drawFrame = () => {
      if (canvas1 && context1 && video1) {
        context1.fillStyle = "rgba(255, 255, 255, 0.5)";
        context1.fillRect(0, 0, canvas1.width, canvas1.height);
        // Render text annotations for canvas1
        if (textInputs.canvas1 && textInputs.canvas1.length > 0) {
          textInputs.canvas1.forEach((textItem) => {
            if (textItem.text) {
              context1.save();
              context1.font = `${textItem.fontSize || 18}px Arial`;
              context1.fillStyle = textItem.color || canvasConfigs.sender.strokeStyle;
              context1.textBaseline = "top";
              // Draw background for better visibility
              const metrics = context1.measureText(textItem.text);
              const padding = 4;
              context1.fillStyle = "rgba(0, 0, 0, 0.5)";
              context1.fillRect(
                textItem.x - padding,
                textItem.y - padding,
                metrics.width + padding * 2,
                (textItem.fontSize || 18) + padding * 2
              );
              // Draw text
              context1.fillStyle = textItem.color || canvasConfigs.sender.strokeStyle;
              context1.fillText(textItem.text, textItem.x, textItem.y);
              context1.restore();
            }
          });
        }
      }
      if (canvas2 && context2 && video2) {
        context2.fillStyle = "rgba(255, 255, 255, 0.5)";
        context2.fillRect(0, 0, canvas2.width, canvas2.height);
        // Render text annotations for canvas2
        if (textInputs.canvas2 && textInputs.canvas2.length > 0) {
          textInputs.canvas2.forEach((textItem) => {
            if (textItem.text) {
              context2.save();
              context2.font = `${textItem.fontSize || 18}px Arial`;
              context2.fillStyle = textItem.color || canvasConfigs.sender.strokeStyle;
              context2.textBaseline = "top";
              // Draw background for better visibility
              const metrics = context2.measureText(textItem.text);
              const padding = 4;
              context2.fillStyle = "rgba(0, 0, 0, 0.5)";
              context2.fillRect(
                textItem.x - padding,
                textItem.y - padding,
                metrics.width + padding * 2,
                (textItem.fontSize || 18) + padding * 2
              );
              // Draw text
              context2.fillStyle = textItem.color || canvasConfigs.sender.strokeStyle;
              context2.fillText(textItem.text, textItem.x, textItem.y);
              context2.restore();
            }
          });
        }
      }
      requestAnimationFrame(drawFrame);
    };

    // Drawing Logic for Canvas 1 and Canvas 2
    const startDrawing = (event, canvasIndex = 1) => {
      try {
         
        event.preventDefault();
        isDrawing = true;
        const canvas =
          canvasIndex === 1 ? canvasRef?.current : canvasRef2?.current;
        const context = canvas?.getContext("2d");
        if (!context) return;

        savedPos[`canvas${canvasIndex}`] = context.getImageData(
          0,
          0,
          canvas.width,
          canvas.height
        );

        if (strikes[`canvas${canvasIndex}`].length >= 10)
          strikes[`canvas${canvasIndex}`].shift();
        strikes[`canvas${canvasIndex}`].push(savedPos[`canvas${canvasIndex}`]);

        const mousePos = event.type.includes("touchstart")
          ? getTouchPos(event, canvas)
          : getMousePositionOnCanvas(event, canvas);

        // Handle text annotation
        if (selectedShape === SHAPES.TEXT) {
          // For text, show input prompt at click position
          const canvas = canvasIndex === 1 ? canvasRef?.current : canvasRef2?.current;
          if (canvas) {
            const rect = canvas.getBoundingClientRect();
            setTextInputPosition({
              x: rect.left + mousePos.x * (rect.width / canvas.width),
              y: rect.top + mousePos.y * (rect.height / canvas.height),
              canvasIndex: canvasIndex,
              canvasX: mousePos.x,
              canvasY: mousePos.y
            });
            setTextInputValue("");
            setShowTextInput(true);
          }
          isDrawing = false;
          state.mousedown[`canvas${canvasIndex}`] = false;
          return;
        }

        context.strokeStyle = canvasConfigs.sender.strokeStyle;
        context.lineWidth = canvasConfigs.sender.lineWidth;
        context.lineCap = "round";
        context.beginPath();
        context.moveTo(mousePos.x, mousePos.y);
        state.mousedown[`canvas${canvasIndex}`] = true;
        if (selectedShape === SHAPES.ANGLE) {
           
          if (drawingStep === "baseline") {

            startPos[`canvas${canvasIndex}`] = { x: mousePos.x, y: mousePos.y };
            currPos[`canvas${canvasIndex}`] = { x: mousePos.x, y: mousePos.y };

          } else if (drawingStep === "angle") {
            anglePoint[`canvas${canvasIndex}`] = { x: mousePos.x, y: mousePos.y };

          }
        } else {
          startPos[`canvas${canvasIndex}`] = { x: mousePos.x, y: mousePos.y };

        }

      } catch (error) {
         
      }
    };

    const findDistance = (startPos, currPos) => {
      let dis = Math.sqrt(
        Math.pow(currPos.x - startPos.x, 2) +
        Math.pow(currPos.y - startPos.y, 2)
      );
      return dis;
    };

    const drawShapes = (context, canvasIndex) => {
      switch (selectedShape) {
        case SHAPES.ANGLE: {
          // Draw baseline
          context.moveTo(
            startPos[`canvas${canvasIndex}`].x,
            startPos[`canvas${canvasIndex}`].y
          );
          context.lineTo(
            currPos[`canvas${canvasIndex}`].x,
            currPos[`canvas${canvasIndex}`].y
          );
          // Draw angle lines
          if (anglePoint[`canvas${canvasIndex}`]) {
            context.moveTo(currPos[`canvas${canvasIndex}`].x, currPos[`canvas${canvasIndex}`].y);
            context.lineTo(anglePoint[`canvas${canvasIndex}`].x, anglePoint[`canvas${canvasIndex}`].y);
          }
          break;
        }
        case SHAPES.LINE: {
          context.moveTo(
            startPos[`canvas${canvasIndex}`].x,
            startPos[`canvas${canvasIndex}`].y
          );
          context.lineTo(
            currPos[`canvas${canvasIndex}`].x,
            currPos[`canvas${canvasIndex}`].y
          );
          break;
        }
        case SHAPES.CIRCLE: {
          let distance = findDistance(
            startPos[`canvas${canvasIndex}`],
            currPos[`canvas${canvasIndex}`]
          );
          context.arc(
            startPos[`canvas${canvasIndex}`].x,
            startPos[`canvas${canvasIndex}`].y,
            distance,
            0,
            2 * Math.PI,
            false
          );
          break;
        }
        case SHAPES.SQUARE: {
          let w =
            currPos[`canvas${canvasIndex}`].x -
            startPos[`canvas${canvasIndex}`].x;
          let h =
            currPos[`canvas${canvasIndex}`].y -
            startPos[`canvas${canvasIndex}`].y;
          context.rect(
            startPos[`canvas${canvasIndex}`].x,
            startPos[`canvas${canvasIndex}`].y,
            w,
            h
          );
          break;
        }
        case SHAPES.RECTANGLE: {
          let w =
            currPos[`canvas${canvasIndex}`].x -
            startPos[`canvas${canvasIndex}`].x;
          let h =
            currPos[`canvas${canvasIndex}`].y -
            startPos[`canvas${canvasIndex}`].y;
          context.rect(
            startPos[`canvas${canvasIndex}`].x,
            startPos[`canvas${canvasIndex}`].y,
            w,
            h
          );
          break;
        }
        case SHAPES.OVAL: {
          const transform = context.getTransform();
          let w =
            currPos[`canvas${canvasIndex}`].x -
            startPos[`canvas${canvasIndex}`].x;
          let h =
            currPos[`canvas${canvasIndex}`].y -
            startPos[`canvas${canvasIndex}`].y;
          context.fillStyle = "#FFFFFF";
          context.fillStyle = "rgba(0, 0, 0, 0)";
          const radiusX = w * transform.a;
          const radiusY = h * transform.d;
          if (radiusX > 0 && radiusY > 0) {
            context.ellipse(
              currPos[`canvas${canvasIndex}`].x,
              currPos[`canvas${canvasIndex}`].y,
              radiusX,
              radiusY,
              0,
              0,
              2 * Math.PI
            );
            context.fill();
          }
          break;
        }
        case SHAPES.TRIANGLE: {
          context.moveTo(
            startPos[`canvas${canvasIndex}`].x +
            (currPos[`canvas${canvasIndex}`].x -
              startPos[`canvas${canvasIndex}`].x) /
            2,
            startPos[`canvas${canvasIndex}`].y
          );
          context.lineTo(
            startPos[`canvas${canvasIndex}`].x,
            currPos[`canvas${canvasIndex}`].y
          );
          context.lineTo(
            currPos[`canvas${canvasIndex}`].x,
            currPos[`canvas${canvasIndex}`].y
          );
          context.closePath();
          break;
        }
        case SHAPES.ARROW_RIGHT: {
          const x1 = startPos[`canvas${canvasIndex}`].x;
          const y1 = startPos[`canvas${canvasIndex}`].y;
          const x2 = currPos[`canvas${canvasIndex}`].x;
          const y2 = currPos[`canvas${canvasIndex}`].y;
          const arrowSize = 12;
          const angle = Math.atan2(y2 - y1, x2 - x1);
          
          // Draw main line
          context.moveTo(x1, y1);
          context.lineTo(x2, y2);
          
          // Draw arrowhead
          context.moveTo(x2, y2);
          context.lineTo(
            x2 - arrowSize * Math.cos(angle - Math.PI / 6),
            y2 - arrowSize * Math.sin(angle - Math.PI / 6)
          );
          context.moveTo(x2, y2);
          context.lineTo(
            x2 - arrowSize * Math.cos(angle + Math.PI / 6),
            y2 - arrowSize * Math.sin(angle + Math.PI / 6)
          );
          context.stroke();
          break;
        }
        case SHAPES.TWO_SIDE_ARROW: {
          const x1 = startPos[`canvas${canvasIndex}`].x;
          const y1 = startPos[`canvas${canvasIndex}`].y;
          const x2 = currPos[`canvas${canvasIndex}`].x;
          const y2 = currPos[`canvas${canvasIndex}`].y;
          const size = 10;
          const angle = Math.atan2(y2 - y1, x2 - x1);
          const arrowPoints = [
            {
              x: x2 - size * Math.cos(angle - Math.PI / 6),
              y: y2 - size * Math.sin(angle - Math.PI / 6),
            },
            {
              x: x2 - size * Math.cos(angle + Math.PI / 6),
              y: y2 - size * Math.sin(angle + Math.PI / 6),
            },
            {
              x: x1 + size * Math.cos(angle - Math.PI / 6),
              y: y1 + size * Math.sin(angle - Math.PI / 6),
            },
            {
              x: x1 + size * Math.cos(angle + Math.PI / 6),
              y: y1 + size * Math.sin(angle + Math.PI / 6),
            },
          ];
          context.moveTo(x1, y1);
          context.lineTo(x2, y2);
          context.moveTo(arrowPoints[0].x, arrowPoints[0].y);
          context.lineTo(x2, y2);
          context.lineTo(arrowPoints[1].x, arrowPoints[1].y);
          context.moveTo(arrowPoints[2].x, arrowPoints[2].y);
          context.lineTo(x1, y1);
          context.lineTo(arrowPoints[3].x, arrowPoints[3].y);
          context.stroke();
          break;
        }
        case SHAPES.ARROW_UP: {
          const x1 = startPos[`canvas${canvasIndex}`].x;
          const y1 = startPos[`canvas${canvasIndex}`].y;
          const x2 = currPos[`canvas${canvasIndex}`].x;
          const y2 = currPos[`canvas${canvasIndex}`].y;
          const size = 12;
          const angle = Math.atan2(y2 - y1, x2 - x1);
          context.moveTo(x1, y1);
          context.lineTo(x2, y2);
          // Draw arrowhead pointing up
          context.moveTo(x2, y2);
          context.lineTo(x2 - size * Math.cos(angle - Math.PI / 6), y2 - size * Math.sin(angle - Math.PI / 6));
          context.moveTo(x2, y2);
          context.lineTo(x2 - size * Math.cos(angle + Math.PI / 6), y2 - size * Math.sin(angle + Math.PI / 6));
          context.stroke();
          break;
        }
        case SHAPES.ARROW_DOWN: {
          const x1 = startPos[`canvas${canvasIndex}`].x;
          const y1 = startPos[`canvas${canvasIndex}`].y;
          const x2 = currPos[`canvas${canvasIndex}`].x;
          const y2 = currPos[`canvas${canvasIndex}`].y;
          const size = 12;
          const angle = Math.atan2(y2 - y1, x2 - x1);
          context.moveTo(x1, y1);
          context.lineTo(x2, y2);
          // Draw arrowhead pointing down
          context.moveTo(x2, y2);
          context.lineTo(x2 - size * Math.cos(angle - Math.PI / 6), y2 - size * Math.sin(angle - Math.PI / 6));
          context.moveTo(x2, y2);
          context.lineTo(x2 - size * Math.cos(angle + Math.PI / 6), y2 - size * Math.sin(angle + Math.PI / 6));
          context.stroke();
          break;
        }
        case SHAPES.ARROW_LEFT: {
          const x1 = startPos[`canvas${canvasIndex}`].x;
          const y1 = startPos[`canvas${canvasIndex}`].y;
          const x2 = currPos[`canvas${canvasIndex}`].x;
          const y2 = currPos[`canvas${canvasIndex}`].y;
          const size = 12;
          const angle = Math.atan2(y2 - y1, x2 - x1);
          context.moveTo(x1, y1);
          context.lineTo(x2, y2);
          // Draw arrowhead pointing left
          context.moveTo(x2, y2);
          context.lineTo(x2 - size * Math.cos(angle - Math.PI / 6), y2 - size * Math.sin(angle - Math.PI / 6));
          context.moveTo(x2, y2);
          context.lineTo(x2 - size * Math.cos(angle + Math.PI / 6), y2 - size * Math.sin(angle + Math.PI / 6));
          context.stroke();
          break;
        }
      }
    };

    const draw = (event, canvasIndex = 1) => {
       
      event.preventDefault();
      const canvas =
        canvasIndex === 1 ? canvasRef?.current : canvasRef2?.current;
      const context = canvas?.getContext("2d");
      if (!isDrawing || !context || !state.mousedown[`canvas${canvasIndex}`])
        return;

      const mousePos = event.type.includes("touchmove")
        ? getTouchPos(event, canvas)
        : getMousePositionOnCanvas(event, canvas);

       
      if (selectedShape === SHAPES.FREE_HAND) {
        context.strokeStyle = canvasConfigs.sender.strokeStyle;
        context.lineWidth = canvasConfigs.sender.lineWidth;
        context.lineCap = "round";
        context.lineTo(mousePos.x, mousePos.y);
        context.stroke();
        currPos[`canvas${canvasIndex}`] = { x: mousePos?.x, y: mousePos.y };
      }
      else if (selectedShape === SHAPES.ANGLE) {
        // Handle angle tool logic

        if (drawingStep === "baseline") {
          // Draw the angle tool shape (line + angle marking)
          currPos[`canvas${canvasIndex}`] = { x: mousePos?.x, y: mousePos.y };
          context.putImageData(savedPos[`canvas${canvasIndex}`], 0, 0);
          context.beginPath();
          drawShapes(context, canvasIndex);
          context.stroke();
        } else {
          anglePoint[`canvas${canvasIndex}`] = mousePos;

          context.putImageData(savedPos[`canvas${canvasIndex}`], 0, 0);
          context.beginPath();
          drawShapes(context, canvasIndex);
          context.stroke();
          const computedAngle = calculateAngle(
            startPos[`canvas${canvasIndex}`],
            currPos[`canvas${canvasIndex}`],
            mousePos
          );
          const completeComputedAngle = calculateCompleteAngle(startPos[`canvas${canvasIndex}`],
            currPos[`canvas${canvasIndex}`],
            mousePos)
           
          // Enhanced angle display with better positioning and background
          const angleText = `${computedAngle.toFixed(1)}°`;
          const textX = currPos[`canvas${canvasIndex}`].x;
          const textY = currPos[`canvas${canvasIndex}`].y;
          
          // Draw background for better visibility
          context.save();
          context.font = "bold 18px Arial";
          const metrics = context.measureText(angleText);
          const textWidth = metrics.width;
          const textHeight = 20;
          const padding = 6;
          
          // Calculate position to avoid overlap
          let displayX = textX + 15;
          let displayY = textY - 15;
          if (completeComputedAngle > 180) {
            displayX = textX - textWidth - 15;
            displayY = textY + 15;
          }
          
          // Draw semi-transparent background
          context.fillStyle = "rgba(0, 0, 0, 0.6)";
          context.fillRect(displayX - padding, displayY - textHeight - padding, textWidth + padding * 2, textHeight + padding * 2);
          
          // Draw angle text
          context.fillStyle = "#FFFFFF";
          context.fillText(angleText, displayX, displayY);
          context.restore();

        }

      } else {
        //  
        currPos[`canvas${canvasIndex}`] = { x: mousePos?.x, y: mousePos.y };
        context.putImageData(savedPos[`canvas${canvasIndex}`], 0, 0);
        context.beginPath();
        drawShapes(context, canvasIndex);
        context.stroke();
      }
    };

    if (canvas1) {
      canvas1.addEventListener("touchstart", (e) => startDrawing(e, 1), {
        passive: false,
      });
      canvas1.addEventListener("touchmove", (e) => draw(e, 1), {
        passive: false,
      });
      canvas1.addEventListener("touchend", (e) => stopDrawing(e, 1), {
        passive: false,
      });

      canvas1.addEventListener("mousedown", (e) => startDrawing(e, 1));
      canvas1.addEventListener("mousemove", (e) => draw(e, 1));
      canvas1.addEventListener("mouseup", (e) => stopDrawing(e, 1));
    }

    if (canvas2) {
      canvas2.addEventListener("touchstart", (e) => startDrawing(e, 2), {
        passive: false,
      });
      canvas2.addEventListener("touchmove", (e) => draw(e, 2), {
        passive: false,
      });
      canvas2.addEventListener("touchend", (e) => stopDrawing(e, 2), {
        passive: false,
      });

      canvas2.addEventListener("mousedown", (e) => startDrawing(e, 2));
      canvas2.addEventListener("mousemove", (e) => draw(e, 2));
      canvas2.addEventListener("mouseup", (e) => stopDrawing(e, 2));
    }

    return () => {
      video1?.removeEventListener("play", drawFrame);
      video2?.removeEventListener("play", drawFrame);
    };
  }, [canvasRef, canvasRef2]);

  const getMousePositionOnCanvas = (event, canvas) => {
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width; // Scale factor for width
    const scaleY = canvas.height / rect.height; // Scale factor for height

    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    return { x, y };
  };

  const getTouchPos = (touchEvent, canvas) => {
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (touchEvent.changedTouches[0].clientX - rect.left) * scaleX;
    const y = (touchEvent.changedTouches[0].clientY - rect.top) * scaleY;

    return { x, y };
  };

  function resetInitialPinnedUser() { }
  const isSingle = selectedClips?.length === 1;

  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column", 
      height: "100%", 
      maxHeight: "100%", 
      overflow: "hidden",
      width: "100%",
      boxSizing: "border-box"
    }}>
      <div
        className="d-flex w-100 justify-content-end"
        style={{
          padding: "6px 12px 4px",
          flexShrink: 0,
          boxSizing: "border-box",
          zIndex: 100,
          position: "relative",
        }}
      >
        {(timeRemaining != null || bufferSecondsRemaining != null || !bothUsersJoined) && (
          <TimeRemaining
            timeRemaining={timeRemaining}
            bothUsersJoined={bothUsersJoined}
            bufferSecondsRemaining={bufferSecondsRemaining}
          />
        )}
      </div>

      <div
        className={`d-flex pl-2 pr-2 ${accountType === AccountType.TRAINER && !selectedUser
          ? "justify-content-between align-items-center"
          : "justify-content-end align-items-center"
          } ${isMaximized ? "" : "w-100"}`}
        style={{
          background: accountType === AccountType.TRAINER && !selectedUser 
            ? "rgba(255, 255, 255, 0.95)" 
            : "transparent",
          backdropFilter: accountType === AccountType.TRAINER && !selectedUser ? "blur(10px)" : "none",
          borderRadius: accountType === AccountType.TRAINER && !selectedUser ? "15px" : "0",
          padding: accountType === AccountType.TRAINER && !selectedUser ? "6px 12px" : "0",
          boxShadow: accountType === AccountType.TRAINER && !selectedUser 
            ? "0 2px 10px rgba(0, 0, 0, 0.1)" 
            : "none",
          marginBottom: "6px",
          flexShrink: 0,
          boxSizing: "border-box",
        }}
      >
        {accountType === AccountType.TRAINER && !selectedUser && (
          <div className="d-flex align-items-center gap-2" style={{ flexWrap: "wrap" }}>
            <div
              className="button"
              onClick={() => {
                setIsMaximized(!isMaximized);
                socket.emit(EVENTS.TOGGLE_FULL_SCREEN, {
                  userInfo: {
                    from_user: fromUser._id,
                    to_user: toUser._id,
                  },
                  isMaximized: !isMaximized,
                });
              }}
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "50%",
                background: isMaximized ? "#4a90e2" : "#f5f5f5",
                color: isMaximized ? "white" : "#333",
                border: "2px solid",
                borderColor: isMaximized ? "#4a90e2" : "#e0e0e0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.3s ease",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.1)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.1)";
              }}
            >
              {isMaximized ? <Minimize size={18} /> : <Maximize size={18} />}
            </div>

            {isMaximized && (
              <div 
                className="button aperture" 
                onClick={takeScreenshot}
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "50%",
                  background: "#f5f5f5",
                  border: "2px solid #e0e0e0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#f3e5f5";
                  e.currentTarget.style.borderColor = "#9c27b0";
                  e.currentTarget.style.color = "#9c27b0";
                  e.currentTarget.style.transform = "scale(1.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "#f5f5f5";
                  e.currentTarget.style.borderColor = "#e0e0e0";
                  e.currentTarget.style.color = "#333";
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                <Aperture size={16} />
              </div>
            )}

            {isMaximized && (
              <div
                className="button video-lock"
                onClick={() => {
                  const newLockState = !isLock;
                  const lockPointTemp = !isLock
                    ? (videoRef.current?.duration || 0) >
                      (videoRef2.current?.duration || 0)
                      ? videoRef.current?.currentTime || 0
                      : videoRef2.current?.currentTime || 0
                    : videoRef.current?.currentTime || 0;

                  console.log("🔒 [ClipModeCall] Toggling lock mode", {
                    oldLockState: isLock,
                    newLockState,
                    lockPointTemp,
                    video1Time: videoRef.current?.currentTime,
                    video2Time: videoRef2.current?.currentTime,
                    video1Duration: videoRef.current?.duration,
                    video2Duration: videoRef2.current?.duration,
                    accountType,
                  });

                  // Broadcast lock state to trainee (no clearing of annotations)
                  socket.emit(EVENTS.TOGGLE_LOCK_MODE, {
                    userInfo: { from_user: fromUser._id, to_user: toUser._id },
                    isLockMode: newLockState,
                  });

                  // Update local lock state and seek lock point
                  setIsLock(newLockState);
                  setLockPoint(lockPointTemp);
                }}
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "50%",
                  background: isLock ? "#ff9800" : "#f5f5f5",
                  color: isLock ? "white" : "#333",
                  border: "2px solid",
                  borderColor: isLock ? "#ff9800" : "#e0e0e0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.1)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.1)";
                }}
              >
                {isLock ? <FaLock size={16} /> : <FaUnlock size={16} />}
              </div>
            )}

            <div
              style={{
                position: "relative",
              }}
            >
              <div
                className="button"
                onClick={() => {
                  setDrawingMode(!drawingMode);
                  socket.emit(EVENTS.TOGGLE_DRAWING_MODE, {
                    userInfo: {
                      from_user: fromUser._id,
                      to_user: toUser._id,
                    },
                    drawingMode: !drawingMode,
                  });
                  setShowDrawingTools(false);
                }}
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "50%",
                  background: drawingMode ? "#2196f3" : "#f5f5f5",
                  color: drawingMode ? "white" : "#333",
                  border: "2px solid",
                  borderColor: drawingMode ? "#2196f3" : "#e0e0e0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
                }}
                onMouseEnter={(e) => {
                  if (!drawingMode) {
                    e.currentTarget.style.background = "#e3f2fd";
                    e.currentTarget.style.borderColor = "#2196f3";
                    e.currentTarget.style.color = "#2196f3";
                  }
                  e.currentTarget.style.transform = "scale(1.1)";
                }}
                onMouseLeave={(e) => {
                  if (!drawingMode) {
                    e.currentTarget.style.background = "#f5f5f5";
                    e.currentTarget.style.borderColor = "#e0e0e0";
                    e.currentTarget.style.color = "#333";
                  }
                  e.currentTarget.style.transform = "scale(1)";
                }}
              >
                <PenTool size={18} color={drawingMode ? "white" : "black"} />
              </div>
            </div>

            <div
              style={{
                position: "relative",
              }}
            >
              {drawingMode && (
                <div
                  style={{
                    position: "absolute",
                    zIndex: 99,
                    top: -10,
                  }}
                >
                  <CanvasMenuBar
                    isOpen={isOpen}
                    setIsOpen={setIsOpen}
                    setSketchPickerColor={(rgb) => {
                      setSketchPickerColor(rgb);
                    }}
                    isFromPotrait={true}
                    sketchPickerColor={sketchPickerColor}
                    canvasConfigs={canvasConfigs}
                    setCanvasConfigs={(config) => {
                      canvasConfigs = config;
                    }}
                    drawShapes={(shapeType) => {
                       
                      selectedShape = shapeType;
                    }}
                    refreshDrawing={() => {
                      // deleting the canvas drawing
                      storedLocalDrawPaths = {
                        canvas1: { sender: [], receiver: [] },
                        canvas2: { sender: [], receiver: [] }, // Separate history for each canvas
                      };
                      clearCanvas();
                      sendClearCanvasEvent();
                    }}
                    selectedClips={selectedClips}
                    setSelectedClips={setSelectedClips}
                    toUser={{
                      fullname: "",
                    }}
                    isCanvasMenuNoteShow={isCanvasMenuNoteShow}
                    setIsCanvasMenuNoteShow={setIsCanvasMenuNoteShow}
                    setMicNote={setMicNote}
                    setClipSelectNote={setClipSelectNote}
                    clipSelectNote={clipSelectNote}
                    setCountClipNoteOpen={setCountClipNoteOpen}
                    resetInitialPinnedUser={resetInitialPinnedUser}
                    isFullScreen={isMaximized}
                  />
                </div>
              )}
            </div>
          </div>
        )}

      </div>
      
      {/* Show top user video section only when a user is selected.
          This prevents an empty block of space above the clips when nothing is selected. */}
      {selectedUser && (
      <div
          className="video-section video-section-clip-mode"
        style={{
            flex: 1,
            minHeight: 0,
            maxHeight: "none", // No max-height constraint for clip mode
            overflow: "hidden",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            boxSizing: "border-box",
            padding: "0 8px",
          }}
        >
          <div
            style={{
          position: "relative",
              flex: 1,
              minHeight: 0,
        }}
      >
        <UserBox
          id={fromUser._id}
          onClick={handleUserClick}
          selectedUser={selectedUser}
          selected={selectedUser === fromUser._id}
          notSelected={selectedUser}
          videoRef={remoteVideoRef}
          user={toUser}
          stream={remoteStream}
          isStreamOff={isRemoteStreamOff}
          isLandscape={isLandscape}
        />

        <UserBox
          id={toUser._id}
          onClick={handleUserClick}
          selectedUser={selectedUser}
          selected={selectedUser === toUser._id}
          notSelected={selectedUser}
          videoRef={localVideoRef}
          user={fromUser}
          stream={localStream}
          isStreamOff={isLocalStreamOff}
          isLandscape={isLandscape}
          muted={true}
        />

        {selectedUser === toUser._id ? (
          <UserBoxMini
            id={fromUser._id}
            onClick={handleUserClick}
            selected={false}
            videoRef={remoteVideoRef}
            stream={remoteStream}
            user={toUser}
            bottom={300}
            isStreamOff={isRemoteStreamOff}
          />
        ) : (
          <UserBoxMini
            id={toUser._id}
            onClick={handleUserClick}
            selected={false}
            videoRef={localVideoRef}
            stream={localStream}
            user={fromUser}
            bottom={300}
            isStreamOff={isLocalStreamOff}
            muted={true}
          />
        )}

        <VideoMiniBox
          clips={selectedClips}
          id={null}
          bottom={60}
          onClick={handleUserClick}
          onHide={handleHideVideo}
          onRestore={handleRestoreVideo}
          isHidden={hiddenVideos.clips}
        />
      </div>
        </div>
      )}
      <div
        style={{
          display: selectedUser ? "none" : "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          position: "relative",
        }}
        id="clip-container"
        onMouseDown={startLongPressHide}
        onMouseUp={cancelLongPressHide}
        onMouseLeave={cancelLongPressHide}
        onTouchStart={startLongPressHide}
        onTouchEnd={cancelLongPressHide}
        onTouchCancel={cancelLongPressHide}
      >
        {selectedClips.length > 1 ? (
          <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, gap: "8px" }}>
            <VideoContainer
              sessionId={sessionId}
              drawingMode={drawingMode}
              isLock={isLock}
              index={1}
              isMaximized={isMaximized}
              canvasRef={canvasRef}
              videoRef={videoRef}
              clip={selectedClips[0]}
              isPlaying={isLock ? isPlayingBoth : isPlaying1}
              setIsPlaying={isLock ? setIsPlayingBoth : setIsPlaying1}
              fromUser={fromUser}
              toUser={toUser}
              isDrawing={isDrawing}
              stopDrawing={stopDrawing}
              savedPos={savedPos}
              startPos={startPos}
              currPos={currPos}
              strikes={strikes}
              extraStream={extraStream}
              localVideoRef={localVideoRef}
              Peer={Peer}
              canvasConfigs={canvasConfigs}
              selectedShape={selectedShape}
              sendDrawEvent={sendDrawEvent}
              undoDrawing={undoDrawing}
              isLandscape={isLandscape}
              videoContainerRef={videoContainerRef}
              lockPoint={lockPoint}
              videoRef2={videoRef2}
              sharedTogglePlayPause={isLock ? togglePlayPause : undefined}
              sharedHandleSeek={isLock ? handleSeek : undefined}
            />
            <VideoContainer
              sessionId={sessionId}
              drawingMode={drawingMode}
              isLock={isLock}
              index={2}
              canvasRef={canvasRef2}
              videoRef={videoRef2}
              videoRef2={videoRef}
              clip={selectedClips[1]}
              isPlaying={isLock ? isPlayingBoth : isPlaying2}
              setIsPlaying={isLock ? setIsPlayingBoth : setIsPlaying2}
              fromUser={fromUser}
              toUser={toUser}
              isDrawing={isDrawing}
              stopDrawing={stopDrawing}
              savedPos={savedPos}
              startPos={startPos}
              currPos={currPos}
              strikes={strikes}
              extraStream={extraStream}
              localVideoRef={localVideoRef}
              Peer={Peer}
              isMaximized={isMaximized}
              canvasConfigs={canvasConfigs}
              selectedShape={selectedShape}
              sendDrawEvent={sendDrawEvent}
              undoDrawing={undoDrawing}
              isLandscape={isLandscape}
              videoContainerRef={videoContainerRef2}
              lockPoint={lockPoint}
              sharedTogglePlayPause={isLock ? togglePlayPause : undefined}
              sharedHandleSeek={isLock ? handleSeek : undefined}
            />
          </div>
        ) : (
          <VideoContainer
            sessionId={sessionId}
            index={1}
            drawingMode={drawingMode}
            canvasRef={canvasRef}
            isMaximized={isMaximized}
            videoRef={videoRef}
            clip={selectedClips[0]}
            isPlaying={isPlaying1}
            setIsPlaying={setIsPlaying1}
            isSingle={isSingle}
            fromUser={fromUser}
            toUser={toUser}
            isDrawing={isDrawing}
            stopDrawing={stopDrawing}
            savedPos={savedPos}
            startPos={startPos}
            currPos={currPos}
            strikes={strikes}
            extraStream={extraStream}
            localVideoRef={localVideoRef}
            Peer={Peer}
            canvasConfigs={canvasConfigs}
            selectedShape={selectedShape}
            sendDrawEvent={sendDrawEvent}
            undoDrawing={undoDrawing}
            isLandscape={isLandscape}
            videoContainerRef={videoContainerRef}
            lockPoint={lockPoint}
            videoRef2={null}
          />
        )}
        {!isMaximized && (
          <>
            <UserBoxMini
              id={fromUser._id}
              zIndex={20}
              bottom={60}
              onClick={handleUserClick}
              selected={false}
              videoRef={remoteVideoRef}
              stream={remoteStream}
              user={toUser}
              isStreamOff={isRemoteStreamOff}
              videoType="student"
              onHide={handleHideVideo}
              onRestore={handleRestoreVideo}
              isHidden={hiddenVideos.student}
            />
            <UserBoxMini
              id={toUser._id}
              zIndex={10}
              bottom={300}
              onClick={handleUserClick}
              selected={false}
              videoRef={localVideoRef}
              stream={localStream}
              user={fromUser}
              isStreamOff={isLocalStreamOff}
              muted={true}
              videoType="teacher"
              onHide={handleHideVideo}
              onRestore={handleRestoreVideo}
              isHidden={hiddenVideos.teacher}
            />
          </>
        )}

        {/* Text Input Modal */}
        {showTextInput && (
          <div
            style={{
              position: "fixed",
              top: textInputPosition.y,
              left: textInputPosition.x,
              zIndex: 10000,
              background: "white",
              padding: "8px 12px",
              borderRadius: "4px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              minWidth: "200px",
            }}
          >
            <input
              type="text"
              value={textInputValue}
              onChange={(e) => setTextInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && textInputValue.trim()) {
                  // Add text annotation
                  const canvasIndex = textInputPosition.canvasIndex;
                  textInputs[`canvas${canvasIndex}`].push({
                    text: textInputValue.trim(),
                    x: textInputPosition.canvasX,
                    y: textInputPosition.canvasY,
                    color: canvasConfigs.sender.strokeStyle,
                    fontSize: 18,
                  });
                  sendDrawEvent(canvasIndex);
                  setShowTextInput(false);
                  setTextInputValue("");
                } else if (e.key === "Escape") {
                  setShowTextInput(false);
                  setTextInputValue("");
                }
              }}
              placeholder="Enter text..."
              autoFocus
              style={{
                border: "1px solid #ddd",
                borderRadius: "4px",
                padding: "6px 8px",
                fontSize: "14px",
                outline: "none",
              }}
            />
            <div style={{ display: "flex", gap: "4px", justifyContent: "flex-end" }}>
              <button
                onClick={() => {
                  if (textInputValue.trim()) {
                    const canvasIndex = textInputPosition.canvasIndex;
                    textInputs[`canvas${canvasIndex}`].push({
                      text: textInputValue.trim(),
                      x: textInputPosition.canvasX,
                      y: textInputPosition.canvasY,
                      color: canvasConfigs.sender.strokeStyle,
                      fontSize: 18,
                    });
                    sendDrawEvent(canvasIndex);
                  }
                  setShowTextInput(false);
                  setTextInputValue("");
                }}
                style={{
                  padding: "4px 12px",
                  background: "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowTextInput(false);
                  setTextInputValue("");
                }}
                style={{
                  padding: "4px 12px",
                  background: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClipModeCall;