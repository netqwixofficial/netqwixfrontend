"use client";
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useLayoutEffect
} from "react";
import { EVENTS } from "../../../helpers/events";
import { SocketContext } from "../socket";
import { Popover } from "react-tiny-popover";
import _debounce from "lodash/debounce";
import { Tooltip } from "react-tippy";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import {
  MicOff,
  PauseCircle,
  Phone,
  PlayCircle,
  ExternalLink,
  Play,
  Pause,
  Aperture,
  FilePlus,
  X,
  Trash2,
  Crop,
  Video,
  VideoOff,
} from "react-feather";
import { AccountType, SHAPES } from "../../common/constants";
import { CanvasMenuBar } from "./canvas.menubar";
import { toast } from "react-toastify";
import { max, set } from "lodash";
import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";
import html2canvas from "html2canvas";
import CustomModal from "../../common/modal";
import CropImage from "./cropimage";
import jsPDF from "jspdf";
import { getS3SignPdfUrl } from "./video.api";
import axios from "axios";
import {
  createReport,
  cropImage,
  getReport,
  getS3SignUrl,
  getSaveSessionS3SignUrl,
  removeImage,
  screenShotTake,
} from "../videoupload/videoupload.api";
import ReportModal from "./reportModal";
import { Utils } from "../../../utils/utils";
import { awsS3Url } from "../../../utils/constant";
import ScreenShotDetails from "./screenshotDetails";
import { FaLock, FaUnlock } from "react-icons/fa";
import { useMediaQuery } from "../../hook/useMediaQuery";
import PermissionModal from "./PermissionModal";
import { getInitials } from "../../../utils/videoCall";
import Timer from "./Timer";
import { isMobile } from 'react-device-detect';
import OrientationModal from "../modalComponent/OrientationModal";
import {
  getUserMedia,
  getDisplayMedia,
  getUserFriendlyError,
  retryWithBackoff,
  getOptimalVideoConstraints,
  checkBrowserCompatibility,
  hasGetUserMedia,
  hasRTCPeerConnection
} from "../../utils/webrtcCompatibility";
import MobileDetect from 'mobile-detect';
import { isIOS } from 'react-device-detect';
import Script from 'next/script'
import LazyVideo from "./LazyVideo";
import { traineeClips } from "../../../containers/rightSidebar/fileSection.api";
import { fetchPeerConfig } from "../../../api";
import { bookingsState } from "../common/common.slice";
import { useAppSelector } from "../../store";
import './common.scss'
import { useVideoState } from "./hooks/useVideoState";
import { useSocketEvents } from "./hooks/useSocketEvents";
import { useScreenshotsAndReports } from "./hooks/useScreenshotsAndReports";
import { useVideoPlayback } from "./hooks/useVideoPlayback";
import { formatTime, calculateCanvasDimensions } from "./utils/videoUtils";
import { VideoCallControls } from "./components/VideoCallControls";
import { ClipsContainer } from "./components/ClipsContainer";
import CenterMessage from "../common/CenterMessage";
let storedLocalDrawPaths = { sender: [], receiver: [] };
let selectedShape = null;
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

// default setup;
let isDrawing = false;
let savedPos;
let startPos;
let currPos;
let strikes = [];
let extraStream;
let localVideoRef;
let Peer;
export const HandleVideoCall = ({
  id,
  accountType,
  fromUser,
  toUser,
  isClose,
  session_end_time,
  bIndex,
}) => {
  //   
  // const dispatch = useAppDispatch();
  const socket = useContext(SocketContext);

  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerRef = useRef(null);
  const selectedVideoRef1 = useRef(null);
  const selectedVideoRef2 = useRef(null);
  const progressBarRef = useRef(null);
  const progressBarRef2 = useRef(null);
  const globalProgressBarRef = useRef(0);
  const volumeInputRef = useRef(null);
  const volumeInputRef2 = useRef(null);
  const ffmpegRef = useRef(new FFmpeg());

  // Use video state hook
  const videoState = useVideoState({
    accountType,
    session_end_time,
    toUser,
    isTraineeJoined: false, // Timer now driven by backend lesson timer, not local flag
  });

  // Destructure state from hook
  const {
    selectedClips,
    isMuted,
    isFeedStopped,
    displayMsg,
    isRemoteVideoOff,
    isPinned,
    pinnedUser,
    videoController,
    isCanvasMenuNoteShow,
    micNote,
    clipSelectNote,
    countClipNoteOpen,
    permissionModal,
    isTooltipShow,
    modal,
    showThumbnailForFirstVideo,
    showThumbnailForTwoVideo,
    globalSliderValue,
    isOpen,
    isOpenConfirm,
    isOpenReport,
    isOpenCrop,
    screenShots,
    reportObj,
    isScreenShotModelOpen,
    isModelOpen,
    callEnd,
    width500,
    width768,
    width900,
    width1000,
    height,
    setSelectedClips,
    setIsMuted,
    setIsFeedStopped,
    setDisplayMsg,
    setRemoteVideoOff,
    setIsPinned,
    setPinnedUser,
    setVideoController,
    setIsCanvasMenuNoteShow,
    setMicNote,
    setClipSelectNote,
    setCountClipNoteOpen,
    setPermissionModal,
    setIsTooltipShow,
    setModal,
    setShowThumbnailForFirstVideo,
    setShowThumbnailForTwoVideo,
    setGlobalSliderValue,
    setIsOpen,
    setIsOpenConfirm,
    setIsOpenReport,
    setIsOpenCrop,
    setScreenShots,
    setReportObj,
    setIsScreenShotModelOpen,
    setIsModelOpen,
    setCallEnd,
    setInitialPinnedUser,
    resetInitialPinnedUser,
  } = videoState;

  // Additional state not in hook
  const [isTraineeJoined, setIsTraineeJoined] = useState(false);
  const [maxMin, setMaxMin] = useState(false);
  const [volume, setVolume] = useState(1);
  const [volume2, setVolume2] = useState(1);
  const [progressRange, setProgressRange] = useState(0);
  const [reportArr, setReportArr] = useState([]);
  const [selectImage, setSelectImage] = useState(0);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordedChunks, setRecordedChunks] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timeoutReached, setTimeoutReached] = useState(false);
  const [screenStream, setScreenStream] = useState(null);
  const [isCallEnded, setIsCallEnded] = useState(false);
  const [micStream, setMicStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [localStream, setLocalStream] = useState(null);

  // Authoritative lesson timer state (backend-driven)
  const [lessonTimerStatus, setLessonTimerStatus] = useState("waiting"); // "waiting" | "running" | "paused" | "ended"
  const [lessonTimer, setLessonTimer] = useState(null); // { startedAt, duration, remainingAtStart }
  const lessonTimerIntervalRef = useRef(null);
  const [lessonTimeDisplay, setLessonTimeDisplay] = useState("");
  const [trainerConnected, setTrainerConnected] = useState(true);
  const [traineeConnected, setTraineeConnected] = useState(false);
  const [lessonStatusBanner, setLessonStatusBanner] = useState("");
  const [showFiveMinuteWarning, setShowFiveMinuteWarning] = useState(false);
  const [showOneMinuteWarning, setShowOneMinuteWarning] = useState(false);
  const [hasShownFiveMinuteWarning, setHasShownFiveMinuteWarning] =
    useState(false);
  const [hasShownOneMinuteWarning, setHasShownOneMinuteWarning] =
    useState(false);

  const errorHandling = (err) => toast.error(err);
  const [sketchPickerColor, setSketchPickerColor] = useState({
    r: 241,
    g: 112,
    b: 19,
    a: 1,
  });
  const { startMeeting } = useAppSelector(bookingsState);

  // Initialize hooks
  // Note: Some hooks need to be initialized after certain state is set up
  // We'll integrate them as we refactor the component

  // ---------- Authoritative lesson timer helpers ----------

  const clearLessonTimerInterval = () => {
    if (lessonTimerIntervalRef.current) {
      clearInterval(lessonTimerIntervalRef.current);
      lessonTimerIntervalRef.current = null;
    }
  };

  const formatRemainingTime = (totalSeconds) => {
    const seconds = Math.max(0, Math.floor(totalSeconds || 0));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const pad = (num) => (num < 10 ? `0${num}` : `${num}`);

    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
    }
    return `${pad(minutes)}:${pad(secs)}`;
  };

  const startLessonCountdown = useCallback((payload) => {
    if (!payload) return;

    const { startedAt, duration, remainingSeconds, sessionId } = payload;
    if (!startedAt || !duration) return;

    // Use remainingSeconds from backend as the authoritative starting point
    const remainingAtStart =
      typeof remainingSeconds === "number" && remainingSeconds > 0
        ? remainingSeconds
        : duration;

    clearLessonTimerInterval();

    setLessonTimer({
      startedAt,
      duration,
      remainingAtStart,
      sessionId,
    });
    setLessonTimerStatus("running");

    // Reset warning flags whenever we start/restart the lesson timer
    setHasShownFiveMinuteWarning(false);
    setHasShownOneMinuteWarning(false);

    // Initial display update
    const now = Date.now();
    const elapsed = Math.floor((now - startedAt) / 1000);
    const remaining = Math.max(0, remainingAtStart - elapsed);
    setLessonTimeDisplay(formatRemainingTime(remaining));

    // Smooth local countdown driven by backend timestamps
    lessonTimerIntervalRef.current = setInterval(() => {
      const current = Date.now();
      const elapsedSeconds = Math.floor((current - startedAt) / 1000);
      const remainingSecondsLocal = Math.max(0, remainingAtStart - elapsedSeconds);
      setLessonTimeDisplay(formatRemainingTime(remainingSecondsLocal));

      // Show warnings at 5 minutes and 1 minute remaining (only once each)
      if (
        remainingSecondsLocal <= 5 * 60 &&
        remainingSecondsLocal > 4 * 60 &&
        !hasShownFiveMinuteWarning
      ) {
        setShowFiveMinuteWarning(true);
        setHasShownFiveMinuteWarning(true);
        setTimeout(() => {
          setShowFiveMinuteWarning(false);
        }, 10000); // auto-close after 10 seconds
      }

      if (
        remainingSecondsLocal <= 60 &&
        remainingSecondsLocal > 0 &&
        !hasShownOneMinuteWarning
      ) {
        setShowOneMinuteWarning(true);
        setHasShownOneMinuteWarning(true);
        setTimeout(() => {
          setShowOneMinuteWarning(false);
        }, 10000); // auto-close after 10 seconds
      }

      if (remainingSecondsLocal <= 0) {
        clearLessonTimerInterval();
        // Automatically end the session when timer reaches zero
        setLessonTimerStatus("ended");
        // Use existing cleanup logic to end the call/session
        if (!isCallEnded) {
          setIsCallEnded(true);
          cleanupFunction();
        }
      }
    }, 1000);
  }, [cleanupFunction, hasShownFiveMinuteWarning, hasShownOneMinuteWarning, isCallEnded]);

  // Keep a small banner in sync with timer + presence
  useEffect(() => {
    if (lessonTimerStatus === "waiting") {
      if (!trainerConnected || !traineeConnected) {
        setLessonStatusBanner(
          "Waiting for the other participant. Lesson will start when both are connected."
        );
      } else {
        setLessonStatusBanner("");
      }
      return;
    }

    if (lessonTimerStatus === "paused") {
      setLessonStatusBanner(
        accountType === AccountType.TRAINER
          ? "You disconnected earlier. Timer is paused until you rejoin."
          : "Trainer disconnected. Lesson timer is paused until they rejoin."
      );
      return;
    }

    if (lessonTimerStatus === "running") {
      if (accountType === AccountType.TRAINER && !traineeConnected) {
        setLessonStatusBanner(
          "Trainee disconnected. Lesson timer is still running."
        );
      } else if (accountType === AccountType.TRAINEE && !trainerConnected) {
        setLessonStatusBanner(
          "Trainer is reconnecting. Please wait; timer state is managed by the system."
        );
      } else {
        setLessonStatusBanner("Session in progress. Lesson timer is running.");
      }
      return;
    }

    if (lessonTimerStatus === "ended") {
      setLessonStatusBanner("Lesson time has ended.");
      return;
    }
  }, [lessonTimerStatus, trainerConnected, traineeConnected, accountType]);

  // Listen to backend timer + presence events
  useEffect(() => {
    if (!socket || !id) return;

    // Request current state on (re)connect
    socket.emit("LESSON_STATE_REQUEST", { sessionId: id });

    const handleStateSync = (state) => {
      if (!state || state.sessionId !== id) return;

      const {
        status,
        remainingSeconds,
        startedAt,
        duration,
        trainerConnected: trainerConn,
        traineeConnected: traineeConn,
      } = state;

      setTrainerConnected(!!trainerConn);
      setTraineeConnected(!!traineeConn);
      setLessonTimerStatus(status || "waiting");

      clearLessonTimerInterval();

      if (status === "running" && startedAt && duration) {
        startLessonCountdown({
          startedAt,
          duration,
          remainingSeconds,
          sessionId: id,
        });
      } else if (status === "paused") {
        const remaining = Math.max(0, Math.floor(remainingSeconds || 0));
        setLessonTimer({
          startedAt: null,
          duration: duration || remaining,
          remainingAtStart: remaining,
          sessionId: id,
        });
        setLessonTimeDisplay(formatRemainingTime(remaining));
      } else if (status === "ended") {
        setLessonTimeDisplay(formatRemainingTime(0));
      } else {
        // waiting
        setLessonTimeDisplay("");
      }
    };

    const handleTimerStarted = (data) => {
      if (!data || data.sessionId !== id) return;
      setLessonTimerStatus("running");
      startLessonCountdown({
        startedAt: data.startedAt,
        duration: data.duration,
        remainingSeconds: data.remainingSeconds,
        sessionId: data.sessionId,
      });
    };

    const handleTimerPaused = (data) => {
      if (!data || data.sessionId !== id) return;
      clearLessonTimerInterval();
      const remaining = Math.max(0, Math.floor(data.remainingSeconds || 0));
      setLessonTimerStatus("paused");
      setLessonTimer({
        startedAt: null,
        duration: remaining,
        remainingAtStart: remaining,
        sessionId: data.sessionId,
      });
      setLessonTimeDisplay(formatRemainingTime(remaining));
    };

    const handleTimerResumed = (data) => {
      if (!data || data.sessionId !== id) return;
      setLessonTimerStatus("running");
      startLessonCountdown({
        startedAt: data.startedAt,
        duration: data.duration,
        remainingSeconds: data.remainingSeconds,
        sessionId: data.sessionId,
      });
    };

    const handleTimerEnded = (data) => {
      if (!data || data.sessionId !== id) return;
      clearLessonTimerInterval();
      setLessonTimerStatus("ended");
      setLessonTimeDisplay(formatRemainingTime(0));
    };

    const handleParticipantStatusChanged = (data) => {
      if (!data || data.sessionId !== id) return;
      const { role, status } = data;
      const isConnected = status === "connected";

      if (role === "trainer") {
        setTrainerConnected(isConnected);
      } else if (role === "trainee") {
        setTraineeConnected(isConnected);
      }
    };

    socket.on("LESSON_STATE_SYNC", handleStateSync);
    socket.on("TIMER_STARTED", handleTimerStarted);
    socket.on("LESSON_TIME_PAUSED", handleTimerPaused);
    socket.on("LESSON_TIME_RESUMED", handleTimerResumed);
    socket.on("LESSON_TIME_ENDED", handleTimerEnded);
    socket.on("PARTICIPANT_STATUS_CHANGED", handleParticipantStatusChanged);

    return () => {
      clearLessonTimerInterval();
      socket.off("LESSON_STATE_SYNC", handleStateSync);
      socket.off("TIMER_STARTED", handleTimerStarted);
      socket.off("LESSON_TIME_PAUSED", handleTimerPaused);
      socket.off("LESSON_TIME_RESUMED", handleTimerResumed);
      socket.off("LESSON_TIME_ENDED", handleTimerEnded);
      socket.off("PARTICIPANT_STATUS_CHANGED", handleParticipantStatusChanged);
    };
  }, [socket, id, startLessonCountdown]);


  /**
   * In feature if crossOrigin="anonymous" is requre Future considerations.
   * If you plan to implement features that involve manipulating video data (e.g., capturing frames, applying filters), you might need to re-enable crossOrigin.
   * If you move your video hosting to a different domain in the future, you might need to reconsider CORS settings.
   */

  // const needsCrossOrigin = videoUrl.startsWith('https://different-domain.com');

  // setInitialPinnedUser and resetInitialPinnedUser are now provided by useVideoState hook

  // selects trainee clips on load
  async function selectTraineeClip (setter){
     
    try{
        if(startMeeting?.trainee_clip?.length > 0){
          setter(startMeeting.trainee_clip)
        }else{
          setter([])
        }
    }catch(err){
         
    }
}
useEffect(() =>{
  if(toUser.account_type === "Trainee" && isTraineeJoined){
    selectTraineeClip(setSelectedClips);
  }
},[isTraineeJoined])

  useEffect(() => {
    setInitialPinnedUser()
  }, [])

useEffect(() => {
  const canvas = document.getElementById('drawing-canvas');

    // Only apply the warning if the canvas element exists
  if (canvas) {
    const handleBeforeUnload = (event) => {
      event.preventDefault();
        event.returnValue = 'You are currently in a call. Are you sure you want to leave or reload? This will disconnect the call.';
      };

      // Attach the event listener for beforeunload
    window.addEventListener('beforeunload', handleBeforeUnload);

      // Cleanup the event listener when the component unmounts
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }
  }, []); // Empty dependency array to run only once when component mounts

  //  
  useLayoutEffect(() => {
    const updateOrientation = () => {
      let width = window.innerWidth;
      let height = window.innerHeight;
      if (width > height == false) {
        //  
        setModal(true)
      } else {
        //  
        setModal(false)
      }
    };

    const handleOrientationChange = () => {
      updateOrientation();
    };

    // Add event listener for orientation change
    window.addEventListener('resize', handleOrientationChange);

    // Call updateOrientation once initially
    updateOrientation();

    // Clean up the event listener when the component unmounts
    return () => {
      window.removeEventListener('resize', handleOrientationChange);
    };
  }, [isMobile]);

  // NOTE - handle Tab Close
  const handelTabClose = async () => {
    mediaRecorder?.stop();
    setRecording(false);
    if (socket) {
      socket.emit("chunksCompleted");
    }
  };

  const startRecording = async () => {
    setRecording(true);

    const data = {
      sessions: id,
      trainer: toUser?._id,
      trainee: fromUser?._id,
      user_id: fromUser?._id,
      trainee_name: fromUser?.fullname,
      trainer_name: toUser?.fullname,
    };

    if (socket) {
      socket.emit("videoUploadData", data);
    }

    const mixedAudioStream = await setupAudioMixing();

    const screenStr = await getDisplayMedia({
      video: true,
      preferCurrentTab: true,
    });
    setScreenStream(screenStr);

    const screenVideoTrack = screenStr.getVideoTracks()[0];

    const combinedStream = new MediaStream([
      screenVideoTrack,
      ...mixedAudioStream.getAudioTracks(),
    ]);

    const mediaRecorder = new MediaRecorder(combinedStream);

    let chunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data);
      }
    };
    setInterval(function () {
      // Check if the MediaRecorder is recording
      if (mediaRecorder.state === "recording") {
        // Request data if available
        mediaRecorder.requestData();

        const chunkBuffers = chunks
          .map((chunk) => {
            // Assuming chunk is already a Buffer or Uint8Array, no conversion needed
            if (chunk) {
              //  
              return chunk;
            } else {
              // Handle invalid chunk data here
              //  
              return null; // or handle differently as needed
            }
          })
          .filter(Boolean); // Remove null entries

        // Send only if there are valid chunkBuffers
        if (chunkBuffers.length > 0) {
          const chunkData = { data: chunkBuffers };
          if (socket) {
            socket.emit("chunk", chunkData);
          }
          // Handle the recorded data here (in chunks array)
          //  
        } else {
          //  
        }

        // Clear chunks array for next interval
        chunks = [];
      }
    }, 1000);

    mediaRecorder.onstop = () => {
      // const blob = new Blob(chunks, { type: "video/webm" });
      // const url = URL.createObjectURL(blob);
      // const a = document.createElement("a");
      // document.body.appendChild(a);
      // a.style = "display: none";
      // a.href = url;
      // a.download = `${Date.now()}.webm`;
      // a.click();
      // window.URL.revokeObjectURL(url);
      if (socket) {
        socket.emit("chunksCompleted");
      }
    };

    mediaRecorder.start();
    setMediaRecorder(mediaRecorder);
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setRecording(false);
    }
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
      setScreenStream(null);
    }
  };

  // NOTE - handle user offline
  const handleOffline = () => {
    stopRecording();
    if (socket) {
      socket.emit("chunksCompleted");
    }
  };

  // NOTE - Start call

  const handleStartCall = async () => {
    try {
      // Validate required props before proceeding
      if (!fromUser || !toUser || !fromUser._id || !toUser._id) {
        console.error('[HandleVideoCall] Cannot start call: missing user information', { fromUser, toUser });
        errorHandling("User information is missing. Please refresh the page and try again.");
        return;
      }

      // Check browser compatibility first
      const compatibility = checkBrowserCompatibility();
      if (!compatibility.supported) {
        const errorMsg = compatibility.errors.join(' ') || 'Your browser does not support video calls.';
        errorHandling(errorMsg);
        setPermissionModal(true);
        return;
      }

      // Show warnings if any
      if (compatibility.warnings.length > 0) {
        console.warn('Browser compatibility warnings:', compatibility.warnings);
      }

      // Request access to media devices with optimal constraints and retry logic
      const optimalConstraints = getOptimalVideoConstraints();
      const stream = await retryWithBackoff(
        () => getUserMedia(optimalConstraints),
        3,
        1000
      );

      // Update state and UI
      setPermissionModal(false);
      setLocalStream(stream);
      setDisplayMsg({
        showMsg: true,
        msg: `Waiting for ${toUser?.fullname || 'the other participant'} to join...`,
      });

      // Assign stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Create a new Peer instance
      // const peer = new Peer(fromUser._id, {
      //   config: {
      //     iceServers: [
      //       {
      //         username: "netqwixSTURN",
      //         credential: "testing@123",
      //         url: "turn:turn.netqwix.com",
      //       },
      //     ],
      //   },
      // });
      
      const peerConfig = startMeeting?.iceServers || {};
      const peer = new Peer(fromUser._id, {
        config: peerConfig
      });
      peerRef.current = peer;
      
      // Handle Peer events
      peer.on("open", (id) => {
        // Notify backend that this user joined the call for a specific session
        // so that timer / "both joined" logic can work reliably.
        if (socket) {
          socket.emit("ON_CALL_JOIN", {
            userInfo: { 
              from_user: fromUser._id, 
              to_user: toUser._id,
              // Include sessionId (booked_session._id) when available so
              // backend can track coachJoined/userJoined correctly.
              sessionId: meetingId || id || startMeeting?.id,
            },
          });
        } else {
          console.error('[HandleVideoCall] Socket is not available when peer opened');
          setDisplayMsg({
            showMsg: true,
            msg: 'Unable to connect to the server. Please refresh the page and try again.',
          });
        }
      });

      peer.on("error", (error) => {
        console.error("Peer error:", error);
      });

      peer.on("call", (call) => {
        call.answer(stream);
        call.on("stream", (remoteStream) => {
          setIsTraineeJoined(true);
          setDisplayMsg({ showMsg: false, msg: "" });
          setRemoteStream(remoteStream);

          if (remoteVideoRef?.current) {
            remoteVideoRef.current.srcObject = remoteStream;
            if (remoteVideoRef.current.paused) {
              remoteVideoRef.current
                .play()
                .catch((err) => {
                  if (err?.name !== "AbortError") {
                    console.warn(
                      "[HandleVideoCall] Failed to play remote video element",
                      err
                    );
                  }
                });
            }
          }
        });
      });

      //  
    } catch (err) {
      console.error("Media permission error:", err);
      setPermissionModal(true);
      const friendlyError = getUserFriendlyError(err);
      errorHandling(friendlyError);
    }
  };

  //NOTE -  Initiate outgoing connection
  let connectToPeer = (peer, peerId) => {
    //  

    // let conn = peer.connect(peerId);
    // conn.on('data', (data) => {
    //      
    // });
    // conn.on('open', () => {
    //     conn.send('hi!');
    // });

    // navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    // .then((stream) => {
    if (!(videoRef && videoRef?.current)) return;
    let call = peer.call(peerId, videoRef?.current?.srcObject);
    call.on("stream", (remoteStream) => {
      setDisplayMsg({ showMsg: false, msg: "" });
      setIsTraineeJoined(true);
      setRemoteStream(remoteStream);
      if (remoteVideoRef?.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        if (remoteVideoRef.current.paused) {
          remoteVideoRef.current
            .play()
            .catch((err) => {
              if (err?.name !== "AbortError") {
                console.warn(
                  "[HandleVideoCall] Failed to play remote video element (outgoing call)",
                  err
                );
              }
            });
        }
      }
      accountType === AccountType.TRAINEE ? setIsModelOpen(true) : null;
    });
    // })
    // .catch((err) => {
    //      
    // });
  };

  const initializeLocalStates = () => {
    strikes = [];
    localVideoRef = null;
    selectedShape = null;
  };

  const listenSocketEvents = () => {
    // Check if socket is available before setting up event listeners
    if (!socket) {
      console.error('[HandleVideoCall] Socket is not available');
      setDisplayMsg({
        showMsg: true,
        msg: 'Unable to connect to the server. Please refresh the page and try again.',
      });
      return;
    }

    // once user joins the call
    socket.on("ON_CALL_JOIN", ({ userInfo }) => {
      // console.log(
      //   ` end user join --- `,
      //   userInfo,
      //   peerRef.current,
      //   fromUser,
      //   toUser
      // );
      const { to_user, from_user } = userInfo;
      if (!(peerRef && peerRef.current)) return;
      connectToPeer(peerRef.current, from_user);
    });

    // Handle signaling events from the signaling server
    socket.on(EVENTS.VIDEO_CALL.ON_OFFER, (offer) => {
      //  
      peerRef.current?.signal(offer);
    });

    socket.on(EVENTS.VIDEO_CALL.ON_ANSWER, (answer) => {
      //  
      peerRef.current?.signal(answer);
    });

    socket.on(EVENTS.VIDEO_CALL.ON_ICE_CANDIDATE, (candidate) => {
      //  
      peerRef.current?.signal(candidate);
    });

    socket.on(EVENTS.ON_CLEAR_CANVAS, () => {
      clearCanvas();
    });

    // socket.on(EVENTS.VIDEO_CALL.MUTE_ME, ({ muteStatus }) => {
    //   if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
    //     remoteVideoRef.current.srcObject.getAudioTracks()[0].enabled =
    //       muteStatus;
    //   }
    // });

    socket.on(EVENTS.VIDEO_CALL.STOP_FEED, ({ feedStatus }) => {
      setRemoteVideoOff(feedStatus);

      // if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
      //   remoteVideoRef.current.srcObject.getVideoTracks()[0].enabled =
      //     feedStatus;
      //    
      //    
      //    
      //   setRemoteVideoOff(feedStatus);
      // } else {
      //   // remoteVideoRef.current.srcObject.getVideoTracks()[0].enabled = feedStatus;
      // }
    });

    socket.on(EVENTS.EMIT_DRAWING_CORDS, ({ strikes, canvasSize }) => {
      const canvas = canvasRef.current;
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
    });

    socket.on(EVENTS.ON_UNDO, ({ sender, receiver }) => {
      storedLocalDrawPaths.receiver = [];
      storedLocalDrawPaths.sender = [];
      storedLocalDrawPaths.sender = receiver;
      storedLocalDrawPaths.receiver = sender;
      undoDrawing(
        { coordinates: sender, theme: canvasConfigs.receiver },
        {
          coordinates: receiver,
          theme: {
            lineWidth: canvasConfigs.sender.lineWidth,
            strokeStyle: canvasConfigs.sender.strokeStyle,
          },
        },
        false
      );
    });

    socket.on(EVENTS.VIDEO_CALL.ON_CLOSE, () => {
      setDisplayMsg({
        showMsg: true,
        msg: `${toUser?.fullname} left the meeting, redirecting back to home screen in 5 seconds...`,
      });
      cleanupFunction();
    });

    // Handle backend-detected stale participant connections
    socket.on("PARTICIPANT_STALE", ({ socketId, timestamp }) => {
      if (isTraineeJoined) {
        setDisplayMsg({
          showMsg: true,
          msg: `${toUser?.fullname || "The other participant"} appears to have lost connection. Waiting for them to reconnect...`,
        });
      }
    });

    // Start heartbeat: emit every 10 seconds to prove we're alive
    const heartbeatInterval = setInterval(() => {
      if (socket && socket.connected) {
        socket.emit("HEARTBEAT");
      }
    }, 10000);

    // Store interval ID for cleanup
    socket._heartbeatInterval = heartbeatInterval;

    // Additional socket event listeners for video controls
    socket.on(EVENTS.ON_VIDEO_SELECT, ({ type, videos, mainScreen }) => {
      if (type === "clips") {
        // Handle both empty array (exit clip mode) and array with clips
        // Empty array means exit clip mode and return to default camera view
        const clipsArray = Array.isArray(videos) ? [...videos] : [];
        setSelectedClips(clipsArray);
        if (clipsArray?.length > 0) {
          resetInitialPinnedUser()
        } else {
          // Clear clip mode and return to default view
          setInitialPinnedUser()
        }
      } else {
        setPinnedUser(mainScreen);
        if (mainScreen) {
          setIsPinned(true);
        } else {
          setIsPinned(false);
        }
      }
    });

    socket.on(EVENTS.ON_VIDEO_PLAY_PAUSE, ({ isPlayingAll, number, isPlaying1, isPlaying2 }) => {
      const playPauseVideo = (videoRef, isPlaying) => {
        if (videoRef?.current) {
          isPlaying ? videoRef.current.play() : videoRef.current.pause();
        }
      };
    
      if (number === "all") {
        playPauseVideo(selectedVideoRef1, isPlayingAll);
        playPauseVideo(selectedVideoRef2, isPlayingAll);
      } else if (number === "one") {
        playPauseVideo(selectedVideoRef1, isPlaying1);
      } else if (number === "two") {
        playPauseVideo(selectedVideoRef2, isPlaying2);
      }
    
      setIsPlaying({ isPlayingAll, number, isPlaying1, isPlaying2 });
    });

    socket.on(EVENTS.ON_VIDEO_TIME, ({ clickedTime, number }) => {
      if (selectedVideoRef1?.current) {
        if (number === "one") selectedVideoRef1.current.currentTime = clickedTime;
        else selectedVideoRef2.current.currentTime = clickedTime;
      }
    });

    socket.on(EVENTS.ON_VIDEO_SHOW, ({ isClicked }) => {
      setMaxMin(isClicked);
    });
  };

  

  const adjustCanvasSize = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ratio = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * ratio;
      canvas.height = canvas.offsetHeight * ratio;
      const context = canvas.getContext('2d');
      context.scale(ratio, ratio);
    }
  };

  useEffect(() => {
    // adjustCanvasSize();
    const sidebar = document.getElementById("left-nav-wrapper")
    let getNavbarTabs = document.getElementById("get-navbar-tabs");
    if(sidebar){
      sidebar.style.display="none"
      getNavbarTabs.style.marginLeft = '25px';
        getNavbarTabs?.style?.setProperty('width', 'calc(100vw - 25px)');
    }
    return ()=>{
      if(sidebar){
        sidebar.style.display="block"
        getNavbarTabs.style.marginLeft ='105px';
        getNavbarTabs?.style?.setProperty('width','calc(100vw - 70px)');
      }
    }
    // window.addEventListener('resize', adjustCanvasSize);
    // return () => window.removeEventListener('resize', adjustCanvasSize);
  }, []);

  // NOTE - call end
  const cutCall = () => {
    //  
    stopRecording();
    cleanupFunction();
    if (isTraineeJoined && AccountType.TRAINER === accountType) {
      setIsOpenReport(true);
    } else {
      isClose();
    }
    // if (remoteVideoRef && remoteVideoRef.current) {
    //   socket.emit(EVENTS.VIDEO_CALL.ON_CLOSE, {
    //     userInfo: { from_user: fromUser._id, to_user: toUser._id },
    //   });
    // }
  };

  // // NOTE - stop streaming after getting call end
  // useEffect(() => {
  //   if (screenStream) {
  //     screenStream.getVideoTracks().forEach((track) => {
  //       track.stop();
  //     });
  //   }
  //   if (localStream) {
  //     localStream.getVideoTracks().forEach((track) => {
  //       track.stop();
  //     });
  //   }
  //   if (micStream) {
  //     micStream.getAudioTracks().forEach((track) => {
  //       track.stop();
  //     });
  //   }
  //   stopRecording();
  // }, [isCallEnded]);

  useEffect(() => {
    if (fromUser && toUser) {
      // Check if socket is available before proceeding
      if (!socket) {
        console.error('[HandleVideoCall] Socket is not available. Cannot start call.');
        setDisplayMsg({
          showMsg: true,
          msg: 'Unable to connect to the server. Please refresh the page and try again.',
        });
        return;
      }

      if (typeof navigator !== "undefined") {
        Peer = require("peerjs").default;
      }
      handleStartCall();
      listenSocketEvents();
      initializeLocalStates();
      window.addEventListener("offline", handleOffline);
      window.addEventListener("beforeunload", handelTabClose);

      return () => {
        window.removeEventListener("beforeunload", handelTabClose);
        window.removeEventListener("offline", handleOffline);
        // Clean up heartbeat interval if it exists
        if (socket && socket._heartbeatInterval) {
          clearInterval(socket._heartbeatInterval);
          socket._heartbeatInterval = null;
        }
        cutCall();
      };
    }
  }, [socket, fromUser, toUser]);

  // NOTE -  end user video stream
  useMemo(() => {
    if (
      remoteVideoRef.current &&
      remoteStream &&
      !remoteVideoRef.current.srcObject
    ) {
      remoteVideoRef.current.srcObject = remoteStream;
      accountType === AccountType.TRAINEE ? setIsModelOpen(true) : null;
    
    }

    return () => {
      cutCall();
    };
  }, [remoteStream]);

  // NOTE - if trainer is joined before trainee and trainer's video has been pause then emit the even to trainee
  useEffect(() => {
    if (isTraineeJoined && socket) {
      socket.emit(EVENTS.VIDEO_CALL.STOP_FEED, {
        userInfo: { from_user: fromUser._id, to_user: toUser._id },
        feedStatus: isFeedStopped,
      });
    }
  }, [isTraineeJoined])


  const setupAudioMixing = async () => {
    const audioContext = new AudioContext();

    // Get the local audio track from the localStream
    const localAudioStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    setMicStream(localAudioStream); // Assuming setMicStream is a function defined elsewhere
    const localAudioTrack = localAudioStream.getAudioTracks()[0];

    // Check if remoteStream exists and has audio tracks before accessing
    let remoteAudioTrack;
    if (remoteStream && remoteStream.getAudioTracks().length > 0) {
      remoteAudioTrack = remoteStream.getAudioTracks()[0];
    } else {
      // Handle the case where remoteStream is null or has no audio tracks
      // This might involve logging an error, setting a default track, or some other fallback
      // console.error("remoteStream is null or has no audio tracks.");
      // Optionally, return or continue with additional logic here
      // For example, you might want to only process local audio if remote audio is unavailable
    }

    // Create audio nodes for the local audio track. If remoteAudioTrack is undefined,
    // skip creating or connecting the remote source to avoid errors.
    const localSource = audioContext.createMediaStreamSource(
      new MediaStream([localAudioTrack])
    );
    const destination = audioContext.createMediaStreamDestination();
    localSource.connect(destination);

    if (remoteAudioTrack) {
      // Create and connect the audio node for the remote audio track only if it exists
      const remoteSource = audioContext.createMediaStreamSource(
        new MediaStream([remoteAudioTrack])
      );
      remoteSource.connect(destination);
    }

    // Return the mixed audio stream from the destination
    return destination.stream;
  };


  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
 
    const context = canvas?.getContext("2d");
    if (!context) return;

    const drawFrame = () => {
      if (canvas && context && video) {
        //   context.drawImage(video, 0, 0, canvas.width, canvas.height);
        context.fillStyle = "rgba(255, 255, 255, 0.5)";
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
      requestAnimationFrame(drawFrame);
    };

    const startDrawing = (event) => {
      event.preventDefault();
        isDrawing = true;
        if (!context) return;
        savedPos = context?.getImageData(
          0,
          0,
          document.getElementById("bookings")?.clientWidth,
          document.getElementById("bookings")?.clientHeight
        );
        if (strikes.length >= 10) strikes.shift(); // removing first position if strikes > 10;
        strikes.push(savedPos);
        // const mousePos = getMosuePositionOnCanvas(event);
        const mousePos = event.type.includes('touchstart') ? getTouchPos(event) : getMosuePositionOnCanvas(event);
        context.strokeStyle = canvasConfigs.sender.strokeStyle;
        context.lineWidth = canvasConfigs.sender.lineWidth;
        context.lineCap = "round";
        context.beginPath();
        context.moveTo(mousePos.x, mousePos.y);
        context.fill();
        state.mousedown = true;
        startPos = { x: mousePos.x, y: mousePos.y };
    };

    const findDistance = () => {
      let dis = Math.sqrt(
        Math.pow(currPos.x - startPos.x, 2) +
        Math.pow(currPos.y - startPos.y, 2)
      );
      return dis;
    };

    const drawShapes = () => {
      switch (selectedShape) {
        case SHAPES.LINE: {
          context.moveTo(startPos.x, startPos.y);
          context.lineTo(currPos.x, currPos.y);
          break;
        }
        case SHAPES.CIRCLE: {
          let distance = findDistance(startPos, currPos);
          context.arc(startPos.x, startPos.y, distance, 0, 2 * Math.PI, false);
          break;
        }
        case SHAPES.SQUARE: {
          let w = currPos.x - startPos.x;
          let h = currPos.y - startPos.y;
          context.rect(startPos.x, startPos.y, w, h);
          break;
        }
        case SHAPES.RECTANGLE: {
          let w = currPos.x - startPos.x;
          let h = currPos.y - startPos.y;
          context.rect(startPos.x, startPos.y, w, h);
          break;
        }
        case SHAPES.OVAL: {
          const transform = context.getTransform();
          let w = currPos.x - startPos.x;
          let h = currPos.y - startPos.y;
          context.fillStyle = "#FFFFFF";
          context.fillStyle = "rgba(0, 0, 0, 0)";
          const radiusX = w * transform.a;
          const radiusY = h * transform.d;
          if (radiusX > 0 && radiusY > 0) {
            context.ellipse(
              currPos.x,
              currPos.y,
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
          context.moveTo(startPos.x + (currPos.x - startPos.x) / 2, startPos.y);
          context.lineTo(startPos.x, currPos.y);
          context.lineTo(currPos.x, currPos.y);
          context.closePath();
          break;
        }
        case SHAPES.ARROW_RIGHT: {
          const arrowSize = 10;
          const direction = Math.atan2(
            currPos.y - startPos.y,
            currPos.x - startPos.x
          );
          // Calculate the coordinates of the arrowhead
          const arrowheadX = currPos.x + length * Math.cos(direction);
          const arrowheadY = currPos.y + length * Math.sin(direction);
          // Draw the line of the arrow
          context.moveTo(startPos.x, startPos.y);
          context.lineTo(currPos.x, currPos.y);
          // Draw the arrowhead
          context.moveTo(arrowheadX, arrowheadY);
          context.lineTo(
            currPos.x - arrowSize * Math.cos(direction - Math.PI / 6),
            currPos.y - arrowSize * Math.sin(direction - Math.PI / 6)
          );
          context.moveTo(currPos.x, currPos.y);
          context.lineTo(
            currPos.x - arrowSize * Math.cos(direction + Math.PI / 6),
            currPos.y - arrowSize * Math.sin(direction + Math.PI / 6)
          );
          context.stroke();
          break;
        }
        case SHAPES.TWO_SIDE_ARROW: {
          const x1 = startPos.x;
          const y1 = startPos.y;
          const x2 = currPos.x;
          const y2 = currPos.y;
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
      }
    };

    const draw = (event) => {
      event.preventDefault();
      if (!isDrawing || !context || !state.mousedown) return;
      // const mousePos = getMosuePositionOnCanvas(event);
      const mousePos = event.type.includes('touchmove') ? getTouchPos(event) : getMosuePositionOnCanvas(event);
      currPos = { x: mousePos?.x, y: mousePos.y };

      if (selectedShape !== SHAPES.FREE_HAND) {
        context.putImageData(savedPos, 0, 0);
        context.beginPath();
        drawShapes();
        context.stroke();
      } else {
        //  
        context.strokeStyle = canvasConfigs.sender.strokeStyle;
        context.lineWidth = canvasConfigs.sender.lineWidth;
        context.lineCap = "round";
        context.lineTo(mousePos.x, mousePos.y);
        context.stroke();
      }
    };

    const stopDrawing = (event) => {
      event.preventDefault();
      if (state.mousedown) {
        //  
        sendStopDrawingEvent();
        isDrawing = false;
        state.mousedown = false;
        sendDrawEvent();
      }
    };

    // allowing trainer to draw
    if (canvas && accountType === AccountType.TRAINER) {
      // for mobile
      canvas.addEventListener("touchstart", startDrawing, { passive: false });
      canvas.addEventListener("touchmove", draw, { passive: false });
      canvas.addEventListener("touchend", stopDrawing, { passive: false });
      // canvas.addEventListener("touchcancel", stopDrawing, { passive: false });
      // for web
      canvas.addEventListener("mousedown", startDrawing);
      canvas.addEventListener("mousemove", draw);
      canvas.addEventListener("mouseup", stopDrawing);
      // canvas.addEventListener("mouseout", stopDrawing);
    }

    return () => {
      video?.removeEventListener("play", drawFrame);
      cutCall();
    };
  }, [canvasRef]);

  const getMosuePositionOnCanvas = (event) => {
    const canvas = canvasRef.current;
    var rect = canvas.getBoundingClientRect();
    var x = event?.clientX - rect?.left;
    var y = event?.clientY - rect?.top;
    return {
      x: x || 0,
      y: y || 0,
    };

    // if (
    //   event.clientX ||
    //   event.clientY ||
    //   (event?.touches && event?.touches[0])
    // ) {
    //   const clientX = event?.clientX || event?.touches[0]?.clientX;
    //   const clientY = event?.clientY || event?.touches[0]?.clientY;
    //   const { offsetLeft, offsetTop } = event.target;
    //   const canvasX = clientX - (offsetLeft || (mediaQuery.matches ? 100 : 50));
    //   const canvasY = clientY - offsetTop;
    // }
  };

  const getTouchPos = (touchEvent) => {
    const canvas = canvasRef.current;
    var rect = canvas.getBoundingClientRect();
    var x = touchEvent?.changedTouches[0]?.clientX - rect?.left;
    var y = touchEvent?.changedTouches[0]?.clientY - rect?.top;
    return {
      x: x || 0,
      y: y || 0,
    };
  };


  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!context || !canvas) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
  };

  const sendDrawEvent = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { width, height } = canvas;

    canvas.toBlob((blob) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (!(event && event.target)) return;
        const binaryData = event.target.result;
        //  
        if (socket) {
          socket.emit(EVENTS.DRAW, {
            userInfo: { from_user: fromUser._id, to_user: toUser._id },
            // storedEvents,
            // canvasConfigs,
            strikes: binaryData,
            canvasSize: { width, height }
          });
        }
      };
      reader.readAsArrayBuffer(blob);
    });
  };

  const sendStopDrawingEvent = () => {
    if (remoteVideoRef && remoteVideoRef.current && socket) {
      socket.emit(EVENTS.STOP_DRAWING, {
        userInfo: { from_user: fromUser._id, to_user: toUser._id },
      });
    }
  };

  const sendClearCanvasEvent = () => {
    if (remoteVideoRef && remoteVideoRef.current && socket) {
      socket.emit(EVENTS.EMIT_CLEAR_CANVAS, {
        userInfo: { from_user: fromUser._id, to_user: toUser._id },
      });
    }
  };

  function handlePeerDisconnect() {
    stopRecording();
    if (!(peerRef && peerRef.current)) return;
    //NOTE -  manually close the peer connections
    for (let conns in peerRef.current.connections) {
      peerRef.current.connections[conns].forEach((conn, index, array) => {
        // console.log(
        //   `closing ${conn.connectionId} peerConnection (${index + 1}/${array.length
        //   })`,
        //   conn.peerConnection
        // );
        conn.peerConnection.close();

        //NOTE - close it using peerjs methods
        if (conn.close) conn.close();
      });
    }
  }

  const cleanupFunction = () => {
    handlePeerDisconnect();
    setIsCallEnded(true);

    if (localStream) {
      localStream.getAudioTracks().forEach(function (track) {
        track.stop();
      });
      localStream.getVideoTracks().forEach((track) => {
        track.stop();
      });
      setLocalStream(null);
    }
    if (screenStream) {
      screenStream.getAudioTracks().forEach(function (track) {
        track.stop();
      });
      screenStream.getVideoTracks().forEach((track) => {
        track.stop();
      });
      setScreenStream(null);
    }

    if (remoteStream) {
      remoteStream.getAudioTracks().forEach(function (track) {
        track.stop();
      });
      setRemoteStream(null);
    }
    if (micStream) {
      micStream.getAudioTracks().forEach((track) => {
        track.stop();
      });
    }
    let videorefSrc = videoRef.current || localVideoRef;
    if (videoRef && videorefSrc && videorefSrc.srcObject) {
      videorefSrc.srcObject.getTracks().forEach((t) => {
        t.stop();
      });

      videorefSrc.srcObject.getVideoTracks().forEach((t) => {
        t.stop();
      });
    }

    let videorefSrcRemote = remoteVideoRef.current;
    if (remoteVideoRef && videorefSrcRemote && videorefSrcRemote.srcObject) {
      videorefSrcRemote.srcObject.getTracks().forEach((t) => {
        t.stop();
      });
      videorefSrcRemote.srcObject.getVideoTracks().forEach((t) => {
        t.stop();
      });
    }

    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }

    clearCanvas();
  };

  const sendEmitUndoEvent = useCallback(_debounce(sendDrawEvent, 500), []);

  const undoDrawing = async (
    senderConfig,
    extraCoordinateConfig,
    removeLastCoordinate = true
  ) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!context || !canvas) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (removeLastCoordinate) storedLocalDrawPaths.sender.splice(-1, 1);
    // draw all the paths in the paths array
    await senderConfig.coordinates.forEach((path) => {
      context.beginPath();
      context.strokeStyle = senderConfig.theme.strokeStyle;
      context.lineWidth = senderConfig.theme.lineWidth;
      context.lineCap = "round";
      if (path && Array.isArray(path)) {
        // context.
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

      // context.beginPath();
      if (path && Array.isArray(path)) {
        // context.
        context.moveTo(path[0][0], path[0][1]);
        for (let i = 0; i < path.length; i++) {
          context.lineTo(path[i][0], path[i][1]);
        }
        context.stroke();
      }
    });

    if (strikes.length <= 0) return;
    context.putImageData(strikes[strikes.length - 1], 0, 0);
    strikes.pop();

    // sending event to end user
    if (removeLastCoordinate) {
      // socket.emit(EVENTS.EMIT_UNDO, {
      //     sender: storedLocalDrawPaths.sender,
      //     receiver: extraCoordinateConfig.coordinates,
      //     userInfo: { from_user: fromUser._id, to_user: toUser._id },
      // });
      sendEmitUndoEvent();
    }
  };

  const getReportData = async () => {
    var res = await getReport({
      sessions: id,
      trainer: fromUser?._id,
      trainee: toUser?._id,
    });
    //  
    setScreenShots(res?.data?.reportData);
    setReportObj({ title: res?.data?.title, topic: res?.data?.description });
  };

  const showReportData = async () => {
    // getReportData()
    setIsOpenReport(true);
  };

  function captureVideo(canvasEle, videoEle) {
    let canvas = document.getElementById(canvasEle); // declare a canvas element in your html
    let ctx = canvas.getContext("2d");
    let w, h;
    const v = document.getElementById(videoEle);
    try {
      w = v.videoWidth;
      h = v.videoHeight;
      canvas.width = w;
      canvas.height = h;
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(v, 0, 0, w, h);
      const a = canvas.toDataURL();
      v.style.backgroundImage = `url(${a})`;
      v.style.backgroundSize = "cover";
      ctx.clearRect(0, 0, w, h); // clean the canvas
      return true;
    } catch (e) {
      //  
    }
  }

  const takeScreenshot = () => {
    setIsTooltipShow(false);
    setIsScreenShotModelOpen(false);
    // if (selectedClips?.length) {
    //   if (selectedClips.length === 1) captureVideo("video-canvas-1", "selected-video-1");
    //   else if (selectedClips.length === 2) {
    //     captureVideo("video-canvas-1", "selected-video-1");
    //     captureVideo("video-canvas-2", "selected-video-2");
    //   }
    // }

    const targetElement = document.body;

    const creationBarItem = document.querySelector(".creationBarItem");
    const callActionButtons = document.querySelector(".call-action-buttons");
    const mainNav = document.querySelector(".main-nav");
    const Pause = document.querySelector(".Pause");
    const Pause2 = document.querySelector(".Pause2");
    const progress1 = document.querySelector(".progress1");
    const progress2 = document.querySelector(".progress2");

    const userVideo1 = document.getElementById("user-video-1");
    const userVideo2 = document.getElementById("user-video-2");
    const ChevronLeft = document.getElementById("ChevronLeft");
    const ChevronRight = document.getElementById("ChevronRight");
    const Timer = document.getElementById("sessionEndTime");
    const ssTooltip = document.querySelector(".custom-tooltip-hh");
    //  
    if (ssTooltip) {
      ssTooltip.style.transition = "opacity 1s";
      ssTooltip.style.visibility = 'hidden';
      ssTooltip.style.display = 'none';
      ssTooltip.style.opacity = "0";
      ssTooltip.style.zIndex = '-1';
    }

    //NOTE - Hide elements with a smooth transition
    if (Timer) {
      Timer.style.transition = "opacity 1s";
      Timer.style.opacity = "0";
    }
    if (ChevronLeft) {
      ChevronLeft.style.transition = "opacity 1s";
      ChevronLeft.style.opacity = "0";
      ChevronLeft.style.background = "#fff";
    }
    if (ChevronRight) {
      ChevronRight.style.transition = "opacity 1s";
      ChevronRight.style.opacity = "0";
      ChevronRight.style.background = "#fff";
    }

    if (Pause) {
      Pause.style.transition = "opacity 1s";
      Pause.style.opacity = "0";
    }
    if (progress1) {
      progress1.style.transition = "opacity 1s";
      progress1.style.opacity = "0";
    }
    if (Pause2) {
      Pause2.style.transition = "opacity 1s";
      Pause2.style.opacity = "0";
    }
    if (progress2) {
      progress2.style.transition = "opacity 1s";
      progress2.style.opacity = "0";
    }
    if (userVideo1 && selectedClips?.length) {
      userVideo1.style.transition = "opacity 1s";
      userVideo1.style.opacity = "0";
    }
    if (userVideo2 && selectedClips?.length) {
      userVideo2.style.transition = "opacity 1s";
      userVideo2.style.opacity = "0";
    }
    if (creationBarItem) {
      creationBarItem.style.transition = "opacity 1s"; // Adjust the duration based on your needs
      creationBarItem.style.opacity = "0";
    }

    if (callActionButtons) {
      callActionButtons.style.transition = "opacity 1s"; // Adjust the duration based on your needs
      callActionButtons.style.opacity = "0";
    }
    if (mainNav) {
      mainNav.style.transition = "opacity 1s"; // Set duration to 0s
      mainNav.style.opacity = "0";
    }

    // if(Pause){
    //   Pause.style.transition = 'opacity 1s'
    //   Pause.style.opacity = '0';
    // }
    // if(progress1){
    //   progress1.style.transition = 'opacity 1s'
    //   progress1.style.opacity = '0';
    // }
    // if(Pause2){
    //   Pause2.style.transition = 'opacity 1s'
    //   Pause2.style.opacity = '0';
    // }
    // if(progress2){
    //   progress2.style.transition = 'opacity 1s'
    //   progress2.style.opacity = '0';
    // }


  
    html2canvas(targetElement, { type: "png",
      allowTaint:true,
      useCORS:true
     }).then(async (canvas) => {
      // document.body.appendChild(canvas);
      //  
 
      const dataUrl = canvas.toDataURL("image/png");
      //  
      // screenShots.push({
      //   title: "",
      //   description: "",
      //   imageUrl: dataUrl
      // })
      // setScreenShots([...screenShots])
      setIsTooltipShow(true);
      if (ssTooltip) {
        ssTooltip.style.transition = "opacity 1s";
        ssTooltip.style.visibility = 'visible';
        ssTooltip.style.display = 'inline';
        ssTooltip.style.opacity = "1";
        ssTooltip.style.zIndex = '999';
      }
      if (creationBarItem) {
        creationBarItem.style.transition = "opacity 1s";
        creationBarItem.style.opacity = "1";
      }

      if (callActionButtons) {
        callActionButtons.style.transition = "opacity 1s";
        callActionButtons.style.opacity = "1";
      }
      if (mainNav) {
        mainNav.style.transition = "opacity 1s"; // Adjust the duration based on your needs
        mainNav.style.opacity = "1";
      }
      if (Pause) {
        Pause.style.transition = "opacity 1s";
        Pause.style.opacity = "1";
      }
      if (progress1) {
        progress1.style.transition = "opacity 1s";
        progress1.style.opacity = "1";
      }
      if (Pause2) {
        Pause2.style.transition = "opacity 1s";
        Pause2.style.opacity = "1";
      }
      if (progress2) {
        progress2.style.transition = "opacity 1s";
        progress2.style.opacity = "1";
      }
      if (userVideo1 && selectedClips?.length) {
        userVideo1.style.transition = "opacity 1s";
        userVideo1.style.opacity = "1";
      }
      if (userVideo2 && selectedClips?.length) {
        userVideo2.style.transition = "opacity 1s";
        userVideo2.style.opacity = "1";
      }

      if (ChevronLeft) {
        ChevronLeft.style.transition = "opacity 1s";
        ChevronLeft.style.opacity = "1";
        ChevronLeft.style.background = "#000080";
      }
      if (ChevronRight) {
        ChevronRight.style.transition = "opacity 1s";
        ChevronRight.style.opacity = "1";
        ChevronRight.style.background = "#000080";
      }
      if (Timer) {
        Timer.style.transition = "opacity 1s";
        Timer.style.opacity = "1";
      }



      var res = await screenShotTake({
        sessions: id,
        trainer: fromUser?._id,
        trainee: toUser?._id,
      });

      const response = await fetch(dataUrl);
      const blob = await response.blob();

      // Handling Error if SS is not generate image

      if (!blob) {
        return errorHandling("Unable to take Screen Shot");
      }

      if (res?.data?.url) {
        // var result = await getReport({
        //   sessions: id,
        //   trainer: fromUser?._id,
        //   trainee: toUser?._id,
        // });
        // setScreenShots(result?.data?.reportData);
        setIsScreenShotModelOpen(true);
        pushProfilePhotoToS3(res?.data?.url, blob, afterSucessUploadImageOnS3);
      }

      setTimeout(() => {
        // Success message after the screenshot is successfully taken and processed
        toast.success("The screenshot taken successfully.", {
          type: "success",
        });
      }, 2000);

      // const link = document.createElement('a');
      // link.href = dataUrl;
      // link.download = 'screenshot.png';
      // document.body.appendChild(link);
      // link.click();
      // document.body.removeChild(link);
    });
  };




  async function afterSucessUploadImageOnS3() {
    var result = await getReport({
      sessions: id,
      trainer: fromUser?._id,
      trainee: toUser?._id,
    });
    setScreenShots(result?.data?.reportData);
  }

  async function pushProfilePhotoToS3(presignedUrl, uploadPhoto, cb) {
      const myHeaders = new Headers({ "Content-Type": "image/*" });
    await axios.put(presignedUrl, uploadPhoto, {
      headers: myHeaders,
    });

    if (cb) cb();

    const v = document.getElementById("selected-video-1");
    if (v) v.style.backgroundImage = "";
    const v2 = document.getElementById("selected-video-2");
    if (v2) v2.style.backgroundImage = "";
    return true;
  }

  const mediaQuery = window.matchMedia(
    "(min-width: 768px) and (min-width: 1024px)"
  );


  //SECTION - selected Clips and swapping the videos
  //NOTE -  listening both selected clips and swapped videos with single event by type
  // Moved to listenSocketEvents function

  //NOTE - separate funtion for emit seelcted clip videos  and using same even for swapping the videos
  const emitVideoSelectEvent = (type, videos, mainScreen) => {
    if (socket) {
      socket.emit(EVENTS.ON_VIDEO_SELECT, {
        userInfo: { from_user: fromUser._id, to_user: toUser._id },
        type,
        videos,
        mainScreen,
      });
    }
  };

  //NOTE - emit event after selecting the clips
  useEffect(() => {
    emitVideoSelectEvent("clips", selectedClips, pinnedUser);
  }, [selectedClips?.length]);


  socket.on(EVENTS.ON_VIDEO_PLAY_PAUSE, ({ isPlayingAll, number, isPlaying1, isPlaying2 }) => {

    const playPauseVideo = (videoRef, isPlaying) => {
      if (videoRef?.current) {
        isPlaying ? videoRef.current.play() : videoRef.current.pause();
      }
    };
  
    if (number === "all") {
      playPauseVideo(selectedVideoRef1, isPlayingAll);
      playPauseVideo(selectedVideoRef2, isPlayingAll);
    } else if (number === "one") {
      playPauseVideo(selectedVideoRef1, isPlaying1);
    } else if (number === "two") {
      playPauseVideo(selectedVideoRef2, isPlaying2);
    }
  
    setIsPlaying({ isPlayingAll, number, isPlaying1, isPlaying2 });
  });
  


  //NOTE -  Video Time Update listen
  socket.on(EVENTS.ON_VIDEO_TIME, ({ clickedTime, number }) => {
    if (selectedVideoRef1?.current) {
      if (number === "one") selectedVideoRef1.current.currentTime = clickedTime;
      else selectedVideoRef2.current.currentTime = clickedTime;
    }
  });

  //NOTE -  Video Time Update emit
const emitVideoTimeEvent = (clickedTime, number) => {

  //   if (isPlaying.isPlaying1) {
  //   setIsPlaying(prev => ({ ...prev, isPlaying1: false }));
  // }
  //   if (isPlaying.isPlaying2) {
  //   setIsPlaying(prev => ({ ...prev, isPlaying2: false }));
  // }
  // if (isPlaying.isPlayingAll) {
  //   setIsPlaying(prev => ({ ...prev, isPlayingAll: false }));
  // }

  socket?.emit(EVENTS.ON_VIDEO_TIME, {
    userInfo: { from_user: fromUser?._id, to_user: toUser?._id },
    clickedTime,
    number,
  });
};

  // Moved to listenSocketEvents function

  const globalProgressBarToggler = (e) => {
    setVideoController(!videoController);
  
    setIsPlaying({
      isPlayingAll: false,
      number: "",
      isPlaying1: false,
      isPlaying2: false,
    })
  
  };

  const handleGlobalProgressBarChange = (e) => {
    const { value } = e.target;
    
    // Calculate the maximum duration across both videos to set a global control limit
    const maxTime = Math.max(
        selectedVideoRef1.current?.duration || 0,
        selectedVideoRef2.current?.duration || 0
    );

    // Check if both videos have ended
    const bothVideosEnded =
        selectedVideoRef1.current?.currentTime === selectedVideoRef1.current?.duration &&
        selectedVideoRef2.current?.currentTime === selectedVideoRef2.current?.duration;

    // Prevent re-triggering playback if both videos have ended
    if (bothVideosEnded) {
        // Pause both videos if they reached the end
        selectedVideoRef1.current.pause();
        selectedVideoRef2.current.pause();
        
        // Reset the isPlaying state to indicate videos are not playing
        setIsPlaying({
          isPlayingAll: false,
          number: "",
          isPlaying1: false,
          isPlaying2: false,
        })
        setVideoTime({
          currentTime1: "00:00",
          currentTime2: "00:00",
          remainingTime1: "00:00",
          remainingTime2: "00:00",
        })
        return; // Exit the function to avoid unintentional replay
    }

    // Set the current time of each video to the slider value
    if (selectedVideoRef1.current) {
        selectedVideoRef1.current.currentTime = value;
        emitVideoTimeEvent(value, "one");
    }
    
    if (selectedVideoRef2.current) {
        selectedVideoRef2.current.currentTime = value;
        emitVideoTimeEvent(value, "two");
    }

    // Reset play state if the control value is zero
    if (!value) {
        setIsPlaying({ ...isPlaying, isPlayingAll: false });
    }
};

const togglePlay = (num) => {
   
  if (num === 'one' && showThumbnailForFirstVideo) {
      setShowThumbnailForFirstVideo(false);
  }

  if (num === 'two' && showThumbnailForTwoVideo) {
      setShowThumbnailForTwoVideo(false);
  }

  if (num === 'all') {
      setShowThumbnailForFirstVideo(false);
      setShowThumbnailForTwoVideo(false);
  }

  if (selectedVideoRef1.current && selectedVideoRef2.current) {
      if (
          selectedVideoRef1.current.currentTime === selectedVideoRef1.current.duration &&
          selectedVideoRef2.current.currentTime === selectedVideoRef2.current.duration
      ) {
          selectedVideoRef1.current.currentTime = 0;
          selectedVideoRef2.current.currentTime = 0;
          emitVideoTimeEvent(0, "one");
          emitVideoTimeEvent(0, "two");
      }
  }

  const updatedPlayingState = { ...isPlaying };
  const toggleAll = num === "all";

  if (toggleAll) {
      updatedPlayingState.isPlayingAll = !isPlaying.isPlayingAll;

      if (updatedPlayingState.isPlayingAll) {
          selectedVideoRef1.current?.play();
          selectedVideoRef2.current?.play();
      } else {
          selectedVideoRef1.current?.pause();
          selectedVideoRef2.current?.pause();
      }
  } else {
      const videoRef = num === "one" ? selectedVideoRef1 : selectedVideoRef2;
      const isPlayingKey = num === "one" ? 'isPlaying1' : 'isPlaying2';
      const isPlayingValue = updatedPlayingState[isPlayingKey];

      if (isPlayingValue) {
          videoRef.current?.pause();
      } else {
          videoRef.current?.play();
      }
      updatedPlayingState[isPlayingKey] = !isPlayingValue;
    }
    updatedPlayingState.number = num;

  // Emit using the updated state directly
  console.log('Emitting play/pause event:', {
      userInfo: { from_user: fromUser?._id, to_user: toUser?._id },
      ...updatedPlayingState,
  });
  socket?.emit(EVENTS?.ON_VIDEO_PLAY_PAUSE, {
      userInfo: { from_user: fromUser?._id, to_user: toUser?._id },
      ...updatedPlayingState,
  });

  // Update the state locally after emitting
  setIsPlaying(updatedPlayingState);
};


  //  
  const handleTimeUpdate = (videoRef, progressBarRef, number) => {
    
    if (!videoRef.current) return; // Ensure videoRef is valid
  
    // Update progress bar value
    if (progressBarRef?.current) {
      progressBarRef.current.value = videoRef.current.currentTime || 0;
    }
  
    // Check if video has ended
    if (videoRef.current.duration === videoRef.current.currentTime) {
      videoRef.current.currentTime = 0;    
      if(videoController){
        const updatedPlayingState = { ...isPlaying };
        const isPlayingValue = updatedPlayingState.isPlayingAll;
        updatedPlayingState.isPlayingAll = !isPlayingValue;
        setIsPlaying(updatedPlayingState); 
      }else{
        const num =number === 1 ? "one" : "two";
        const isPlayingKey = num === "one" ? 'isPlaying1' : 'isPlaying2';
        const updatedPlayingState = { ...isPlaying };
        const isPlayingValue = updatedPlayingState[isPlayingKey];
        updatedPlayingState[isPlayingKey] = !isPlayingValue;
        setIsPlaying(updatedPlayingState); 
      }

     
    }
  
    // Calculate remaining time
    const remainingTime = videoRef.current.duration - videoRef.current.currentTime;
  
    // Update video time state
    setVideoTime((prevVideoTime) => ({
      ...prevVideoTime,
      [`currentTime${number}`]: formatTime(videoRef.current.currentTime),
      [`remainingTime${number}`]: formatTime(remainingTime),
    }));
  };

  // Helper function to format time as MM:SS
  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };
  

  // Usage for first video
  const handleTimeUpdate1 = () => handleTimeUpdate(selectedVideoRef1, progressBarRef, 1);

  // Usage for second video
  const handleTimeUpdate2 = () => handleTimeUpdate(selectedVideoRef2, progressBarRef2, 2);

  const handleProgressBarClick = (e, number) => {
    var clickedTime;
    if (number === "one") {
      clickedTime =
        (e?.nativeEvent?.offsetX / progressBarRef?.current?.offsetWidth) *
        progressBarRef?.current.getAttribute("max");
      selectedVideoRef1.current.currentTime = clickedTime;
    } else {
      clickedTime =
        (e?.nativeEvent?.offsetX / progressBarRef2?.current?.offsetWidth) *
        progressBarRef2?.current.getAttribute("max");
      selectedVideoRef2.current.currentTime = clickedTime;
    }
    emitVideoTimeEvent(clickedTime, number)
  };

  const handleProgressBarChange = (e, number) => {
    const clickedTime = e.target.value;
    const videoRef = number === "one" ? selectedVideoRef1 : selectedVideoRef2;
    if (videoRef.current) {
        videoRef.current.currentTime = clickedTime;
        
        socket?.emit(EVENTS?.ON_VIDEO_TIME, {
            userInfo: { from_user: fromUser?._id, to_user: toUser?._id },
            clickedTime,
            number,
        });
  }

  setGlobalSliderValue(() =>{
   return Math.max(
      selectedVideoRef1.current?.currentTime || 0,
      selectedVideoRef2.current?.currentTime || 0
    )
  })
};
  const handleVolumeChange = () => {
    // Update the video volume based on the input value (0 to 1)
    const newVolume = parseFloat(volumeInputRef.current.value);
    selectedVideoRef1.current.volume = newVolume;
    setVolume(newVolume); // Update state
  };

  const handleVolumeChange2 = () => {
    // Update the video volume based on the input value (0 to 1)
    const newVolume = parseFloat(volumeInputRef2.current.value);
    selectedVideoRef2.current.volume = newVolume;
    setVolume2(newVolume); // Update state
  };

  useEffect(() => {
    setScreenShot();
  }, [screenShots?.length]);

  useEffect(() => {
      const navbarContainer = document.getElementById('get-navbar-tabs');
      if (navbarContainer) {
        navbarContainer.classList.add('temp_nav')
      }

      return ()=>{
        const navbarContainer = document.getElementById('get-navbar-tabs');
        if (navbarContainer) {
        navbarContainer.classList.remove('temp_nav')
        }
      }
  }, []);

  const setScreenShot = async () => {
    var newReportImages = [];

    for (let index = 0; index < screenShots?.length; index++) {
      const element = screenShots[index];
      try {
        const response = await fetch(`${awsS3Url}${element?.imageUrl}`);
        const blob = await response.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result.split(",")[1];
          newReportImages[index] = {
            ...element,
            imageUrl: `data:image/jpeg;base64,${base64data}`,
          };
        };
        reader.readAsDataURL(blob);
      } catch (error) {
        // console.error("Error fetching or converting image:", error);
      }
    }

    setReportArr([...newReportImages]);
  };

  var pdf = new jsPDF();

  const generatePDF = async () => {
    const content = document.getElementById("report-pdf");
    content.style.removeProperty("display");

    html2canvas(content, { type: "png" }).then(async (canvas) => {
      const imgData = canvas.toDataURL("image/png");

      // Calculate the width of the page
      var pageWidth = pdf.internal.pageSize.width;

      // Calculate the aspect ratio of the canvas
      var aspectRatio = canvas.width / canvas.height;

      // Calculate the height to maintain the aspect ratio
      var imgHeight = pageWidth / aspectRatio;

      // Add the canvas as an image to the PDF
      pdf.addImage(imgData, "PNG", 0, 0, pageWidth, imgHeight);
      // pdf.save('yourDocument.pdf');

      // Get the data URL of the PDF
      const generatedPdfDataUrl = pdf.output("dataurlstring");

      // Convert data URL to Blob
      const byteCharacters = atob(generatedPdfDataUrl.split(",")[1]);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const pdfBlob = new Blob([new Uint8Array(byteNumbers)], {
        type: "application/pdf",
      });

      // Create a File from the Blob
      const pdfFile = new File([pdfBlob], "generated_pdf.pdf", {
        type: "application/pdf",
      });

      var link = await createUploadLink();
      if (link) pushProfilePDFToS3(link, pdfFile);

      content.style.display = "none";

      var res = await createReport({
        sessions: id,
        trainer: fromUser?._id,
        trainee: toUser?._id,
        title: reportObj?.title,
        topic: reportObj?.topic,
        reportData: screenShots,
      });
      setIsOpenReport(false);
    });
  };

  async function pushProfilePDFToS3(presignedUrl, uploadPdf) {
    const myHeaders = new Headers({ "Content-Type": "application/pdf" });
    axios
      .put(presignedUrl, uploadPdf, {
        headers: myHeaders,
        onUploadProgress: (progressEvent) => {
          const { loaded, total } = progressEvent;
          const percentCompleted = (loaded / total) * 100;
          //  
        },
      })
      .then((response) => {
        //  
      })
      .catch((error) => {
        // console.error("Error:", error);
      });
  }

  const createUploadLink = async () => {
    var payload = { session_id: id };
    const data = await getS3SignPdfUrl(payload);
    if (data?.url) return data?.url;
    else return "";
  };

  const handleRemoveImage = async (filename) => {
    var res = await removeImage({
      sessions: id,
      trainer: fromUser?._id,
      trainee: toUser?._id,
      filename: filename,
    });
    getReportData();
  };

  const handleCropImage = async (filename, blob) => {
    var res = await cropImage({
      sessions: id,
      trainer: fromUser?._id,
      trainee: toUser?._id,
      oldFile: filename,
    });
    if (res?.data?.url) await pushProfilePhotoToS3(res?.data?.url, blob);
    getReportData();
    setIsOpenCrop(false);
  };


  const renderCallActionButtons = () => {
    //  
    return (
      <div className="call-action-buttons z-50 my-3 " >
        <Tooltip
          title={isMuted ? "Unmute" : "Mute"}
          position="bottom"
          trigger="mouseenter"
        >
          <div
            className={`icon-btn ${isMuted ? "btn-danger" : "btn-light"} ${mediaQuery.matches ? "btn-xl" : "btn-sm"
              } button-effect mic`}
            style={{ height: '4vw', width: '4vw' }}
            onClick={() => {
              // if (remoteVideoRef && remoteVideoRef.current) {
              //   socket.emit(EVENTS.VIDEO_CALL.MUTE_ME, {
              //     userInfo: { from_user: fromUser._id, to_user: toUser._id },
              //     isClicked: !isMuted,
              //   });
              //   setIsMuted(!isMuted);
              // }

              if (localStream) {
                const audioTracks = localStream.getAudioTracks();
                if (audioTracks.length > 0) {
                  audioTracks[0].enabled = !audioTracks[0].enabled;
                  setIsMuted(!audioTracks[0].enabled);
                }
              }
              if (micStream) {
                const audioTracks = micStream.getAudioTracks();
                if (audioTracks.length > 0) {
                  audioTracks[0].enabled = !audioTracks[0].enabled;
                  setIsMuted(!audioTracks[0].enabled);
                }
              }
            }}
          >
            <MicOff />
          </div>
        </Tooltip>
        <Tooltip
          title={isFeedStopped ? "Video Play" : "Video Pause"}
          position="bottom"
          trigger="mouseenter"
        >
          <div
            className={`icon-btn btn-light  button-effect ${mediaQuery.matches ? "btn-xl" : "btn-sm"
              } ml-3`}
            style={{ height: '4vw', width: '4vw' }}
            onClick={() => {
              //  
              if (localStream) {
                //  
                localStream.getVideoTracks().forEach((track) => {
                  track.enabled = !track.enabled; // Toggle camera state
                });
                if (socket) {
                  socket.emit(EVENTS.VIDEO_CALL.STOP_FEED, {
                    userInfo: { from_user: fromUser._id, to_user: toUser._id },
                    feedStatus: !isFeedStopped,
                  });
                }
                setIsFeedStopped(!isFeedStopped);
              }

              // if (videoRef.current && videoRef.current.srcObject) {
              //   const availableTracks = videoRef.current.srcObject.getTracks();
              //   const availableVideoTracks =
              //     videoRef.current.srcObject.getVideoTracks();
              //   for (
              //     let videoRefIndex = 0;
              //     videoRefIndex < availableTracks.length;
              //     videoRefIndex++
              //   ) {
              //     const track = availableTracks[videoRefIndex];
              //     track.enabled = isFeedStopped;
              //   }

              //   for (
              //     let videoRefIndex = 0;
              //     videoRefIndex < availableVideoTracks.length;
              //     videoRefIndex++
              //   ) {
              //     const track = availableVideoTracks[videoRefIndex];
              //     track.enabled = isFeedStopped;
              //   }
              // }
              // if (remoteVideoRef && remoteVideoRef.current) {
              //   socket.emit(EVENTS.VIDEO_CALL.STOP_FEED, {
              //     userInfo: { from_user: fromUser._id, to_user: toUser._id },
              //     feedStatus: isFeedStopped,
              //   });
              // }
            }}
          >
            {!isFeedStopped ? <PauseCircle /> : <PlayCircle />}
          </div>
        </Tooltip>

        <Tooltip title={"End Call"} position="bottom" trigger="mouseenter">
          <div
            className={`icon-btn btn-danger button-effect ${mediaQuery.matches ? "btn-xl" : "btn-sm"
              }  ml-3`}
            style={{ height: '4vw', width: '4vw' }}
            onClick={() => {
              setCallEnd(true);
              cutCall();
            }}
          >
            <Phone />
          </div>
        </Tooltip>

        {!displayMsg?.showMsg && accountType === AccountType.TRAINER && (
          <Tooltip
            title={
              selectedClips.length
                ? "Exit clip analysis mode"
                : "Clip analysis mode"
            }
            position="bottom"
            trigger="mouseenter"
          >
            <div
              className={
                !maxMin
                  ? `icon-btn btn-light  button-effect  ${mediaQuery.matches ? "btn-xl" : "btn-sm"
                  }  ml-3`
                  : `icon-btn btn-danger  button-effect  ${mediaQuery.matches ? "btn-xl" : "btn-sm"
                  }  ml-3`
              }
              style={{ height: '4vw', width: '4vw' }}
              onClick={() => {
                // socket.emit(EVENTS.ON_VIDEO_SHOW, {
                //   userInfo: { from_user: fromUser._id, to_user: toUser._id },
                //   isClicked: !maxMin,
                // });
                // setMaxMin(!maxMin)
                if (selectedClips?.length) {
                  setIsOpenConfirm(true);
                } else {
                  setIsOpen(true);
                }
              }}
            >
              <ExternalLink />
            </div>
          </Tooltip>
        )}

        {selectedClips?.length && accountType === AccountType.TRAINER ? (
          <Tooltip
            title={videoController ? "Lock" : "Unlock"}
            position="bottom"
            trigger="mouseenter"
          >
            <div
              className={`icon-btn btn-light  button-effect ${mediaQuery.matches ? "btn-xl" : "btn-sm"
                } ml-3`}
              style={{ height: '4vw', width: '4vw' }}
              onClick={globalProgressBarToggler}
            >
              {/* {isPlaying?.isPlayingAll ? <PauseCircle /> : <PlayCircle />} */}
              {videoController ? <FaLock /> : <FaUnlock />}
            </div>
          </Tooltip>
        ) : (
          <></>
        )}

        {accountType === AccountType.TRAINER ? (
          <Tooltip
            title={"Screenshot"}
            position="bottom"
            trigger="mouseenter"
            className="custom-tooltip-hh"
            disabled={width1000}
          >
            <div
              className={`icon-btn btn-light button-effect ${mediaQuery.matches ? "btn-xl" : "btn-sm"
                } ml-3`}
              style={{ height: '4vw', width: '4vw' }}
              onClick={() => {
                setIsTooltipShow(false)
                setTimeout(() => {
                  takeScreenshot();
                }, 30);
              }}
            >
              <Aperture />
            </div>
          </Tooltip>
        ) : (
          <></>
        )}

        {accountType === AccountType.TRAINER ? (
          <Tooltip title={"Game Plans"} position="bottom" trigger="mouseenter">
            <div
              className={`icon-btn btn-light  button-effect ${mediaQuery.matches ? "btn-xl" : "btn-sm"
                } ml-3`}
              style={{ height: '4vw', width: '4vw' }}
              onClick={showReportData}
            >
              <FilePlus />
            </div>
          </Tooltip>
        ) : (
          <></>
        )}

        {/* {accountType === AccountType.TRAINEE ? (
          <div
            className={`icon-btn btn-light  button-effect ${mediaQuery.matches ? "btn-xl" : "btn-sm"
              } ml-3`}
            onClick={recording ? stopRecording : startRecording}
          >
            {recording ? <VideoOff /> : <Video />}
          </div>
        ) : (
          <></>
        )} */}

        <Modal
          isOpen={isOpenConfirm}
          toggle={() => {
            setIsOpenConfirm(false);
          }}
          centered
          className="clip-exit-confirm-modal"
        >
          <ModalHeader
            toggle={() => {
              setIsOpenConfirm(false);
              // Clear clips and emit socket event to sync with student
              setSelectedClips([]);
              emitVideoSelectEvent("clips", [], pinnedUser);
            }}
            close={() => <></>}
            style={{ textAlign: "center" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <i className="fa fa-exclamation-triangle" aria-hidden="true"></i>
              <span>Confirm Exit</span>
            </div>
          </ModalHeader>
          <ModalBody style={{ textAlign: "center", padding: "1.5rem" }}>
            <p style={{ margin: "0 0 1rem 0", fontSize: "1rem", color: "#333" }}>
              Are you sure you want to exit clip analysis mode?
            </p>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "#666" }}>
              Your selected clips will be cleared and you'll return to the regular call view.
            </p>
          </ModalBody>
          <ModalFooter style={{ display: "flex", justifyContent: "center", gap: "1rem", padding: "1rem 1.5rem" }}>
            <Button
              color="secondary"
              onClick={() => {
                setIsOpenConfirm(false);
              }}
              style={{
                backgroundColor: '#6c757d',
                borderColor: '#6c757d',
                color: '#ffffff',
                minHeight: '44px',
                padding: '0.75rem 1.5rem',
                fontWeight: '600'
              }}
            >
              Cancel
            </Button>
            <Button
              color="primary"
              onClick={() => {
                setInitialPinnedUser();
                // Clear clips and emit socket event to sync with student
                setSelectedClips([]);
                emitVideoSelectEvent("clips", [], pinnedUser);
                setIsOpenConfirm(false);
              }}
              style={{
                backgroundColor: '#007bff',
                borderColor: '#007bff',
                color: '#ffffff',
                minHeight: '44px',
                padding: '0.75rem 1.5rem',
                fontWeight: '600'
              }}
            >
              <i className="fa fa-check" aria-hidden="true" style={{ marginRight: "8px" }}></i>
              Confirm
            </Button>
          </ModalFooter>
        </Modal>
      </div>
    );
  };

  const isOnlyOneVideo = {
    height: isPinned ? "150px" : "73vh",
    // width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginRight: isPinned ? "0px !important" : "-15px",
    marginLeft: isPinned ? "0px !important" : "-15px",
    paddingTop:"15px"
  };
  const isTwoVideos = {
    height: isPinned ? "150px" : "73vh",
    width: "100%",
    marginRight: isPinned ? "0px !important" : "-15px",
    marginLeft: isPinned ? "0px !important" : "-15px",
    margin:'auto',
    paddingTop:"15px"
  };


  const handlePlayClick = () => {
    if (videoRef.current) {
      videoRef.current.play().catch(error => {
        // console.error('Playback failed:', error);
        // Implement a user-friendly message or fallback here
      });
    }
  };


  function canPlayVideo(videoUrl) {
    // Create a video element to test compatibility
    const video = document.createElement('video');

    // Check if the browser supports the video element
    if (typeof video.canPlayType === 'function') {
      // Extract the file extension from the URL
      const fileExtension = videoUrl.split('.').pop().toLowerCase();

      // Define MIME types based on common video extensions
      const mimeTypes = {
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'ogg': 'video/ogg',
        'quicktime': 'video/quicktime'
      };

      // Get the MIME type based on the file extension
      const mimeType = mimeTypes[fileExtension] || '';

      // Check if the browser can play this video type
      if (video.canPlayType(mimeType)) {
        //  
        return true;
      } else {
        // console.warn(`This browser cannot play ${fileExtension} videos`);
        return false;
      }
    } else {
      // console.warn('Video playback is not supported in this browser');
      return false;
    }
  }

  // Usage
  // const videoUrl = "https://example.com/video.mp4";
  // if (canPlayVideo(videoUrl)) {
  //   // Load and play the video
  // } else {
  //   // Show alternative content or message
  // }

  // if (canPlayVideo(videoUrl)) {
  //   // Load and play the video
  // } else {
  //   // Show alternative content or message
  // }
  //  


  const calculateCanvasDimensions = () => {
    // Get video elements by their IDs
    const video1 = document.getElementById("selected-video-1");
    const video2 = document.getElementById("selected-video-2");
    if (!video1) {
        console.error("Video element 'selected-video-1' not found.");
        return {};
    }
    // If only one clip is selected, use only video1's dimensions
    if (selectedClips?.length && selectedClips?.length === 1 ) {
        const rect1 = video1.getBoundingClientRect();
        return {
            top: rect1.top + window.scrollY,
            left: rect1.left + window.scrollX,
            width: rect1.width,
            height: rect1.height,
        };
    }

    // If both clips are selected, ensure video2 exists before proceeding
    if (!video2) {
        console.error("Video element 'selected-video-2' not found.");
        return {};
    }

    // Get the bounding rectangles for both video elements
    const rect1 = video1.getBoundingClientRect();
    const rect2 = video2.getBoundingClientRect();

    // Calculate the overlay dimensions and position
    const top = Math.min(rect1.top, rect2.top) + window.scrollY;
    const left = Math.min(rect1.left, rect2.left) + window.scrollX;
    const width = rect1.width + rect2.width; // Combined width
    const height = Math.max(rect1.height, rect2.height); // Maximum height
   
    return {
        top,
        left,
        width,
        height,
    };
  };
  
const previousCanvasContent = useRef(null);
  
const updateCanvasDimensions = () => {

  const { top, left, width, height } = calculateCanvasDimensions();
  
  if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if(pinnedUser === 'user-video-1' || pinnedUser === 'user-video-2'){
        canvas.style.display = 'none';
        return;
      }    

      // Save the current content as an image before resizing
      const previousContent = canvas.toDataURL();

      // Get the current dimensions for calculating scale
      const oldWidth = canvas.width;
      const oldHeight = canvas.height;

      // Resize the canvas
      canvas.style.position = "absolute";
      canvas.style.display = 'block'
      canvas.style.top = `${top}px`;
      canvas.style.left = `${left}px`;
      canvas.width = width;
      canvas.height = height;

      // Calculate scale factors to maintain aspect ratio
      const scaleX = width / oldWidth;
      const scaleY = height / oldHeight;

      if(pinnedUser !== 'user-video-1' && pinnedUser !== 'user-video-2'){
        // Redraw the saved content with scaling
        const img = new Image();
        img.onload = () => {
            // Apply scaling with six parameters
            ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0); // Apply scaling with translation
            ctx.drawImage(img, 0, 0);
            ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform to default
          };
        img.src = previousContent; // Set the source to the saved content
      }

  }
};

useEffect(() => {
  const delay = 1000; // Delay in milliseconds

  // Initial delayed call to update canvas dimensions
  const initialTimeoutId = setTimeout(() => {
      updateCanvasDimensions();
       
  }, delay);

  // Set up delayed resize event listener
  const handleResize = () => {
      clearTimeout(initialTimeoutId); // Prevent the initial timeout from running again on resize
      setTimeout(updateCanvasDimensions, delay);
  };
  window.addEventListener("resize", handleResize);

  // Clean up on unmount
  return () => {
      clearTimeout(initialTimeoutId); // Clear the initial timeout when dependencies change or component unmounts
      window.removeEventListener("resize", handleResize);
  };
}, [selectedClips, isPinned , selectedVideoRef1 , selectedVideoRef2]);

  if (isIOS || isMobile) {
    return (
      <React.Fragment>
        <Script
          src="https://vjs.zencdn.net/7.20.3/video.min.js"
          strategy="lazyOnload"
        />
    
        {/* <canvas
          ref={canvasRef}
          id="drawing-canvas"
          width={document.getElementById("third")?.clientWidth}
          height={document.getElementById("third")?.clientHeight}
          className="canvas-print absolute all-0"
          style={{ left: document.getElementById("third")?.clientX, top: document.getElementById("third")?.clientY, }}
        /> */}
        <div
          className="row"
          style={{ height: "100%", display: "flex", alignItems: "center"}}
        >
          <canvas
                ref={canvasRef}
                id="drawing-canvas"
                className="canvas-print"
              />
          {/* 1 */}
          {accountType === AccountType.TRAINER ? (
            <div id="sidetoolbar" className="col-lg-1 col-md-1 col-sm-2 z-50" style={{ flex: '0 0 9px', width: '9px', marginLeft:'7vh' }}>
              <div>
                <CanvasMenuBar
                  isOpen={isOpen}
                  setIsOpen={setIsOpen}
                  setSketchPickerColor={(rgb) => {
                    setSketchPickerColor(rgb);
                  }}
                  undoDrawing={() => {
                    undoDrawing(
                      {
                        coordinates: storedLocalDrawPaths.sender,
                        theme: canvasConfigs.sender,
                      },
                      {
                        coordinates: storedLocalDrawPaths.receiver,
                        theme: {
                          lineWidth: canvasConfigs.receiver.lineWidth,
                          strokeStyle: canvasConfigs.receiver.strokeStyle,
                        },
                      }
                    );
                  }}
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
                    storedLocalDrawPaths.sender = [];
                    storedLocalDrawPaths.receiver = [];
                    clearCanvas();
                    sendClearCanvasEvent();
                  }}
                  selectedClips={selectedClips}
                  setSelectedClips={setSelectedClips}
                  toUser={toUser}
                  isCanvasMenuNoteShow={isCanvasMenuNoteShow}
                  setIsCanvasMenuNoteShow={setIsCanvasMenuNoteShow}
                  setMicNote={setMicNote}
                  setClipSelectNote={setClipSelectNote}
                  clipSelectNote={clipSelectNote}
                  setCountClipNoteOpen={setCountClipNoteOpen}
                  resetInitialPinnedUser={resetInitialPinnedUser}
                />
              </div>
            </div>
          ) : (
            <div className="" style={{ width: '10px' }}></div>
          )}

          {/* 2 */}

          {
            <div
              className={isIOS == true ? "col-lg-8 col-md-9 col-sm-8 important-margin" : "col-lg-8 col-md-8 col-sm-8 important-margin"}
              id="third"
              style={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-evenly",
                flexDirection: "column",
                alignSelf: 'baseline',
                // top: height < 500 ? "-63px" : ""
              }}
            >
              {displayMsg?.showMsg && displayMsg?.msg ? (
                <CenterMessage
                  message={displayMsg.msg}
                  type="waiting"
                  showSpinner={true}
                  style={{ 
                    maxWidth: width1000 ? "90%" : "500px"
                  }}
                />
              ) : null}
              {selectedClips?.length ? (
                <div
                  className={
                    isPinned
                      ? accountType === AccountType.TRAINER
                        ? pinnedUser === "user-video-1"
                          ? height < 500 ? "switch-clips-container-for-mobile_1" : "switch-clips-container_1"
                          : height < 500 ? "scs2-mobile_1" : "scs2_1"
                        : accountType === AccountType.TRAINEE &&
                          pinnedUser === "user-video-1"
                          ? height < 500 ? "scs2-mobile_1" : "scs2_1"
                          : height < 500 ? "switch-clips-container-for-mobile_1" : "switch-clips-container_1"
                      : "row"
                  }
                  style={{
                    zIndex: isPinned ? "999" : "auto",
                    backgroundColor: isPinned ? "#353535" : "",
                    borderRadius: isPinned ? "10px" : "",
                    padding: isPinned ? "10px" : "5px",
                    marginTop: accountType === AccountType.TRAINER ? isPinned && selectedClips?.length && pinnedUser === "user-video-1" ? (isIOS ? "100px" : "65px") : !isPinned && selectedClips?.length ? '0px' : '35px' : isPinned && selectedClips?.length && pinnedUser === "user-video-2" ? (isIOS ? "100px" : "65px") : !isPinned && selectedClips?.length ? '0px' : '35px',
                    top: accountType === AccountType.TRAINER ? isPinned && selectedClips?.length && pinnedUser === "user-video-2" ? '0px' : '' :
                      // trainee
                      isPinned && selectedClips?.length && pinnedUser === "user-video-2" ? '' : '0px',
                    // overflow: 'hidden',
                    height:
                      !isPinned && selectedClips?.length ? (isIOS ? "60vh" : "73vh") : '12vw',
                    width: !isPinned && selectedClips?.length ? '90%' : ''

                  }}
                  onClick={() => {
                    if (accountType === AccountType.TRAINER) {
                      emitVideoSelectEvent("swap", selectedClips, null);
                      setPinnedUser(null);
                      setIsPinned(false);
                    }
                  }}
                >
                  <div
                    className="row"
                    style={{
                      ...(mediaQuery.matches
                        ? selectedClips?.length === 1
                          ? isOnlyOneVideo
                          : isTwoVideos
                        : {}),
                      // height: '100%',
                      width: '100%',
                      margin: ' 0',
                      // height: isPinned ? "100%" :  accountType === AccountType.TRAINER ? "30vw" :"34.5vw",
                      height: isPinned ? "100%" : accountType === AccountType.TRAINER ?   (isIOS ? "48vh" : "63vh") :   (isIOS ? "48vh" : "63vh"),
                    }}
                  >
                    {selectedClips.length && selectedClips[0] ? (
                      <div
                        className="col-lg-6 col-md-6 col-sm-6 col-xs-12"
                        style={{
                          // padding: "1px !important",
                          height: "100%",
                          padding: 0,
                          margin:'auto',
                          display:"flex",
                          flexDirection: "column",
                          gap: "10px",
                          alignItems: "end"
                        }}
                      >
                       
                        <LazyVideo
                          id="selected-video-1"
                          style={{
                            
                            // height: isPinned ? "100%" :  accountType === AccountType.TRAINER ? "28vw" :"34.5vw",
                            height: isPinned ? "95%" : accountType === AccountType.TRAINER ?  (isIOS ? "50vh" : "63vh")  :  (isIOS ? "55vh" : "63vh") ,
                            width: "auto",
                            maxWidth:"100%",
                            objectFit: "fit",
                            aspectRatio:"9 / 16"
                          }}
                          ref={selectedVideoRef1}
                          onTimeUpdate={handleTimeUpdate1}
                          poster={Utils?.generateThumbnailURL(selectedClips[0])}
                          src={Utils?.generateVideoURL(selectedClips[0])}
                          videoController={videoController}
                        />
                        {/* <canvas id="video-canvas-1" hidden></canvas> */}
                        {accountType === AccountType.TRAINER &&
                          !videoController &&
                          !isPinned && (
                            <>
                              <div
                                className="Pause"
                                style={{
                                  position: "relative",
                                  zIndex: 10,
                                  display: "flex",
                                  // justifyContent: "center",
                                  alignItems: "center",
                                  height: '5vw',
                                }}
                              >
                                <div>
                                  <p style={{ margin: 0, marginRight: "10px", fontSize: 'calc(12px + 1*(100vw - 320px) / 1600)' }}>
                                    {videoTime?.currentTime1}
                                  </p>{" "}
                                </div>
                                <div className="external-control-bar">
                                  <button
                                    className="btn btn-primary px-1 py-1 my-3 mr-2"
                                    onClick={() => togglePlay("one")}
                                    style={{ minWidth: '0px' }}
                                  >
                                    {isPlaying?.isPlaying1 ? (
                                      <Pause
                                        style={{ verticalAlign: "middle", height: '2vw' }}
                                      />
                                    ) : (
                                      <Play style={{ verticalAlign: "middle", height: '2vw' }} />
                                    )}
                                  </button>
                                </div>

                                {/* UI changed of video time slider and made it on onChange effect  */}

                                <input
                                  className="wid-mid"
                                  id="vid_id"
                                  type="range"
                                  ref={progressBarRef}
                                  step="0.01"
                                  value={
                                    selectedVideoRef1.current?.currentTime
                                  }
                                  max={selectedVideoRef1.current?.duration || 100}
                                  onChange={(e) =>
                                    handleProgressBarChange(e, "one")
                                  }
                                />
                                <div>
                                  <p
                                    style={{
                                      margin: 0,
                                      marginLeft: "10px",
                                      fontSize: 'calc(12px + 1*(100vw - 320px) / 1600)'
                                    }}
                                  >
                                    {videoTime?.remainingTime1}
                                  </p>{" "}
                                </div>
                              </div>
                            </>
                          )}
                      </div>
                    ) : null}
                    {selectedClips.length >= 2 && selectedClips[1] ? (
                      <div
                        className="col-lg-6 col-md-6 col-sm-6 col-xs-12"
                        style={{
                          // padding: "1px",
                          height: "100%",
                          padding: 0,
                          margin:'auto',
                          display:"flex",
                          flexDirection: "column",
                          gap: "10px",
                          alignItems: "flex-start"
                        }}
                      >


                        <LazyVideo
                          id="selected-video-2"
                          style={{
                            // height: isPinned ? "100%" : accountType === AccountType.TRAINER ? "28vw" :"34.5vw",
                            height: isPinned ? "95%" : accountType === AccountType.TRAINER ? (isIOS ? "50vh" : "63vh")  :  (isIOS ? "55vh" : "63vh") ,
                            width: "auto",
                            maxWidth:"100%",
                            objectFit: "fit",
                            aspectRatio:"9 / 16"
                          }}
                          ref={selectedVideoRef2}
                          onTimeUpdate={handleTimeUpdate2}
                          poster={Utils?.generateThumbnailURL(selectedClips[1])}
                          src={Utils?.generateVideoURL(selectedClips[1])}
                          videoController={videoController}
                        />
                        {/* <canvas id="video-canvas-2" hidden></canvas> */}
                        {accountType === AccountType.TRAINER &&
                          !videoController &&
                          !isPinned && !isPlaying.isPlayingAll && (
                            <>
                              <div
                                className="Pause2"
                                style={{
                                  position: "relative",
                                  zIndex: 10,
                                  display: "flex",
                                  // justifyContent: "center",
                                  alignItems: "center",
                                  height: '5vw',
                                }}
                              >
                                <div>
                                  <p style={{ margin: 0, marginRight: "10px", fontSize: 'calc(12px + 1*(100vw - 320px) / 1600)' }}>
                                    {videoTime?.currentTime2}
                                  </p>{" "}
                                </div>
                                <div className="external-control-bar">
                                  <button
                                    className="btn btn-primary px-1 py-1 my-3 mr-2 "
                                    onClick={() => togglePlay("two")}
                                    style={{ minWidth: '0px' }}
                                  >
                                    {isPlaying?.isPlaying2 ? (
                                      <Pause
                                        style={{ verticalAlign: "middle", height: '2vw' }}
                                      />
                                    ) : (
                                      <Play style={{ verticalAlign: "middle", height: '2vw' }} />
                                    )}
                                  </button>
                                </div>

                                {/* UI changed of video time slider and made it on onChange effect  */}
                                <input
                                  type="range"
                                  id="vid_id"
                                  className="wid-mid"
                                  // className="progress"
                                  ref={progressBarRef2}
                                  step="0.01"
                                  value={
                                    selectedVideoRef2.current?.currentTime 
                                  }
                                  max={selectedVideoRef2.current?.duration || 100}
                                  onChange={(e) =>
                                    handleProgressBarChange(e, "two")
                                  }
                                />
                                <div>
                                  <p style={{ margin: 0, marginLeft: "10px" }}>
                                    {videoTime?.remainingTime2}
                                  </p>{" "}
                                </div>
                              </div>
                              {/* commented volume rannge  for now */}

                            </>
                          )}
                      </div>
                    ) : null}
                  </div>
                  {accountType === AccountType.TRAINER &&
                    videoController &&
                    !isPinned && (
                      <>
                        <div
                          className="Pause"
                          style={{
                            position: "relative",
                            zIndex: 10,
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            marginInline: "auto",
                            width: '100%',
                            height: '3vw'
                          }}
                        >
                          <div className="external-control-bar">
                            <button
                              className="btn btn-primary px-1 py-1 my-3 mr-2"
                              style={{ minWidth: '0px' }}
                              onClick={() => togglePlay("all")}
                            >
                              {isPlaying?.isPlayingAll ? (
                                <Pause style={{ verticalAlign: "middle" }} />
                              ) : (
                                <Play style={{ verticalAlign: "middle" }} />
                              )}
                            </button>
                          </div>
                          <input
                            type="range"
                            ref={globalProgressBarRef}
                            step="0.01"
                            value={
                              globalSliderValue
                            }
                            max={
                              Math.max(
                                selectedVideoRef1.current?.duration || 0,
                                selectedVideoRef2.current?.duration || 0
                              )
                            }
                            onChange={(e) =>
                              handleGlobalProgressBarChange(e)
                            }
                            style={{ width: "450px" }}
                          />
                        </div>
                      </>
                    )}
                </div>
              ) : null}

              {/* Timer  */}
              {isTraineeJoined &&
              <div
                id="sessionEndTime"
                style={{
                  position: "absolute",
                  top: width768 ? (!displayMsg?.msg ? "1%" : "20px") : "3%",
                  right: "-125px",
                  zIndex: 999,
                  width: displayMsg?.msg ? '100%' : ''
                }}
              >
                <div
                  className={displayMsg?.msg ? 'text-center-displayMsg' : "text-center"}
                  style={{
                    display: "flex",
                    fontSize: "12px",
                    justifyContent: "center",
                    alignItems: "center",
                    flexDirection: 'column',
                  }}
                >
                  <h3 style={{ fontSize: 'calc(14px + 2*(100vw - 320px) / 1600)' }}>Time remaining</h3>
                  <h2 style={{ fontSize: 'calc(14px + 2*(100vw - 320px) / 1600)' }}>
                    {lessonTimeDisplay || "--:--"}
                  </h2>
                  {lessonStatusBanner && (
                    <p style={{ fontSize: '12px', marginTop: '4px' }}>
                      {lessonStatusBanner}
                    </p>
                  )}
                </div>
              </div>}

              {/* Lesson time warnings */}
              <Modal
                isOpen={showFiveMinuteWarning}
                toggle={() => setShowFiveMinuteWarning(false)}
                centered
              >
                <ModalHeader toggle={() => setShowFiveMinuteWarning(false)}>
                  Session ending soon
                </ModalHeader>
                <ModalBody>
                  Your session will end in approximately <strong>5 minutes</strong>.
                </ModalBody>
              </Modal>

              <Modal
                isOpen={showOneMinuteWarning}
                toggle={() => setShowOneMinuteWarning(false)}
                centered
              >
                <ModalHeader toggle={() => setShowOneMinuteWarning(false)}>
                  Session ending very soon
                </ModalHeader>
                <ModalBody>
                  Your session will end in approximately <strong>1 minute</strong>.
                </ModalBody>
              </Modal>
              {/* User Video 1 */}

              <div
                id="user-video-1"
                className={
                  !selectedClips.length &&
                    isPinned &&
                    ((accountType === AccountType.TRAINER &&
                      pinnedUser === "user-video-2") ||
                      (accountType === AccountType.TRAINEE &&
                        pinnedUser === "user-video-1"))
                    ? // pinnedUser === "user-video-2"
                    "scs2_1"
                    : !selectedClips.length &&
                      isPinned &&
                      // pinnedUser === "user-video-1"
                      ((accountType === AccountType.TRAINER &&
                        pinnedUser === "user-video-1") ||
                        (accountType === AccountType.TRAINEE &&
                          pinnedUser === "user-video-2"))
                      ? "switch-user-video"
                      : selectedClips.length &&
                        isPinned &&
                        selectedClips.length &&
                        ((accountType === AccountType.TRAINER &&
                          pinnedUser === "user-video-1") ||
                          (accountType === AccountType.TRAINEE &&
                            pinnedUser === "user-video-2"))
                        ? "switch-user-video"
                        : selectedClips?.length !== 0 && mediaQuery.matches
                          ? "scs_1"
                          : ""
                }
                style={{
                  zIndex:
                    !selectedClips.length &&
                      isPinned &&
                      // pinnedUser === "user-video-2"
                      ((accountType === AccountType.TRAINER &&
                        pinnedUser === "user-video-2") ||
                        (accountType === AccountType.TRAINEE &&
                          pinnedUser === "user-video-1"))
                      ? "999"
                      : selectedClips?.length &&
                        ((accountType === AccountType.TRAINER &&
                          pinnedUser !== "user-video-1") ||
                          (accountType === AccountType.TRAINEE &&
                            pinnedUser !== "user-video-2")) &&
                        isPinned
                        ? 999
                        : selectedClips?.length && !pinnedUser && !isPinned
                          ? 999
                          : "auto",
                  width: accountType === AccountType.TRAINER ? !selectedClips.length && !isPinned ? '' : isPinned && pinnedUser === "user-video-1" ? '' : '25%' : !selectedClips.length && !isPinned ? '' : isPinned && pinnedUser === "user-video-1" ? '25%' : selectedClips.length && !isPinned ? '25% ' : '',
                  height:
                    accountType === AccountType.TRAINER && selectedClips.length &&
                      isPinned && pinnedUser === "user-video-1" ? (isIOS ? "52vh" : "73vh") :
                      !selectedClips.length &&
                        isPinned &&
                        // pinnedUser === "user-video-2"
                        ((accountType === AccountType.TRAINER &&
                          pinnedUser === "user-video-2") ||
                          (accountType === AccountType.TRAINEE &&
                            pinnedUser === "user-video-1"))
                        ? height < 500 ? "12vw" : "12vw"
                        : selectedClips?.length === 0 ||
                          (accountType === AccountType.TRAINER &&
                            pinnedUser === "user-video-1") ||
                          (accountType === AccountType.TRAINEE &&
                            pinnedUser === "user-video-2")
                          ? width500
                            ? "380px"
                            : height < 500 ?(isIOS ? "52vh" : "73vh") : "500px"
                          : height < 500 ? "12vw" : "12vw",
                  marginTop: accountType === AccountType.TRAINER ?
                    displayMsg?.msg ? "0px" :
                      isPinned && pinnedUser === "user-video-1" ? '10px' :
                        selectedClips?.length && isPinned && pinnedUser === "user-video-2" ? (isIOS ? "100px" : "86px") : (isIOS ? "100px" : "86px")
                    :
                    // trainee
                    displayMsg?.msg && isPinned && pinnedUser === "user-video-2" ? "0px" : displayMsg?.msg && isPinned && pinnedUser === "user-video-1" ? "0px" :
                      isPinned && pinnedUser === "user-video-2" ? '10px' :
                        selectedClips.length && isPinned && pinnedUser === "user-video-1" ? '65px' : isPinned && pinnedUser === "user-video-1" ? (isIOS ? "100px" : "65px") : (isIOS ? "100px" : "65px"),
                  top:
                    accountType === AccountType.TRAINER && displayMsg?.msg && isPinned && pinnedUser === "user-video-2" ? "110px" : accountType === AccountType.TRAINER && displayMsg?.msg && isPinned && pinnedUser === "user-video-1" ? "0px" : accountType === AccountType.TRAINEE && isPinned && pinnedUser === "user-video-1" ? '' :
                      isPinned ?
                        ((accountType === AccountType.TRAINER &&
                          pinnedUser === "user-video-1") ||
                          (accountType === AccountType.TRAINEE &&
                            pinnedUser === "user-video-2"))
                          ? "0% !important"
                          // ? height < 500 ? "50px" : "0% !important"
                          : (accountType === AccountType.TRAINER &&
                            pinnedUser !== "user-video-1") ||
                            (accountType === AccountType.TRAINEE &&
                              pinnedUser !== "user-video-2") ||
                            pinnedUser === null
                            ? "45% !important"
                            : "50%" :
                        "",

                  // position: displayMsg?.msg || isRemoteVideoOff ? "relative" : height < 500 ? pinnedUser === "user-video-1" ? "relative" : "absolute" : "relative",
                  position: height < 500 ? ((accountType === AccountType.TRAINER && pinnedUser === "user-video-1") || (accountType === AccountType.TRAINEE && pinnedUser === "user-video-2")) ? "relative" : "absolute" : "relative",

                  right: !((accountType === AccountType.TRAINER && pinnedUser === "user-video-1") || (accountType === AccountType.TRAINEE && pinnedUser === "user-video-2")) && height < 500 ? "-140px" : "",
                }}
                onClick={() => {
                  if (accountType === AccountType.TRAINER) {
                    if (pinnedUser === "user-video-1") {
                      emitVideoSelectEvent("swap", selectedClips, null);
                      setIsPinned(false);
                      setPinnedUser(null);
                    } else {
                      emitVideoSelectEvent("swap", selectedClips, "user-video-1");
                      setIsPinned(true);
                      setPinnedUser("user-video-1");
                    }
                  }
                }}
              >
                <video
                  ref={remoteVideoRef}
                  playsInline
                  autoPlay
                  style={{
                    width: "100%",
                    position: accountType === AccountType.TRAINER ? pinnedUser === "user-video-1" ? "relative" : "absolute" : pinnedUser === "user-video-2" ? "relative" : "absolute",
                    top: 0,
                    height:
                      !selectedClips.length &&
                        isPinned &&
                        ((accountType === AccountType.TRAINER &&
                          pinnedUser === "user-video-2") ||
                          (accountType === AccountType.TRAINEE &&
                            pinnedUser === "user-video-1"))
                        ? height < 500 ? "12vw" : "12vw"
                        : selectedClips?.length === 0 ||
                          (accountType === AccountType.TRAINER &&
                            pinnedUser === "user-video-1") ||
                          (accountType === AccountType.TRAINEE &&
                            pinnedUser === "user-video-2")
                          ? width500
                            ? "52vh"
                            : height < 500 ? (isIOS ? "52vh" : "73vh") : "73vh"
                          : height < 500 ? "12vw" : "12vw",
                    objectFit: "cover",
                    borderRadius: "10px",
                  }}
                  id="end-user-video"
                />
                <div
                  style={{
                    position: "absolute",
                    top: "0",
                    left: "0",
                    right: "0",
                    bottom: "0",
                    width: "100%",
                    // height: "100%",
                    height:
                      !selectedClips.length &&
                        isPinned &&
                        // pinnedUser === "user-video-2"
                        ((accountType === AccountType.TRAINER &&
                          pinnedUser === "user-video-2") ||
                          (accountType === AccountType.TRAINEE &&
                            pinnedUser === "user-video-1"))
                        ? height < 500 ? "12vw" : "12vw"
                        : selectedClips?.length === 0 ||
                          (accountType === AccountType.TRAINER &&
                            pinnedUser === "user-video-1") ||
                          (accountType === AccountType.TRAINEE &&
                            pinnedUser === "user-video-2")
                          ? width500
                            ? "380px"
                            : height < 500 ? "100%" : "500px"
                          : height < 500 ? "12vw" : "12vw",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: "rgb(53,53,53)",
                    borderRadius: "10px",
                    display:
                      displayMsg?.msg || isRemoteVideoOff ? "flex" : "none",
                  }}
                >
                  {toUser?.profile_picture ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "5px",
                        justifyContent: "center",
                        alignItems: "center"
                      }}

                    >
                      <img
                        src={Utils.getImageUrlOfS3(toUser?.profile_picture)}
                        srcset=""
                        style={{
                          width: height < 500 ? "60px" : "100px",
                          height: height < 500 ? "60px" : "100px",
                          borderRadius:"5%"
                        }}
                      // className="container-raj"
                      />
                      <span style={{
                        color: "white"
                      }}>

                        {toUser?.fullname}
                      </span>
                    </div>
                  ) : (
                    <div
                      className="container-raj "
                      style={{
                        backgroundColor: Utils.charBasedColors(
                          Utils.capitalizeFirstChar(toUser.fullname)
                        ),
                      }}
                    >
                      <h1 className="text-box-raj">
                        {" "}
                        {getInitials(toUser?.fullname)}
                      </h1>
                    </div>
                  )}
                </div>
              </div>

              {/* User Video 2 */}

              <div
                id="user-video-2"
                className={
                  !selectedClips.length &&
                    isPinned &&
                    // pinnedUser === "user-video-2"
                    ((accountType === AccountType.TRAINER &&
                      pinnedUser === "user-video-2") ||
                      (accountType === AccountType.TRAINEE &&
                        pinnedUser === "user-video-1"))
                    ? "switch-user-video"
                    : selectedClips.length &&
                      isPinned &&
                      selectedClips.length &&
                      ((accountType === AccountType.TRAINER &&
                        pinnedUser === "user-video-2") ||
                        (accountType === AccountType.TRAINEE &&
                          pinnedUser === "user-video-1"))
                      ? "switch-user-video"
                      : mediaQuery.matches
                        ? "scs2_1"
                        : ""
                }
                style={{
                  zIndex:
                    isPinned &&
                      ((accountType === AccountType.TRAINER &&
                        pinnedUser === "user-video-2") ||
                        (accountType === AccountType.TRAINEE &&
                          pinnedUser === "user-video-1"))
                      ? "auto"
                      : 999,
                  width: !isPinned ? '25%  ' : accountType === AccountType.TRAINER ? isPinned && pinnedUser === "user-video-2" ? '' : '25%' : isPinned && pinnedUser === "user-video-1" ? '' : '25%',
                  marginTop: accountType === AccountType.TRAINER && isPinned && pinnedUser === "user-video-2" ? '10px' : accountType === AccountType.TRAINEE && isPinned && pinnedUser === "user-video-1" ? '10px' : accountType === AccountType.TRAINEE && displayMsg?.msg && isPinned &&
                    pinnedUser === "user-video-1" ? '0px' : displayMsg?.msg && isPinned &&
                      pinnedUser === "user-video-2" ? '0px' : accountType === AccountType.TRAINER ? isPinned &&
                        pinnedUser === "user-video-2" ? '50px' : ''
                    :
                    // trainee
                    !isPinned && selectedClips?.length ? '50px' :
                      pinnedUser === "user-video-2" ? "" : "50px",

                  top: accountType === AccountType.TRAINER ? "" :
                    // trainee
                    !isPinned && selectedClips?.length ? '0px' : ''
                  ,
                  height: accountType === AccountType.TRAINER && isPinned && pinnedUser === "user-video-2" ?(isIOS ? "52vh" : "73vh") :
                    isPinned &&
                      ((accountType === AccountType.TRAINER &&
                        pinnedUser === "user-video-2") ||
                        (accountType === AccountType.TRAINEE &&
                          pinnedUser === "user-video-1"))
                      ? width500
                        ? (isIOS ? "52vh" : "73vh")
                        : height < 500 ?  (isIOS ? "52vh" : "73vh")  :  (isIOS ? "52vh" : "73vh") 
                      : width500
                        ? "12vw"
                        : height < 500 ? "12vw" : "12vw",
                  // top :  selectedClips.length > 0 ?  "10% !important" : "20%"
                  top: accountType === AccountType.TRAINEE && displayMsg?.msg && isPinned &&
                    pinnedUser === "user-video-2" ? width900 ?'20px':'110px' : displayMsg?.msg && isPinned &&
                      pinnedUser === "user-video-1" ? width900 ?'20px':'110px' : displayMsg?.msg && isPinned &&
                        pinnedUser === "user-video-2" ? "0px" :
                    accountType === AccountType.TRAINEE && !isPinned && selectedClips?.length ? '0px' :
                      isPinned && !(height < 500) ?
                        ((accountType === AccountType.TRAINER && pinnedUser === "user-video-2") || (accountType === AccountType.TRAINEE && pinnedUser === "user-video-1"))
                          ? "0% !important"
                          : (accountType === AccountType.TRAINER && pinnedUser !== "user-video-2") || (accountType === AccountType.TRAINEE && pinnedUser !== "user-video-1") || pinnedUser === null
                            ? "10% !important" : "20%"
                        : height < 500 ? !((accountType === AccountType.TRAINER && pinnedUser === "user-video-2") || (accountType === AccountType.TRAINEE && pinnedUser === "user-video-1")) ? "50px" : "" : "",

                  position: height < 500 ?
                    ((accountType === AccountType.TRAINER && pinnedUser === "user-video-2")
                      || (accountType === AccountType.TRAINEE && pinnedUser === "user-video-1")
                    ) ?
                      "relative" : "absolute" : "relative",
                  right: !((accountType === AccountType.TRAINER && pinnedUser === "user-video-2") || (accountType === AccountType.TRAINEE && pinnedUser === "user-video-1")) && height < 500 ? "-140px" : "",
                }}
                onClick={() => {
                  if (accountType === AccountType.TRAINER) {
                    if (pinnedUser === "user-video-2") {
                      emitVideoSelectEvent("swap", selectedClips, null);
                      setIsPinned(false);
                      setPinnedUser(null);
                    } else {
                      emitVideoSelectEvent("swap", selectedClips, "user-video-2");
                      setIsPinned(true);
                      setPinnedUser("user-video-2");
                    }
                  }
                }}
              >
                <video
                  id="end-user-video"
                  playsInline
                  muted
                  style={{
                    position: accountType === AccountType.TRAINER ? pinnedUser === "user-video-2" ? "relative" : "absolute" : pinnedUser === "user-video-1" ? "relative" : "absolute",
                    top: (isIOS ? "0" : accountType.trainer ? "10px" : "0"),
                    width: "100%",
                    height:
                      isPinned &&
                        ((accountType === AccountType.TRAINER &&
                          pinnedUser === "user-video-2") ||
                          (accountType === AccountType.TRAINEE &&
                            pinnedUser === "user-video-1"))
                        ? width500
                          ? "380px"
                          : height < 500 ? "100%" : "500px"
                        : width500
                          ? "150px"
                          : height < 500 ? "12vw" : "12vw",
                    objectFit: "cover",
                    borderRadius: "10px",
                  }}
                  ref={videoRef}
                  autoPlay
                />
                <div
                  style={{
                    position: "absolute",
                    top: "0%",
                    left: "0%",
                    right: "0%",
                    bottom: "0%",
                    width: "100%",
                    // height: "100%",
                    height:
                      isPinned &&
                        ((accountType === AccountType.TRAINER &&
                          pinnedUser === "user-video-2") ||
                          (accountType === AccountType.TRAINEE &&
                            pinnedUser === "user-video-1"))
                        ? width500
                          ? "380px"
                          : height < 500 ? "100%" : "500px"
                        : width500
                          ? "150px"
                          : height < 500 ? "12vw" : "12vw",
                    display: isFeedStopped ? "flex" : "none",
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: "rgb(53,53,53)",
                    borderRadius: "10px",
                  }}
                >
                  {fromUser?.profile_picture ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "5px",
                        justifyContent: "center",
                        alignItems: "center"
                      }}

                    >
                      <img
                        src={Utils.getImageUrlOfS3(fromUser?.profile_picture)}
                        srcset=""
                        style={{
                          width: height < 500 ? "60px" : "100px",
                          height: height < 500 ? "60px" : "100px",
                          borderRadius:"5%"  
                        }}
                      // className="container-raj"
                      />
                      <span style={{
                        color: "white"
                      }}>

                        {fromUser?.fullname}
                      </span>
                    </div>
                  ) : (
                    <div
                      className="container-raj"
                      style={{
                        backgroundColor: Utils.charBasedColors(
                          Utils.capitalizeFirstChar(fromUser.fullname)
                        ),
                      }}
                    >
                      <h1 className="text-box-raj">
                        {" "}
                        {getInitials(fromUser.fullname)}
                      </h1>
                    </div>
                  )}
                </div>
              </div>

              {renderCallActionButtons()}
            </div>
          }

          <ReportModal
            currentReportData={{
              session: id,
              trainer: fromUser?._id,
              trainee: toUser?._id,
            }}
            isOpenReport={isOpenReport}
            setIsOpenReport={setIsOpenReport}
            screenShots={screenShots}
            setScreenShots={setScreenShots}
            // setScreenShots={setScreenShot}
            reportObj={reportObj}
            setReportObj={setReportObj}
            isClose={isClose}
            isTraineeJoined={isTraineeJoined}
            isCallEnded={isCallEnded}
          />

          <Modal isOpen={isModelOpen} centered>
            <ModalHeader style={{ textAlign: "center" }}>
              <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "600" }}>Recording</h2>
            </ModalHeader>
            <ModalBody style={{ textAlign: "center", padding: "1.5rem" }}>
              <p style={{ margin: "0 0 1.5rem 0", fontSize: "1rem", color: "#333" }}>
                Would you like to start recording this session?
              </p>
              <div style={{ display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap" }}>
                <Button
                  color="primary"
                  onClick={() => {
                    startRecording();
                    setIsModelOpen(false);
                  }}
                  style={{
                    backgroundColor: '#007bff',
                    borderColor: '#007bff',
                    color: '#ffffff',
                    minHeight: '44px',
                    padding: '0.75rem 1.5rem',
                    fontWeight: '600'
                  }}
                >
                  Start Recording
                </Button>
                <Button
                  color="secondary"
                  onClick={() => {
                    setIsModelOpen(false);
                  }}
                  style={{
                    backgroundColor: '#6c757d',
                    borderColor: '#6c757d',
                    color: '#ffffff',
                    minHeight: '44px',
                    padding: '0.75rem 1.5rem',
                    fontWeight: '600'
                  }}
                >
                  Cancel
                </Button>
              </div>
            </ModalBody>
          </Modal>
        </div>
        {isScreenShotModelOpen && (
          
          <ScreenShotDetails
            screenShotImages={screenShots}
            setScreenShotImages={setScreenShots}
            setIsOpenDetail={setIsScreenShotModelOpen}
            isOpenDetail={isScreenShotModelOpen}
            currentReportData={{
              session: id,
              trainer: fromUser?._id,
              trainee: toUser?._id,
            }}
            reportObj={reportObj}
          />
        )}

        <PermissionModal isOpen={permissionModal} />
      </React.Fragment>
    );
  } else {
    return (
      <React.Fragment>
        <Script
          src="https://vjs.zencdn.net/7.20.3/video.min.js"
          strategy="lazyOnload"
        />

        <div
          className="row"
          style={{ height: "100vh", display: "flex", alignItems: "center" }}
        >
            <canvas
                ref={canvasRef}
                id="drawing-canvas"
                className="canvas-print"
              />
          {/* 1 */}
          {accountType === AccountType.TRAINER ? (
            <div className="col-lg-1 col-md-1 col-sm-2 z-50"
            // style={{ flex: '0 0 9px', width: '9px', }}
            >
              <div>
                <CanvasMenuBar
                  isOpen={isOpen}
                  setIsOpen={setIsOpen}
                  setSketchPickerColor={(rgb) => {
                    setSketchPickerColor(rgb);
                  }}
                  undoDrawing={() => {
                    undoDrawing(
                      {
                        coordinates: storedLocalDrawPaths.sender,
                        theme: canvasConfigs.sender,
                      },
                      {
                        coordinates: storedLocalDrawPaths.receiver,
                        theme: {
                          lineWidth: canvasConfigs.receiver.lineWidth,
                          strokeStyle: canvasConfigs.receiver.strokeStyle,
                        },
                      }
                    );
                  }}
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
                    storedLocalDrawPaths.sender = [];
                    storedLocalDrawPaths.receiver = [];
                    clearCanvas();
                    sendClearCanvasEvent();
                  }}
                  selectedClips={selectedClips}
                  setSelectedClips={setSelectedClips}
                  toUser={toUser}
                  isCanvasMenuNoteShow={isCanvasMenuNoteShow}
                  setIsCanvasMenuNoteShow={setIsCanvasMenuNoteShow}
                  setMicNote={setMicNote}
                  setClipSelectNote={setClipSelectNote}
                  clipSelectNote={clipSelectNote}
                  setCountClipNoteOpen={setCountClipNoteOpen}
                  resetInitialPinnedUser={resetInitialPinnedUser}
                />
              </div>
            </div>
          ) : (
            <div className="col-lg-1 col-md-6 col-sm-2 " ></div>
          )}

          {/* 2 */}

          {
            <div
              className="col col-8"
              id="third"
              style={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-evenly",
                flexDirection: "column",
                // top: height < 500 ? "-63px" : ""
              }}
            >
              {displayMsg?.showMsg && displayMsg?.msg ? (
                <CenterMessage
                  message={displayMsg.msg}
                  type="waiting"
                  showSpinner={true}
                  style={{ 
                    maxWidth: width1000 ? "90%" : "500px"
                  }}
                />
              ) : null}
            
              {selectedClips?.length ? (
                <div
                  id="clips-container-id"
                  className={
                    isPinned
                      ? accountType === AccountType.TRAINER
                        ? pinnedUser === "user-video-1"
                          ? "switch-clips-container pb-2 pt-3"
                          : "scs2"
                        : accountType === AccountType.TRAINEE &&
                          pinnedUser === "user-video-1"
                          ? "scs2"
                          : "switch-clips-container pb-2 pt-3"
                      : "row"
                  }
                  style={{
                    zIndex: isPinned ? "999" : "auto",
                    backgroundColor: isPinned ? "#353535" : "",
                    borderRadius: isPinned ? "10px" : "",
                    padding: isPinned ? "15px !important" : "",
                    position:'relative'
                  }}
                  onClick={() => {
                    if (accountType === AccountType.TRAINER) {
                      emitVideoSelectEvent("swap", selectedClips, null);
                      setPinnedUser(null);
                      setIsPinned(false);
                    }
                  }}
                >
                  <div
                    className={`row ${pinnedUser === "user-video-1" ? "m-0 p-2" :'m-0 p-2'}`}
                    style={
                      mediaQuery.matches
                        ? selectedClips?.length === 1
                          ? {...isOnlyOneVideo , paddingTop:'0px !important'}
                          : {...isTwoVideos , paddingTop:'0px !important'}
                        : {}
                    }
                  >
                    {selectedClips.length && selectedClips[0] ? (
                      <div
                        className="col-lg-6 col-md-6 col-sm-6 col-xs-12"
                        style={{
                          // padding: "1px !important",
                          height: "100%",
                          paddingRight: 0,
                          display:"flex",
                          flexDirection: "column",
                          gap: "10px",
                          alignItems: "end"
                        }}
                      >
                        {/* {
                          showThumbnailForFirstVideo ?
                            <img
                              src={Utils?.generateThumbnailURL(selectedClips[0])}
                              id="selected-video-1"
                              style={{
                                height: isPinned ? "100%" : "34.5vw",
                                width: "100%",
                                objectFit: "cover",
                              }}
                              loading="lazy"
                            />
                            :
                            <video
                              // crossOrigin="anonymous"
                              poster={Utils?.generateThumbnailURL(selectedClips[0])}
                              id="selected-video-1"
                              style={{
                                height: isPinned ? "100%" : "34.5vw",
                                // width: "inherit",
                                // borderRadius: 10,
                                width: "100%",
                                objectFit: "cover",
                              }}
                              ref={selectedVideoRef1}
                              onTimeUpdate={handleTimeUpdate1}
                              onCanPlay={() => canPlayVideo(Utils.generateVideoURL2(selectedClips[0]))}
                            >

                              <source src={Utils.generateVideoURL2(selectedClips[0])} type="video/mp4" />
                              <source src={Utils.generateVideoURL2(selectedClips[0])} type="video/webm" />
                            </video>
                        } */}

                        <LazyVideo
                          id="selected-video-1"
                          style={{
                            height: "95%",
                            width: "auto",
                            maxWidth:"100%",
                            objectFit: "fit",
                            aspectRatio:"9 / 16"
                          }}
                          ref={selectedVideoRef1}
                          onTimeUpdate={handleTimeUpdate1}
                          poster={Utils?.generateThumbnailURL(selectedClips[0])}
                          src={Utils?.generateVideoURL(selectedClips[0])}
                          videoController={videoController}
                        />
                        {/* <canvas id="video-canvas-1" hidden></canvas> */}
    
                        {accountType === AccountType.TRAINER &&
                          !videoController &&
                          !isPinned && (
                            <>
                              <div
                                className="Pause"
                                style={{
                                  position: "relative",
                                  zIndex: 10,
                                  display: "flex",
                                  justifyContent: "center",
                                  alignItems: "center",
                                }}
                              >
                                <div>
                                  <p style={{ margin: 0, marginRight: "10px" }}>
                                    {videoTime?.currentTime1}
                                  </p>{" "}
                                </div>
                                <div className="external-control-bar">
                                  <button
                                    className="btn btn-primary px-1 py-1 my-3 mr-2"
                                    onClick={() => {
                                      togglePlay("one");
                                      handlePlayClick()
                                    }}
                                  >
                                    {isPlaying?.isPlaying1 ? (
                                      <Pause
                                        style={{ verticalAlign: "middle" }}
                                      />
                                    ) : (
                                      <Play style={{ verticalAlign: "middle" }} />
                                    )}
                                  </button>
                                </div>

                                {/* UI changed of video time slider and made it on onChange effect  */}

                                <input
                                  type="range"
                                  ref={progressBarRef}
                                  step="0.01"
                                  value={
                                    selectedVideoRef1.current?.currentTime
                                  }
                                  max={selectedVideoRef1.current?.duration || 100}
                                  onChange={(e) =>
                                    handleProgressBarChange(e, "one")
                                  }
                                />
                                <div>
                                  <p
                                    style={{
                                      margin: 0,
                                      marginLeft: "10px",
                                    
                                    }}
                                  >
                                    {videoTime?.remainingTime1}
                                  </p>{" "}
                                </div>
                              </div>
                            </>
                          )}
                      </div>
                    ) : null}
                    {selectedClips.length && selectedClips[1] ? (
                      <div
                        className="col-lg-6 col-md-6 col-sm-6 col-xs-12"
                        style={{
                          // padding: "1px",
                          height: "100%",
                          paddingLeft: 0,
                          
                          display:"flex",
                          flexDirection: "column",
                          gap: "10px",
                          alignItems: "flex-start"
                        }}
                      >
                        {/* {
                          showThumbnailForFirstVideo ?
                            <img
                              src={Utils?.generateThumbnailURL(selectedClips[1])}
                              id="selected-video-1"
                              style={{
                                height: isPinned ? "100%" : "34.5vw",
                                width: "100%",
                                objectFit: "cover",
                              }}
                              loading="lazy"
                            />
                            :
                            <video
                              // crossOrigin="anonymous"
                              id="selected-video-2"
                              style={{
                                height: isPinned ? "100%" : "34.5vw",
                                // width: "inherit",
                                // borderRadius: 10,
                                width: "100%",
                                objectFit: "cover",
                              }}
                              ref={selectedVideoRef2}
                              onTimeUpdate={handleTimeUpdate2}
                              poster={Utils?.generateThumbnailURL(selectedClips[1])}
                            >
                              <source
                                src={Utils?.generateVideoURL(selectedClips[1])}
                                type="video/mp4"
                              />
                            </video>
                        } */}

                        <LazyVideo
                          id="selected-video-2"
                          style={{
                            height: "95%",
                            width: "auto",
                            maxWidth:"100%",
                            objectFit: "fit",
                            aspectRatio:"9 / 16"
                          }}
                          ref={selectedVideoRef2}
                          onTimeUpdate={handleTimeUpdate2}
                          poster={Utils?.generateThumbnailURL(selectedClips[1])}
                          src={Utils?.generateVideoURL(selectedClips[1])}
                          videoController={videoController}
                        />
                        {/* <canvas id="video-canvas-2" hidden></canvas> */}
                        {accountType === AccountType.TRAINER &&
                          !videoController &&
                          !isPinned && (
                            <>
                              <div
                                className="Pause2"
                                style={{
                                  position: "relative",
                                  zIndex: 10,
                                  display: "flex",
                                  justifyContent: "center",
                                  alignItems: "center",
                                }}
                              >
                                <div>
                                  <p style={{ margin: 0, marginRight: "10px" }}>
                                    {videoTime?.currentTime2}
                                  </p>{" "}
                                </div>
                                <div className="external-control-bar">
                                  <button
                                    className="btn btn-primary px-1 py-1 my-3 mr-2 "
                                    onClick={() => togglePlay("two")}
                                  >
                                    {isPlaying?.isPlaying2 ? (
                                      <Pause
                                        style={{ verticalAlign: "middle" }}
                                      />
                                    ) : (
                                      <Play style={{ verticalAlign: "middle" }} />
                                    )}
                                  </button>
                                </div>
                                {/* <progress
                            className="progress"
                            ref={progressBarRef2}
                            value="0"
                            max={
                              selectedVideoRef2.current
                                ? selectedVideoRef2.current.duration
                                : 100
                            }
                            onClick={(e) => handleProgressBarClick(e, "two")}
                          /> */}

                                {/* UI changed of video time slider and made it on onChange effect  */}
                                <input
                                  type="range"
                                  // className="progress"
                                  ref={progressBarRef2}
                                  step="0.01"
                                  value={
                                    selectedVideoRef2.current?.currentTime
                                  }
                                  max={selectedVideoRef2.current?.duration || 100}
                                  onChange={(e) =>
                                    handleProgressBarChange(e, "two")
                                  }
                                />
                                <div>
                                  <p style={{ margin: 0, marginLeft: "10px" }}>
                                    {videoTime?.remainingTime2}
                                  </p>{" "}
                                </div>
                              </div>
                              {/* commented volume rannge  for now */}
                              {/* <div
                          className="progress2"
                          style={{
                            position: "relative",
                            zIndex: 10,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <div>
                            <p style={{ margin: 0, marginRight: "10px" }}>
                              Volume
                            </p>{" "}
                          </div>
                          <input
                            className="progress"
                            ref={volumeInputRef2}
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={volume2}
                            onChange={handleVolumeChange2}
                          />
                        </div> */}
                            </>
                          )}
                      </div>
                    ) : null}
                  </div>
                  {accountType === AccountType.TRAINER &&
                    videoController &&
                    !isPinned && (
                      <>
                        <div
                          className="Pause"
                          style={{
                            position: "relative",
                            zIndex: 10,
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            marginInline: "auto",
                          }}
                        >
                          {/* <div>
                            <p style={{ margin: 0, marginRight: "10px" }}>
                              {videoTime?.currentTime1}
                            </p>{" "}
                          </div> */}
                          <div className="external-control-bar">
                            <button
                              className="btn btn-primary px-1 py-1 my-3 mr-2"
                              onClick={() => togglePlay("all")}
                            >
                              {isPlaying?.isPlayingAll ? (
                                <Pause style={{ verticalAlign: "middle" }} />
                              ) : (
                                <Play style={{ verticalAlign: "middle" }} />
                              )}
                            </button>
                          </div>
                          <input
                            type="range"
                            ref={globalProgressBarRef}
                            step="0.01"
                            value={
                              Math.max(
                                selectedVideoRef1.current?.currentTime || 0,
                                selectedVideoRef2.current?.currentTime || 0
                              )
                            }
                            max={
                              Math.max(
                                selectedVideoRef1.current?.duration || 0,
                                selectedVideoRef2.current?.duration || 0
                              )
                            }
                            onChange={handleGlobalProgressBarChange}
                            style={{ width: "450px" }}
                          />
                          {/* <div>
                            <p style={{ margin: 0, marginLeft: "10px" }}>
                              {videoTime?.remainingTime1}
                            </p>{" "}
                          </div> */}
                        </div>
                      </>
                    )}
                </div>
              ) : null}

              {/* Timer  */}
              {isTraineeJoined &&
              <div
                id="sessionEndTime"
                style={{
                  position: "absolute",
                  top: width768 ? (!displayMsg?.msg ? "1%" : "10%") : "3%",
                  right: width768 ? "30%" : "-29%",
                  zIndex: 999,
                }}
              >
                <div
                  className="text-center"
                  style={{
                    display: "flex",
                    fontSize: "12px",
                    justifyContent: "center",
                    alignItems: "center",
                    flexDirection: 'column'
                  }}
                >
                  <h3>Time remaining</h3>
                  <h2 style={{ fontSize: "18px" }}>
                    {lessonTimeDisplay || "--:--"}
                  </h2>
                  {lessonStatusBanner && (
                    <p style={{ fontSize: "12px", marginTop: "4px" }}>
                      {lessonStatusBanner}
                    </p>
                  )}
                </div>
              </div>}

              {/* User Video 1 */}

              <div
                id="user-video-1"
                className={
                  !selectedClips.length &&
                    isPinned &&
                    ((accountType === AccountType.TRAINER &&
                      pinnedUser === "user-video-2") ||
                      (accountType === AccountType.TRAINEE &&
                        pinnedUser === "user-video-1"))
                    ? // pinnedUser === "user-video-2"
                    "scs2"
                    : !selectedClips.length &&
                      isPinned &&
                      // pinnedUser === "user-video-1"
                      ((accountType === AccountType.TRAINER &&
                        pinnedUser === "user-video-1") ||
                        (accountType === AccountType.TRAINEE &&
                          pinnedUser === "user-video-2"))
                      ? "switch-user-video w-auto"
                      : selectedClips.length &&
                        isPinned &&
                        selectedClips.length &&
                        ((accountType === AccountType.TRAINER &&
                          pinnedUser === "user-video-1") ||
                          (accountType === AccountType.TRAINEE &&
                            pinnedUser === "user-video-2"))
                        ? "switch-user-video w-auto"
                        : selectedClips?.length !== 0 && mediaQuery.matches
                          ? "scs"
                          : "switch-user-video w-auto"
                }
                style={{position:'relative'}}
                onClick={() => {
                  if (accountType === AccountType.TRAINER) {
                    if (pinnedUser === "user-video-1") {
                      emitVideoSelectEvent("swap", selectedClips, null);
                      setIsPinned(false);
                      setPinnedUser(null);
                    } else {
                      emitVideoSelectEvent("swap", selectedClips, "user-video-1");
                      setIsPinned(true);
                      setPinnedUser("user-video-1");
                    }
                  }
                }}
              >
                <video
                  ref={remoteVideoRef}
                  playsInline
                  autoPlay
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: "10px",
                  }}
                  id="end-user-video"
                />
                <div
                  style={{
                    position: "absolute",
                    top: "0",
                    left: "0",
                    right: "0",
                    bottom: "0",
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100%",
                    backgroundColor: "rgb(53,53,53)",
                    borderRadius: "10px",
                    display:
                      displayMsg?.msg || isRemoteVideoOff ? "flex" : "none",
                  }}
                >
                  {toUser?.profile_picture ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "5px",
                        justifyContent: "center",
                        alignItems: "center"
                      }}

                    >
                      <img
                        src={Utils.getImageUrlOfS3(toUser?.profile_picture)}
                        srcset=""
                        style={{
                          width: height < 500 ? "60px" : "100px",
                          height: height < 500 ? "60px" : "100px",
                          borderRadius:"5%"
                        }}
                      // className="container-raj"
                      />
                      <span style={{
                        color: "white"
                      }}>

                        {toUser?.fullname}
                      </span>
                    </div>
                  ) : (
                    <div
                      className="container-raj "
                      style={{
                        backgroundColor: Utils.charBasedColors(
                          Utils.capitalizeFirstChar(toUser.fullname)
                        ),
                      }}
                    >
                      <h1 className="text-box-raj">
                        {" "}
                        {getInitials(toUser?.fullname)}
                      </h1>
                    </div>
                  )}
                </div>
              </div>

              {/* User Video 2 */}

              <div
                id="user-video-2"
                className={
                  !selectedClips.length &&
                    isPinned &&
                    // pinnedUser === "user-video-2"
                    ((accountType === AccountType.TRAINER &&
                      pinnedUser === "user-video-2") ||
                      (accountType === AccountType.TRAINEE &&
                        pinnedUser === "user-video-1"))
                    ? "switch-user-video w-auto"
                    : selectedClips.length &&
                      isPinned &&
                      selectedClips.length &&
                      ((accountType === AccountType.TRAINER &&
                        pinnedUser === "user-video-2") ||
                        (accountType === AccountType.TRAINEE &&
                          pinnedUser === "user-video-1"))
                      ? "switch-user-video w-auto"
                      : mediaQuery.matches
                        ? "scs2"
                        : ""
                }
                onClick={() => {
                  if (accountType === AccountType.TRAINER) {
                    if (pinnedUser === "user-video-2") {
                      emitVideoSelectEvent("swap", selectedClips, null);
                      setIsPinned(false);
                      setPinnedUser(null);
                    } else {
                      emitVideoSelectEvent("swap", selectedClips, "user-video-2");
                      setIsPinned(true);
                      setPinnedUser("user-video-2");
                    }
                  }
                }}
              >
                <video
                  id="end-user-video"
                  playsInline
                  muted
                  // className="rounded "
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    borderRadius: "10px",
                  }}
                  ref={videoRef}
                  autoPlay
                />
                <div
                  style={{
                    position: "absolute",
                    top: "0%",
                    left: "0%",
                    right: "0%",
                    bottom: "0%",
                    width: "100%",
                    height: "100%",
                    display: isFeedStopped ? "flex" : "none",
                    justifyContent: "center",
                    alignItems: "center",
                    backgroundColor: "rgb(53,53,53)",
                    borderRadius: "10px",
                  }}
                >
                  {fromUser.profile_picture ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "5px",
                        justifyContent: "center",
                        alignItems: "center"
                      }}

                    >
                      <img
                        src={Utils.getImageUrlOfS3(fromUser?.profile_picture)}
                        srcset=""
                        style={{
                          width: height < 500 ? "60px" : "100px",
                          height: height < 500 ? "60px" : "100px",
                          borderRadius:"5%"
                        }}
                      // className="container-raj"
                      />
                      <span style={{
                        color: "white"
                      }}>

                        {fromUser?.fullname}
                      </span>
                    </div>
                  ) : (
                    <div
                      className="container-raj"
                      style={{
                        backgroundColor: Utils.charBasedColors(
                          Utils.capitalizeFirstChar(fromUser.fullname)
                        ),
                      }}
                    >
                      <h1 className="text-box-raj">
                        {" "}
                        {getInitials(fromUser.fullname)}
                      </h1>
                    </div>
                  )}
                </div>
              </div>

              {renderCallActionButtons()}
            </div>
          }

          <ReportModal
            currentReportData={{
              session: id,
              trainer: fromUser?._id,
              trainee: toUser?._id,
            }}
            isOpenReport={isOpenReport}
            setIsOpenReport={setIsOpenReport}
            screenShots={screenShots}
            setScreenShots={setScreenShots}
            // setScreenShots={setScreenShot}
            reportObj={reportObj}
            setReportObj={setReportObj}
            isClose={isClose}
            isTraineeJoined={isTraineeJoined}
            isCallEnded={isCallEnded}
          />

          <Modal isOpen={isModelOpen} centered>
            <ModalHeader style={{ textAlign: "center" }}>
              <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "600" }}>Recording</h2>
            </ModalHeader>
            <ModalBody style={{ textAlign: "center", padding: "1.5rem" }}>
              <p style={{ margin: "0 0 1.5rem 0", fontSize: "1rem", color: "#333" }}>
                Would you like to start recording this session?
              </p>
              <div style={{ display: "flex", justifyContent: "center", gap: "1rem", flexWrap: "wrap" }}>
                <Button
                  color="primary"
                  onClick={() => {
                    startRecording();
                    setIsModelOpen(false);
                  }}
                  style={{
                    backgroundColor: '#007bff',
                    borderColor: '#007bff',
                    color: '#ffffff',
                    minHeight: '44px',
                    padding: '0.75rem 1.5rem',
                    fontWeight: '600'
                  }}
                >
                  Start Recording
                </Button>
                <Button
                  color="secondary"
                  onClick={() => {
                    setIsModelOpen(false);
                  }}
                  style={{
                    backgroundColor: '#6c757d',
                    borderColor: '#6c757d',
                    color: '#ffffff',
                    minHeight: '44px',
                    padding: '0.75rem 1.5rem',
                    fontWeight: '600'
                  }}
                >
                  Cancel
                </Button>
              </div>
            </ModalBody>
          </Modal>
        </div>
        {isScreenShotModelOpen && (
          <ScreenShotDetails
            screenShotImages={screenShots}
            setScreenShotImages={setScreenShots}
            setIsOpenDetail={setIsScreenShotModelOpen}
            isOpenDetail={isScreenShotModelOpen}
            currentReportData={{
              session: id,
              trainer: fromUser?._id,
              trainee: toUser?._id,
            }}
            reportObj={reportObj}
          />
        )}

        <PermissionModal isOpen={permissionModal} />
      </React.Fragment>
    );
  }
};