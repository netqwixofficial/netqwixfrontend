import React, {
  useState,
  useEffect,
  useContext,
  useRef,
  useCallback,
  useMemo,
} from "react";
import "./index.scss";
import { AccountType } from "../../common/constants";
import "./action-buttons.scss";
import { EVENTS } from "../../../helpers/events";
import { SocketContext } from "../socket";
import OneOnOneCall from "./one-on-one-call";
import ClipModeCall from "./clip-mode";
import ActionButtons from "./action-buttons";
import { toast } from "react-toastify";
import { useAppSelector } from "../../store";
import { bookingsState } from "../common/common.slice";
import { pushProfilePhotoToS3 } from "../common/common.api";
import { getReport, screenShotTake } from "../videoupload/videoupload.api";
import html2canvas from "html2canvas";
import ReportModal from "../video/reportModal";
import CenterMessage from "../common/CenterMessage";
import {
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Nav,
  NavItem,
  NavLink,
  TabContent,
  TabPane,
} from "reactstrap";
import { CovertTimeAccordingToTimeZone, formatToHHMM, Utils } from "../../../utils/utils";
import {
  myClips,
  traineeClips,
} from "../../../containers/rightSidebar/fileSection.api";
import { X } from "react-feather";
import Notes from "../practiceLiveExperience/Notes";
import CustomModal from "../../common/modal";
import ScreenShotDetails from "../video/screenshotDetails";
import Timer from "../video/Timer";
import { sendCallDiagnostics } from "../video/callDiagnostics";
import { CallEngine } from "../video/callEngine";
import { startQualityMonitoring } from "../video/callQualityMonitor";
import { getTraineeClips } from "../NavHomePage/navHomePage.api";
import {
  getUserMedia,
  getDisplayMedia,
  getUserFriendlyError,
  retryWithBackoff,
  getOptimalVideoConstraints,
  checkBrowserCompatibility,
  hasGetUserMedia,
  hasRTCPeerConnection,
  enumerateDevices
} from "../../utils/webrtcCompatibility";
import PermissionModal from "../video/PermissionModal";
import ReactStrapModal from "../../common/modal";
import Ratings from "../bookings/ratings";
import TraineeRatings from "../bookings/ratings/trainee";
import { useMediaQuery } from "usehooks-ts";
import { updateExtendedSessionTime } from "../../common/common.api";
import { DateTime } from "luxon";


let Peer;
let timeoutId;




const VideoCallUI = ({
  id,
  isClose,
  accountType,
  traineeInfo,
  trainerInfo,
  session_end_time,
  session_start_time,
  extended_session_end_time,
  bIndex,
  isLandscape,
  time_zone
}) => {
  const fromUser =
    accountType === AccountType.TRAINEE ? traineeInfo : trainerInfo;
  const toUser =
    accountType === AccountType.TRAINEE ? trainerInfo : traineeInfo;

  const socket = useContext(SocketContext);
  const peerRef = useRef(null);
  const activeCallRef = useRef(null); // Track active call to prevent duplicates
  const isConnectingRef = useRef(false); // Prevent multiple simultaneous connection attempts
  const localVideoRef = useRef(null);
  const canvasRef = useRef(null);
  const canvasRef2 = useRef(null);
  const videoRef = useRef(null);
  const videoRef2 = useRef(null);
  const videoContainerRef = useRef(null);
  const videoContainerRef2 = useRef(null);

  const [isOpen, setIsOpen] = useState(false);
  const [isOpenConfirm, setIsOpenConfirm] = useState(false);
  const { startMeeting } = useAppSelector(bookingsState);
  const [selectedClips, setSelectedClips] = useState([]);
  const [isTraineeJoined, setIsTraineeJoined] = useState(false);
  const [bothUsersJoined, setBothUsersJoined] = useState(false);
  const [permissionModal, setPermissionModal] = useState(true);
  const [localStream, setLocalStream] = useState(null);
  const [displayMsg, setDisplayMsg] = useState({ show: false, msg: "" });
  const [remoteStream, setRemoteStream] = useState(null);
  const [micStream, setMicStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  // Remaining lesson time in seconds (used by TimeRemaining component)
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isShowVideos, setIsShowVideos] = useState(true);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isRemoteVideoOff, setRemoteVideoOff] = useState(false);
  const [isOpenReport, setIsOpenReport] = useState(false);
  const [isOpenRating, setIsOpenRating] = useState(false);

  const remoteVideoRef = useRef(null);
  const [isLockMode, setIsLockMode] = useState(false);
  const [clipSelectNote, setClipSelectNote] = useState(false);
  const [isLocalStreamOff, setIsLocalStreamOff] = useState(false);
  const [isRemoteStreamOff, setIsRemoteStreamOff] = useState(false);
  const [selectClips, setSelectClips] = useState([]);
  const [videoActiveTab, setAideoActiveTab] = useState("media");
  const [clips, setClips] = useState([]);
  const [traineeClip, setTraineeClips] = useState([]);
  const [isScreenShotModelOpen, setIsScreenShotModelOpen] = useState(false);
  const [screenShots, setScreenShots] = useState([]);
  const [currentScreenShot, setCurrentScreenshot] = useState("")
  const [reportObj, setReportObj] = useState({ title: "", topic: "" });
  const [isCallEnded, setIsCallEnded] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [errorMessageForPermission, setErrorMessageForPermission] = useState("Kindly allow us access to your camera and microphone.")
  const [userAlreadyInCall, setUserAlreadyInCall] = useState(false)
  const [isModelOpen, setIsModelOpen] = useState(false);
  const [isConfirmModelOpen, setIsConfirmModelOpen] = useState(false);
  const [showScreenshotButton, setShowScreenshotButton] = useState(false)
  const [isSessionExtended, setIsSessionExtended] = useState(false);
  // Session end time in HH:MM (authoritative end-time based on booking/extension)
  const [sessionEndTime, setSessionEndTime] = useState(null);
  const [showGracePeriodModal, setShowGracePeriodModal] = useState(false);
  const [showSessionEndedModal, setShowSessionEndedModal] = useState(false);
  const [show30SecondWarning, setShow30SecondWarning] = useState(false);
  const [countdownMessage, setCountdownMessage] = useState("");
  const [remainingSeconds, setRemainingSeconds] = useState(30);
  const gracePeriodModalDismissedRef = useRef(false);
  const sessionEndedModalDismissedRef = useRef(false);
  const warning30SecondIntervalRef = useRef(null);
  const [lockPoint, setLockPoint] = useState(0);
  const callEngineRef = useRef(null);
  const [preflightDone, setPreflightDone] = useState(false);
  const [preflightPassed, setPreflightPassed] = useState(false);
  const [callState, setCallState] = useState("idle"); // idle | connecting | connected | reconnecting | failed | ended
  const qualityMonitorIntervalRef = useRef(null);

  // Authoritative lesson timer (backend-driven)
  const lessonTimerIntervalRef = useRef(null);
  const [authoritativeTimer, setAuthoritativeTimer] = useState(null);

  const netquixVideos = [
    {
      _id: "656acd81cd2d7329ed0d8e91",
      title: "Dog Activity",
      category: "Acting",
      user_id: "6533881d1e8775aaa25b3b6e",
      createdAt: "2023-12-02T06:24:01.995Z",
      updatedAt: "2023-12-02T06:24:01.995Z",
      file_name: "1717589251977.mp4",
      __v: 0,
    },
    {
      _id: "657053c4c440a4d0d775e639",
      title: "Pupppy clip",
      category: "Golf",
      user_id: "64ad7aae6d668be38e53be1b",
      createdAt: "2023-12-06T10:58:12.080Z",
      updatedAt: "2023-12-06T10:58:12.080Z",
      file_name: "1718140110745.quicktime",
      __v: 0,
    },
  ];

  useEffect(() => {
    if (isOpen) {
      getMyClips();
    }
  }, [isOpen]);

  // Pre-call compatibility & permissions check
  const runPreflightCheck = useCallback(async () => {
    if (preflightDone) return;

    try {
      if (typeof window === "undefined" || typeof navigator === "undefined") {
        toast.error("Calling is only supported in a browser environment.");
        setPreflightDone(true);
        setPreflightPassed(false);
        if (socket && id) {
          socket.emit("CLIENT_PRECALL_CHECK", {
            sessionId: id,
            role: accountType === AccountType.TRAINER ? "trainer" : "trainee",
            passed: false,
            reason: "NO_BROWSER_ENV",
          });
        }
        return;
      }

      // Check browser compatibility using utility
      const compatibility = checkBrowserCompatibility();
      if (!compatibility.supported) {
        const errorMsg = compatibility.errors.join(' ') || 'Your browser does not support video calls.';
        setPermissionModal(true);
        setErrorMessageForPermission(errorMsg);
        setPreflightDone(true);
        setPreflightPassed(false);
        if (socket && id) {
          socket.emit("CLIENT_PRECALL_CHECK", {
            sessionId: id,
            role: accountType === AccountType.TRAINER ? "trainer" : "trainee",
            passed: false,
            reason: !hasRTCPeerConnection() ? "NO_RTCPeerConnection" : "NO_GETUSERMEDIA",
          });
        }
        return;
      }

      if (!hasRTCPeerConnection()) {
        setPermissionModal(true);
        setErrorMessageForPermission(
          "Your browser does not support video calls. Please use the latest version of Chrome, Safari, Firefox, or Edge."
        );
        setPreflightDone(true);
        setPreflightPassed(false);
        if (socket && id) {
          socket.emit("CLIENT_PRECALL_CHECK", {
            sessionId: id,
            role: accountType === AccountType.TRAINER ? "trainer" : "trainee",
            passed: false,
            reason: "NO_RTCPeerConnection",
          });
        }
        return;
      }

      if (!hasGetUserMedia()) {
        setPermissionModal(true);
        setErrorMessageForPermission(
          "Your device does not expose camera/microphone controls required for video calls."
        );
        setPreflightDone(true);
        setPreflightPassed(false);
        if (socket && id) {
          socket.emit("CLIENT_PRECALL_CHECK", {
            sessionId: id,
            role: accountType === AccountType.TRAINER ? "trainer" : "trainee",
            passed: false,
            reason: "NO_MEDIA_DEVICES",
          });
        }
        return;
      }

      const devices = await enumerateDevices();
      const cameraDevices = devices.filter((d) => d.kind === "videoinput");
      const micDevices = devices.filter((d) => d.kind === "audioinput");

      if (cameraDevices.length === 0) {
        setPermissionModal(true);
        setErrorMessageForPermission(
          "No camera device detected. Please connect or enable a camera before joining the session."
        );
        setPreflightDone(true);
        setPreflightPassed(false);
        if (socket && id) {
          socket.emit("CLIENT_PRECALL_CHECK", {
            sessionId: id,
            role: accountType === AccountType.TRAINER ? "trainer" : "trainee",
            passed: false,
            reason: "NO_CAMERA",
          });
        }
        return;
      }

      if (micDevices.length === 0) {
        setPermissionModal(true);
        setErrorMessageForPermission(
          "No microphone detected. Please connect or enable a microphone before joining the session."
        );
        setPreflightDone(true);
        setPreflightPassed(false);
        if (socket && id) {
          socket.emit("CLIENT_PRECALL_CHECK", {
            sessionId: id,
            role: accountType === AccountType.TRAINER ? "trainer" : "trainee",
            passed: false,
            reason: "NO_MICROPHONE",
          });
        }
        return;
      }

      // Permissions API is not available everywhere, so treat errors as "we'll prompt later"
      try {
        if (navigator.permissions && navigator.permissions.query) {
          const [cameraPerm, micPerm] = await Promise.allSettled([
            navigator.permissions.query({ name: "camera" }),
            navigator.permissions.query({ name: "microphone" }),
          ]);

          const camState =
            cameraPerm.status === "fulfilled" ? cameraPerm.value.state : "prompt";
          const micState =
            micPerm.status === "fulfilled" ? micPerm.value.state : "prompt";

          if (camState === "denied" && micState === "denied") {
            setPermissionModal(true);
            setErrorMessageForPermission(
              "Camera and microphone permissions are blocked. Please enable them in your browser settings and reload."
            );
            setPreflightDone(true);
            setPreflightPassed(false);
            if (socket && id) {
              socket.emit("CLIENT_PRECALL_CHECK", {
                sessionId: id,
                role: accountType === AccountType.TRAINER ? "trainer" : "trainee",
                passed: false,
                reason: "PERMISSIONS_BLOCKED",
              });
            }
            return;
          }
        }
      } catch (err) {
        // Ignore permissions API errors; we'll handle actual denial in handleStartCall
        console.warn("[VideoCallUI] Preflight permissions check failed, continuing:", err);
      }

      setPreflightDone(true);
      setPreflightPassed(true);
      if (socket && id) {
        socket.emit("CLIENT_PRECALL_CHECK", {
          sessionId: id,
          role: accountType === AccountType.TRAINER ? "trainer" : "trainee",
          passed: true,
          reason: "OK",
        });
      }
    } catch (err) {
      console.error("[VideoCallUI] Preflight check error:", err);
      toast.error("We couldn't verify your device for video calling. Please try again.");
      setPreflightDone(true);
      setPreflightPassed(false);
      if (socket && id) {
        socket.emit("CLIENT_PRECALL_CHECK", {
          sessionId: id,
          role: accountType === AccountType.TRAINER ? "trainer" : "trainee",
          passed: false,
          reason: "UNKNOWN_ERROR",
        });
      }
    }
  }, [preflightDone, socket, id, accountType]);

  // Step 1: Emit lightweight diagnostics once per session to understand
  // real-world environments (browser/OS/WebRTC support/network hints)
  // without changing existing call behavior.
  const hasSentDiagnosticsRef = useRef(false);

  useEffect(() => {
    if (!socket || !id || hasSentDiagnosticsRef.current) return;

    sendCallDiagnostics({
      socket,
      sessionId: id,
      role: accountType === AccountType.TRAINER ? "trainer" : "trainee",
    });

    hasSentDiagnosticsRef.current = true;
  }, [socket, id, accountType]);

  // Add this function to extend the session time
  const extendSessionTime = async () => {
    try {
      // Validate required props before proceeding
      if (!session_start_time || !session_end_time || !id) {
        console.warn("Cannot extend session: missing required time information", {
          session_start_time,
          session_end_time,
          id
        });
        return;
      }

      // Parse session start time with validation
      if (typeof session_start_time !== 'string' || !session_start_time.includes(':')) {
        console.error("Invalid session_start_time format:", session_start_time);
        return;
      }

      const startTimeParts = session_start_time.split(':');
      if (startTimeParts.length !== 2) {
        console.error("Invalid session_start_time format:", session_start_time);
        return;
      }

      const [startHours, startMinutes] = startTimeParts.map(Number);
      
      if (isNaN(startHours) || isNaN(startMinutes) || startHours < 0 || startHours > 23 || startMinutes < 0 || startMinutes > 59) {
        console.error("Invalid session_start_time values:", { startHours, startMinutes });
        return;
      }

      // Parse session end time with validation
      if (typeof session_end_time !== 'string' || !session_end_time.includes(':')) {
        console.error("Invalid session_end_time format:", session_end_time);
        return;
      }

      const endTimeParts = session_end_time.split(':');
      if (endTimeParts.length !== 2) {
        console.error("Invalid session_end_time format:", session_end_time);
        return;
      }

      const [endHours, endMinutes] = endTimeParts.map(Number);
      
      if (isNaN(endHours) || isNaN(endMinutes) || endHours < 0 || endHours > 23 || endMinutes < 0 || endMinutes > 59) {
        console.error("Invalid session_end_time values:", { endHours, endMinutes });
        return;
      }

      // Create Date object for session_start_time
      const now = new Date();
      const startTime = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        startHours,
        startMinutes
      );

      // Create Date object for current time
      const currentTime = new Date();

      // Calculate difference between current time and session start time
      const timeElapsed = currentTime - startTime;

      if (timeElapsed < 0) {
        console.warn("Current time is before the session start time. Cannot extend.");
        return;
      }

      // Create Date object for session end time
      const endTime = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        endHours,
        endMinutes
      );

      // Add the time elapsed to session end time
      const newEndTime = new Date(endTime.getTime() + timeElapsed);

      // Validate newEndTime
      if (isNaN(newEndTime.getTime())) {
        console.error("Invalid newEndTime calculated:", newEndTime);
        return;
      }

      // Format new end time to HH:MM
      const newEndHours = String(newEndTime.getHours()).padStart(2, '0');
      const newEndMinutes = String(newEndTime.getMinutes()).padStart(2, '0');
      const newEndTimeStr = `${newEndHours}:${newEndMinutes}`;

      // Use DateTime from luxon to format ISO string
      let testEndTime;
      try {
        const newTestEndTime = DateTime.fromJSDate(newEndTime);
        
        if (!newTestEndTime.isValid) {
          console.error("Invalid DateTime created from newEndTime:", newEndTime);
          return;
        }

        testEndTime = newTestEndTime.toISO({
          suppressMilliseconds: false,
          includeOffset: false,
        }) + "Z";
      } catch (luxonError) {
        console.error("Error creating DateTime:", luxonError);
        // Fallback to manual ISO string creation
        testEndTime = newEndTime.toISOString();
      }

      // Update local display of session_end_time for UI purposes
      setSessionEndTime(newEndTimeStr);

      // Notify backend about the requested extension; backend remains in full
      // control of the actual lesson timer and will emit updated timing info.
      await updateExtendedSessionTime({
        sessionId: id,
        extendedEndTime: testEndTime,
        extended_session_end_time: newEndTimeStr,
      });
       
    } catch (error) {
      console.error("Error extending session time:", error);
      // Show user-friendly error message
      toast.error("Failed to extend session time. Please try again.", {
        autoClose: 3000,
      });
    }
  };


  const getMyClips = async () => {
    try {
      // Validate traineeInfo before proceeding
      if (!traineeInfo || !traineeInfo._id) {
        console.warn("Cannot get clips: traineeInfo is missing");
        return;
      }

      var res = await myClips({});
      setClips(res?.data);
      var trainee_clips = await myClips({ trainee_id: traineeInfo._id });

      let sharedClips = [];
      var arr = trainee_clips?.data || [];
      let res3 = await traineeClips({});
      const clipsSharedByTrainee = res3?.data || [];
     
      for (let index = 0; index < clipsSharedByTrainee?.length; index++) {
        if (clipsSharedByTrainee[index]?._id?._id === traineeInfo._id) {
          clipsSharedByTrainee[index]?.clips?.map((clip) => {
            // Check if the current clip's _id matches the given id
            if (clip?._id === id && clip?.clips?._id) {
              // Add the extra field 'duringSession' to the clip
              sharedClips.push(clip.clips._id);
            }
            // return clip; // Return the modified or unmodified clip
          });
        }
      }

      arr[0]?.clips?.forEach(item => {
        if (sharedClips.includes(item._id)) {
          item.duringSession = true; // Add the duringSession field with value `true`
        } else {
          item.duringSession = false; // Optionally, you can set it to false or leave it undefined
        }
      });

      setTraineeClips(arr);
    } catch (error) {
      console.error("Error getting clips:", error);
      toast.error("Failed to load clips. Please try again.", {
        autoClose: 3000,
      });
    }
  };

  // Define cleanupFunction early (needed by cutCall)
  function handlePeerDisconnect() {
    try {
      // Clean up active call
      if (activeCallRef.current?.call) {
        try {
          activeCallRef.current.call.close();
        } catch (error) {
          console.error('[VideoCall] Error closing call in handlePeerDisconnect:', error);
        }
        activeCallRef.current = null;
      }
      isConnectingRef.current = false;

      if (!(peerRef && peerRef.current)) return;
      //NOTE -  manually close the peer connections
      for (let conns in peerRef.current.connections) {
        peerRef.current.connections[conns].forEach((conn, index, array) => {
          conn.peerConnection.close();
          //NOTE - close it using peerjs methods
          if (conn.close) conn.close();
        });
      }
    } catch (error) {
      console.error('[VideoCall] Error in handlePeerDisconnect:', error);
    }
  }

  const cleanupFunction = useCallback(() => {
    if (!userAlreadyInCall) {
      handlePeerDisconnect();
    }
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
    let videorefSrc = localVideoRef.current;
    if (localVideoRef && videorefSrc && videorefSrc.srcObject) {
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

    // Reset connection state
    activeCallRef.current = null;
    isConnectingRef.current = false;
  }, [localStream, remoteStream, micStream, userAlreadyInCall]);

  // Define cutCall early using useCallback so it can be used in useEffect hooks
  const cutCall = useCallback((manually) => {
    try {
      // Stop quality monitoring
      if (qualityMonitorIntervalRef.current) {
        clearInterval(qualityMonitorIntervalRef.current);
        qualityMonitorIntervalRef.current = null;
      }

      // Clean up active call
      if (activeCallRef.current?.call) {
        try {
          activeCallRef.current.call.close();
        } catch (error) {
          console.error('[VideoCall] Error closing call:', error);
        }
        activeCallRef.current = null;
      }
      isConnectingRef.current = false;
      setCallState("ended");

      if (!userAlreadyInCall && socket) {
        socket.emit(EVENTS.VIDEO_CALL.ON_CLOSE, {
          userInfo: { from_user: fromUser._id, to_user: toUser._id }
        });
      }
    } catch (error) {
      console.error('[VideoCall] Error in cutCall:', error);
    }

    // Show session ended modal if not already shown
    if (!showSessionEndedModal && manually) {
      setShowSessionEndedModal(true);
    } else {
      cleanupFunction();
      if (AccountType.TRAINER === accountType) {
        setIsOpenReport(true);
      } else if (accountType === AccountType.TRAINEE) {
        setIsOpenRating(true);
      }
    }
  }, [socket, userAlreadyInCall, fromUser, toUser, showSessionEndedModal, accountType, cleanupFunction]);

  // Set up socket event listeners with null checks
  useEffect(() => {
    if (!socket) return;

    const handleVideoSelect = ({ videos, type }) => {
      if (type === "clips") {
        // Handle both empty array and array with clips
        // Empty array means exit clip mode and return to default camera view
        const newClips = Array.isArray(videos) ? [...videos] : [];
        setSelectedClips(newClips);
        
        // Clear annotations when switching between clip mode and default mode
        // This ensures clean state when mode changes
        if (socket && fromUser?._id && toUser?._id) {
          socket.emit(EVENTS.ON_CLEAR_CANVAS, {
            userInfo: { from_user: fromUser._id, to_user: toUser._id },
            canvasIndex: 1, // Clear canvas when mode changes
          });
        }
      }
    };

    const handleCallEnd = () => {
      if (accountType === AccountType.TRAINEE) {
        cutCall();
        setIsOpenRating(true);
      }
    };

    socket.on(EVENTS.ON_VIDEO_SELECT, handleVideoSelect);
    socket.on(EVENTS.CALL_END, handleCallEnd);

    return () => {
      if (socket) {
        socket.off(EVENTS.ON_VIDEO_SELECT, handleVideoSelect);
        socket.off(EVENTS.CALL_END, handleCallEnd);
      }
    };
  }, [socket, accountType, cutCall]);

  // Listen for LESSON_TIME_WARNING event (30 seconds remaining)
  // Backend emits this when exactly 30 seconds remain in the session
  useEffect(() => {
    if (!socket) return;

    const handleLessonTimeWarning = ({ sessionId, remainingSeconds: secondsRemaining }) => {
      if (sessionId !== id) return;
      
      // Show 30-second warning modal
      setRemainingSeconds(secondsRemaining);
      setShow30SecondWarning(true);
      
      // Start countdown timer
      if (warning30SecondIntervalRef.current) {
        clearInterval(warning30SecondIntervalRef.current);
      }
      
      warning30SecondIntervalRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            if (warning30SecondIntervalRef.current) {
              clearInterval(warning30SecondIntervalRef.current);
              warning30SecondIntervalRef.current = null;
            }
            setShow30SecondWarning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      // Also show toast as backup notification
      toast.warning(
        `Only ${secondsRemaining} seconds remaining in this lesson.`,
      );
    };

    socket.on("LESSON_TIME_WARNING", handleLessonTimeWarning);

    return () => {
      if (socket) {
        socket.off("LESSON_TIME_WARNING", handleLessonTimeWarning);
      }
      if (warning30SecondIntervalRef.current) {
        clearInterval(warning30SecondIntervalRef.current);
        warning30SecondIntervalRef.current = null;
      }
    };
  }, [socket, id]);

  // Listen for LESSON_TIME_ENDED event - session time is up
  // Backend emits this when the session duration has elapsed
  useEffect(() => {
    if (!socket) return;

    const handleLessonTimeEnded = ({ sessionId }) => {
      if (sessionId !== id) return;

      // Stop the timer interval
      if (lessonTimerIntervalRef.current) {
        clearInterval(lessonTimerIntervalRef.current);
        lessonTimerIntervalRef.current = null;
      }

      // Update timer state to show 0 remaining
      setAuthoritativeTimer((prev) =>
        prev && prev.sessionId === sessionId
          ? { ...prev, remainingSeconds: 0 }
          : prev
      );

      toast.info("Lesson time has ended.");
      
      // End the call when backend declares time over
      cutCall(true);
    };

    socket.on("LESSON_TIME_ENDED", handleLessonTimeEnded);

    return () => {
      if (socket) {
        socket.off("LESSON_TIME_ENDED", handleLessonTimeEnded);
      }
    };
  }, [socket, id, cutCall]);

  // NOTE: LESSON_TIME_WARNING and LESSON_TIME_ENDED handlers are set up in useEffect hooks above
  // Duplicate handlers have been removed to prevent duplicate registrations

  //NOTE - separate funtion for emit seelcted clip videos  and using same even for swapping the videos
  const emitVideoSelectEvent = (type, videos) => {
    if (socket && fromUser?._id && toUser?._id) {
      socket.emit(EVENTS.ON_VIDEO_SELECT, {
        userInfo: { from_user: fromUser._id, to_user: toUser._id },
        type,
        videos: videos || [],
      });
    }
  };

  //NOTE - emit event after selecting the clips
  useEffect(() => {
    // Emit event whenever selectedClips changes (including when it becomes empty)
    emitVideoSelectEvent("clips", selectedClips);
  }, [selectedClips?.length, socket, fromUser?._id, toUser?._id]);

  // Prefill selectedClips from booking data when meeting starts.
  // This ensures that clips pre-shared by the trainee (via dashboard/booking)
  // automatically appear in clip mode for BOTH trainer and trainee when they join.
  useEffect(() => {
    const bookingClips = startMeeting?.trainee_clip;

    if (Array.isArray(bookingClips) && bookingClips.length > 0) {
      // Only auto-fill from booking if we don't already have clips selected.
      // This prevents overwriting clips that were chosen live during the call.
      if (!selectedClips || selectedClips.length === 0) {
        setSelectedClips(bookingClips);
      }
    }
  }, [startMeeting?.trainee_clip, selectedClips?.length]);

   

  async function afterSucessUploadImageOnS3() {
    var result = await getReport({
      sessions: id,
      trainer: fromUser?._id,
      trainee: toUser?._id,
    });
    setScreenShots(result?.data?.reportData);
    setCurrentScreenshot(result?.data?.reportData[result?.data?.reportData?.length - 1]?.imageUrl)
  }
  const [isLoading, setIsLoading] = useState(false)

  const extractCroppedFrame = (videoRef, videoContainerRef, drawingCanvasRef) => {
    try {
      const video = videoRef.current;
      const videoContainer = videoContainerRef.current;

      if (!video || !videoContainer) return;

      // Get dimensions
      const containerRect = videoContainer.getBoundingClientRect();
      const videoRect = video.getBoundingClientRect();

      // Calculate visible portion in screen coordinates
      const visibleX = Math.max(containerRect.left, videoRect.left);
      const visibleY = Math.max(containerRect.top, videoRect.top);
      const visibleRight = Math.min(containerRect.right, videoRect.right);
      const visibleBottom = Math.min(containerRect.bottom, videoRect.bottom);

      const visibleWidth = visibleRight - visibleX;
      const visibleHeight = visibleBottom - visibleY;

      if (visibleWidth <= 0 || visibleHeight <= 0) {
         
        return;
      }

      // Calculate scaling factors (video might be scaled to fit its container)
      const videoScaleX = video.videoWidth / videoRect.width;
      const videoScaleY = video.videoHeight / videoRect.height;

      // Convert screen coordinates to video coordinates
      const sourceX = (visibleX - videoRect.left) * videoScaleX;
      const sourceY = (visibleY - videoRect.top) * videoScaleY;
      const sourceWidth = visibleWidth * videoScaleX;
      const sourceHeight = visibleHeight * videoScaleY;

      // Create canvas matching the container size
      const canvas = document.createElement('canvas');
      canvas.width = containerRect.width;
      canvas.height = containerRect.height;

      const ctx = canvas.getContext("2d");

      // Fill background (white or transparent)
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Calculate position relative to container
      const destX = visibleX - containerRect.left;
      const destY = visibleY - containerRect.top;

      // Draw the video portion at its original position in the container
      ctx.drawImage(
        video,
        sourceX, sourceY,           // Source coordinates (in video pixels)
        sourceWidth, sourceHeight,  // Source dimensions (in video pixels)
        destX, destY,               // Destination coordinates (relative to container)
        visibleWidth, visibleHeight // Destination dimensions (matches screen visible area)
      );

      return mergeCanvases(canvas, drawingCanvasRef);

    } catch (error) {
       
      return null;
    }
  };

  const mergeCanvases = (croppedCanvas, drawingCanvasRef) => {
    try {
      const drawingCanvas = drawingCanvasRef.current;

      if (!croppedCanvas || !drawingCanvas) return null;

      // Determine the final dimensions (use the larger of each dimension)
      const finalWidth = Math.max(croppedCanvas.width, drawingCanvas.width);
      const finalHeight = Math.max(croppedCanvas.height, drawingCanvas.height);

      // Create a new canvas for the cropped image (handling size differences)
      const adjustedCroppedCanvas = document.createElement('canvas');
      adjustedCroppedCanvas.width = finalWidth;
      adjustedCroppedCanvas.height = finalHeight;
      const adjustedCtx = adjustedCroppedCanvas.getContext('2d');

      // Fill with white background (or transparent if you prefer)
      adjustedCtx.fillStyle = 'white';
      adjustedCtx.fillRect(0, 0, finalWidth, finalHeight);

      // Calculate offsets for centering the cropped canvas if it's smaller
      const xOffset = croppedCanvas.width < finalWidth
        ? (finalWidth - croppedCanvas.width) / 2
        : 0;

      const yOffset = croppedCanvas.height < finalHeight
        ? (finalHeight - croppedCanvas.height) / 2
        : 0;

      // Draw the cropped canvas centered if smaller than final dimensions
      adjustedCtx.drawImage(
        croppedCanvas,
        xOffset,
        yOffset,
        croppedCanvas.width,
        croppedCanvas.height
      );

      // Create the final merged canvas
      const mergedCanvas = document.createElement('canvas');
      mergedCanvas.width = finalWidth;
      mergedCanvas.height = finalHeight;
      const ctx = mergedCanvas.getContext('2d');

      // First draw the adjusted cropped frame
      ctx.drawImage(adjustedCroppedCanvas, 0, 0);

      // Then draw the drawing canvas on top
      ctx.drawImage(drawingCanvas, 0, 0);

      return mergedCanvas;
    } catch (error) {
      console.error("Error in mergeCanvases:", error);
      return null;
    }
  };

  const takeScreenshot = async () => {
    try {
      setIsLoading(true);
      setCurrentScreenshot("");
      setIsScreenShotModelOpen(false);

      // Ensure video posters are shown before taking the screenshot
      const videos = document.querySelectorAll("#video-container video");
      videos.forEach(video => {
        // Ensure each video is briefly played to trigger poster image rendering
        if (!video.paused) return;  // Skip if video is already playing
        video.play();
        video.pause();
      });

      setTimeout(async () => {
        let targetElement = document.getElementById("clip-container");
        if (!targetElement) {
          targetElement = document.body;
        }
        // Select only elements with the class "hide-in-screenshot"
        const elementsToHide = Array.from(
          targetElement.getElementsByClassName("hide-in-screenshot")
        );

        // Hide selected elements
        elementsToHide.forEach((el) => (el.style.visibility = "hidden"));

        const croppedCanvas1 = extractCroppedFrame(videoRef, videoContainerRef, canvasRef);
        const croppedCanvas2 = videoRef2 && videoContainerRef2 && canvasRef2
          ? extractCroppedFrame(videoRef2, videoContainerRef2, canvasRef2)
          : null;

        if (!croppedCanvas1) {
          console.error("Could not create the cropped frame");
          return null;
        }

        let finalCanvas;

        if (croppedCanvas2) {
          // Create final canvas (vertical stack) when both videos exist
          finalCanvas = document.createElement('canvas');
          const finalWidth = Math.max(croppedCanvas1.width, croppedCanvas2.width);
          const finalHeight = croppedCanvas1.height + croppedCanvas2.height;
          finalCanvas.width = finalWidth;
          finalCanvas.height = finalHeight;

          const ctx = finalCanvas.getContext('2d');

          // Draw first canvas (centered horizontally)
          ctx.drawImage(
            croppedCanvas1,
            (finalWidth - croppedCanvas1.width) / 2, 0
          );

          // Draw second canvas below first one (centered horizontally)
          ctx.drawImage(
            croppedCanvas2,
            (finalWidth - croppedCanvas2.width) / 2, croppedCanvas1.height
          );
        } else {
          // Use only the first canvas if second video doesn't exist
          finalCanvas = croppedCanvas1;
        }

        // Create a new canvas to add watermark and copyright
        const watermarkedCanvas = document.createElement('canvas');
        watermarkedCanvas.width = finalCanvas.width;
        watermarkedCanvas.height = finalCanvas.height;
        const watermarkedCtx = watermarkedCanvas.getContext('2d');

        // Draw the original content first
        watermarkedCtx.drawImage(finalCanvas, 0, 0);

        // Add NetQuix logo at top left
        const logoImg = new Image();
        logoImg.src = "/assets/images/netquix_logo_beta.png";
        await new Promise((resolve) => {
          logoImg.onload = resolve;
        });

        const logoWidth = 100; // Scale based on canvas width
        const logoHeight = 35; // Scale based on canvas height
        const logoPadding = 5;

        watermarkedCtx.drawImage(
          logoImg,
          logoPadding + 5,
          logoPadding,
          logoWidth,
          logoHeight
        );

        // Add copyright text at bottom right
        watermarkedCtx.font = `16px Arial`;
        watermarkedCtx.fillStyle = "gray";
        watermarkedCtx.textAlign = "right";

        const copyrightText = "©NetQwix.com";
        const textPadding = 10;
        const textY = watermarkedCanvas.height - 10;

        watermarkedCtx.fillText(
          copyrightText,
          watermarkedCanvas.width - textPadding,
          textY
        );

        const dataUrl = watermarkedCanvas.toDataURL("image/png");
         
        // Restore visibility of hidden elements
        elementsToHide.forEach((el) => (el.style.visibility = "visible"));

        var res = await screenShotTake({
          sessions: id,
          trainer: fromUser?._id,
          trainee: toUser?._id,
        });

        const response = await fetch(dataUrl);
        const blob = await response.blob();

        if (!blob) {
          return toast.error("Unable to take Screen Shot");
        }

        if (res?.data?.url) {
          setIsScreenShotModelOpen(true);
          await pushProfilePhotoToS3(
            res?.data?.url,
            blob,
            null,
            afterSucessUploadImageOnS3
          );
          toast.success("The screenshot taken successfully.", {
            type: "success",
          });
        }
      }, 1000);
    } catch (error) {
       
    } finally {
      setIsLoading(false);
    }
  };

   
   
  const handleStartCall = async () => {
    try {
      setCallState("connecting");

      const checkIPVersion = async () => {
        try {
          const res = await fetch("https://api64.ipify.org?format=json");
          const data = await res.json();
          const ipAddress = data.ip;
          const isIPv6 = ipAddress.includes(":");
          toast.success(`You are using ${isIPv6 ? 'IPv6' : 'IPv4'}.`);
        } catch (error) {
          console.error("Error fetching IP version:", error);
          toast.error("Failed to determine IP version.");
        }
      };

      checkIPVersion();
      // Check permissions for camera and microphone
      const cameraPermission = await navigator.permissions.query({ name: 'camera' });
      const micPermission = await navigator.permissions.query({ name: 'microphone' });

      // Handle camera and mic permission states
      if (cameraPermission.state === 'denied' && micPermission.state === 'denied') {
        setPermissionModal(true);
        setErrorMessageForPermission("Kindly allow us access to your camera and microphone.");
        return;
      }

      if (cameraPermission.state === 'denied') {
        setPermissionModal(true);
        setErrorMessageForPermission("Camera permission is denied. Please enable camera for video call.");
        return;
      }

      if (micPermission.state === 'denied') {
        setPermissionModal(true);
        setErrorMessageForPermission("Microphone permission is denied. Please enable microphone for video call.");
        return;
      }

      // Check if any camera or microphone device is connected
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameraDevices = devices.filter(device => device.kind === 'videoinput');
      const micDevices = devices.filter(device => device.kind === 'audioinput');

      // Handle the case where no camera or microphone is connected
      if (cameraDevices.length === 0) {
        setPermissionModal(true);
        setErrorMessageForPermission("No camera device detected. Please connect a camera.");
        return;
      }

      if (micDevices.length === 0) {
        setPermissionModal(true);
        setErrorMessageForPermission("No microphone device detected. Please connect a microphone.");
        return;
      }

      // If permissions are granted, proceed with starting the call
      // Use optimal constraints based on device capabilities
      const optimalConstraints = getOptimalVideoConstraints();
      const stream = await retryWithBackoff(
        () => getUserMedia(optimalConstraints),
        3,
        1000
      );

      setPermissionModal(false);
      setLocalStream(stream);
      setDisplayMsg({
        show: true,
        msg: `Waiting for ${toUser?.fullname} to join...`,
      });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Handle socket disconnect or errors after initial connection
      if (!socket) {
        console.error('[VideoCallUI] Socket is not available when starting call');
        toast.error("Unable to connect to the server. Please refresh the page and try again.");
        return;
      }

      socket.on('disconnect', (reason) => {
        toast.error("You have been disconnected from the server. Attempting to reconnect...");
        setCallState((prev) => (prev === "ended" ? prev : "reconnecting"));
      });

      socket.on('connect_error', (err) => {
        console.error('Socket connect error:', err);
        toast.error("Socket connection error occurred. Please try again later.");
        // Handle reconnection or other recovery mechanisms
      });

      socket.on('reconnect_error', (err) => {
        console.error('Socket reconnect error:', err);
        toast.error("Unable to reconnect to the server. Please try again later.");
      });

      socket.on('reconnect_failed', () => {
        toast.error("Reconnection to the server failed. Please check your internet and try again.");
      });

      socket.on('connect', () => {
        // If we were in a reconnecting state and still have an active peer,
        // re-emit ON_CALL_JOIN so backend can re-bind this socket to the session room.
        if (callState === "reconnecting" && peerRef.current && fromUser && toUser && id) {
          socket.emit("ON_CALL_JOIN", {
            userInfo: {
              from_user: fromUser._id,
              to_user: toUser._id,
              sessionId: id,
              peerId: peerRef.current.id,
            },
          });
          setCallState("connecting");
        }
      });

      // Start heartbeat: emit every 10 seconds to prove we're alive
      const heartbeatInterval = setInterval(() => {
        if (socket && socket.connected) {
          socket.emit("HEARTBEAT");
        }
      }, 10000);

      // Cleanup heartbeat on unmount
      return () => {
        clearInterval(heartbeatInterval);
      };

      // Initialize CallEngine wrapper around PeerJS so we centralize
      // Peer config, error handling and connection timeouts.
      const engine = new CallEngine({
        PeerLib: Peer,
        socket,
        fromUser,
        toUser,
        sessionId: id,
        startMeeting,
      });
      callEngineRef.current = engine;

      // Mark that we're attempting to connect and set up a safety timeout
      // so "stuck" connections surface clearly to the user instead of hanging.
      engine.isConnecting = true;
      engine.setupConnectionTimeout({
        timeoutMs: 20000,
        onTimeout: () => {
          engine.isConnecting = false;
          engine.cleanup();
          setDisplayMsg({
            show: true,
            msg: "We could not establish the call. Please check your connection and try rejoining.",
          });
        },
      });

      const peer = engine.initPeerAndSignal({ localStream: stream });
      peerRef.current = peer;

      // Keep track of the underlying PeerJS call so existing logic continues to work.
      peer.on("call", (call) => {
        try {
          // Track incoming call
          if (activeCallRef.current?.call && activeCallRef.current.call !== call) {
            // Close previous call if exists
            try {
              activeCallRef.current.call.close();
            } catch (error) {
              console.error('[VideoCall] Error closing previous call:', error);
            }
          }

          activeCallRef.current = { call, peer: call.peer };
          isConnectingRef.current = false;
          if (callEngineRef.current) {
            callEngineRef.current.isConnecting = false;
            callEngineRef.current.clearConnectionTimeout();
          }

          call.answer(stream);
          
          call.on("error", (error) => {
            console.error('[VideoCall] Incoming call error:', error);
            isConnectingRef.current = false;
            if (activeCallRef.current?.call === call) {
              activeCallRef.current = null;
            }
          });

          call.on("stream", (remoteStream) => {
            try {
              setIsTraineeJoined(true);
              setCallState("connected");
              // Check if both users are now joined (local user + remote user)
              // For trainer: they joined when handleStartCall ran, trainee joins here
              // For trainee: they joined when handleStartCall ran, trainer joins here
              if (accountType === AccountType.TRAINER) {
                // Trainer is already in call, trainee just joined
                setBothUsersJoined(true);
              } else {
                // Trainee is already in call, trainer just joined
                setBothUsersJoined(true);
              }
              setDisplayMsg({ show: false, msg: "" });
              setRemoteStream(remoteStream);

              // Start quality monitoring once we have an active call
              if (peer && call && socket && id) {
                if (qualityMonitorIntervalRef.current) {
                  clearInterval(qualityMonitorIntervalRef.current);
                }
                qualityMonitorIntervalRef.current = startQualityMonitoring({
                  peer,
                  call,
                  socket,
                  sessionId: id,
                  role: accountType === AccountType.TRAINER ? "trainer" : "trainee",
                  intervalMs: 10000, // Collect stats every 10 seconds
                });
              }
            } catch (error) {
              console.error('[VideoCall] Error handling incoming stream:', error);
            }
          });

          call.on("close", () => {
            console.log('[VideoCall] Incoming call closed');
            isConnectingRef.current = false;
            if (activeCallRef.current?.call === call) {
              activeCallRef.current = null;
            }
          });
        } catch (error) {
          console.error('[VideoCall] Error handling incoming call:', error);
          isConnectingRef.current = false;
        }
      });
    } catch (err) {
       
      toast.error("Something Went Wrong.")
    }
  };


  useMemo(() => {
    if (
      remoteVideoRef.current &&
      remoteStream &&
      !remoteVideoRef.current.srcObject
    ) {
      remoteVideoRef.current.srcObject = remoteStream;
      accountType === AccountType.TRAINEE ? setIsModelOpen(true) : null;
    }

  }, [remoteStream]);

  const connectToPeer = useCallback((peer, peerId) => {
    try {
      // Check if we already have an active call to this SPECIFIC peer
      if (activeCallRef.current && activeCallRef.current.peer === peerId) {
        const existingCall = activeCallRef.current.call;
        // Check if the call is still active by checking peerConnection state
        if (existingCall && existingCall.peerConnection) {
          const connectionState = existingCall.peerConnection.connectionState || existingCall.peerConnection.iceConnectionState;
          // If connection is closed, failed, or disconnected, allow reconnection
          if (connectionState === 'closed' || connectionState === 'failed' || connectionState === 'disconnected') {
            console.log('[VideoCall] Previous call closed/failed, allowing reconnection to peer:', peerId);
            try {
              existingCall.close();
            } catch (e) {
              console.warn('[VideoCall] Error closing existing call:', e);
            }
            activeCallRef.current = null;
          } else if (connectionState === 'connected' || connectionState === 'connecting') {
            // Call is still active or connecting to THIS peer, skip duplicate
            console.log('[VideoCall] Active call already exists for peer:', peerId, 'state:', connectionState);
            return;
          }
        } else if (existingCall && !existingCall.peerConnection) {
          // Call exists but no peerConnection yet (might be initializing), allow it to proceed
          console.log('[VideoCall] Call exists but no peerConnection yet, allowing connection attempt');
        }
      } else if (activeCallRef.current && activeCallRef.current.peer !== peerId) {
        // We have an active call to a DIFFERENT peer - this is allowed (multiple participants)
        // PeerJS supports one call per peer instance, but we can handle multiple participants
        // by allowing the connection to proceed (the previous call will be replaced)
        console.log('[VideoCall] Active call exists to different peer, allowing new connection', {
          existingPeer: activeCallRef.current.peer,
          newPeer: peerId
        });
        // Note: PeerJS typically supports one call at a time, so this will replace the previous call
        // If you need true multi-party, you'd need multiple peer instances
      }

      // Only prevent if we're actively connecting to the SAME peer AND we have an active call
      if (isConnectingRef.current && activeCallRef.current?.peer === peerId && activeCallRef.current?.call?.peerConnection) {
        const connectionState = activeCallRef.current.call.peerConnection.connectionState || activeCallRef.current.call.peerConnection.iceConnectionState;
        if (connectionState === 'connecting' || connectionState === 'connected') {
          console.log('[VideoCall] Connection already in progress to this peer, skipping duplicate call');
          return;
        }
      }

      if (!(localVideoRef && localVideoRef?.current)) {
        console.error('[VideoCall] Local video ref not available');
        return;
      }

      if (!peer || !peerId) {
        console.error('[VideoCall] Invalid peer or peerId', { peer, peerId });
        return;
      }

      // Check if peer is still open/connected
      if (peer.destroyed || peer.disconnected) {
        console.error('[VideoCall] Peer is destroyed or disconnected');
        return;
      }

      // Check if we have a valid stream
      if (!localVideoRef.current.srcObject) {
        console.error('[VideoCall] Local video stream not available');
        return;
      }

      isConnectingRef.current = true;

      const call = peer.call(peerId, localVideoRef?.current?.srcObject);
      
      if (!call) {
        console.error('[VideoCall] Failed to create call');
        isConnectingRef.current = false;
        return;
      }

      // Store active call reference
      activeCallRef.current = { call, peer: peerId };

      // Handle call errors
      call.on("error", (error) => {
        console.error('[VideoCall] Call error:', error);
        isConnectingRef.current = false;
        // Only clear activeCallRef if this is the current call
        if (activeCallRef.current?.call === call) {
          activeCallRef.current = null;
        }
        // Don't show error to user for common connection issues
        if (error.type !== 'peer-unavailable' && error.type !== 'network' && error.type !== 'browser-incompatible') {
          setDisplayMsg({ 
            show: true, 
            msg: "Connection error. Please try again." 
          });
        }
      });

      // Handle successful stream
      call.on("stream", (remoteStream) => {
        try {
          setDisplayMsg({ show: false, msg: "" });
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          setIsTraineeJoined(true);
          setBothUsersJoined(true);
          
          if (remoteVideoRef?.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
          setRemoteStream(remoteStream);
          accountType === AccountType.TRAINEE ? setIsModelOpen(true) : null;
          isConnectingRef.current = false;
        } catch (error) {
          console.error('[VideoCall] Error handling remote stream:', error);
          isConnectingRef.current = false;
        }
      });

      // Handle call close
      call.on("close", () => {
        console.log('[VideoCall] Call closed');
        isConnectingRef.current = false;
        if (activeCallRef.current?.call === call) {
          activeCallRef.current = null;
        }
      });

    } catch (error) {
      console.error('[VideoCall] Error in connectToPeer:', error);
      isConnectingRef.current = false;
      // Don't clear activeCallRef on error - let it be cleared by call.close or explicit cleanup
      setDisplayMsg({ 
        show: true, 
        msg: "Failed to connect. Please try again." 
      });
    }
  }, [accountType, setIsModelOpen]);
  
  // Start lesson countdown based on backend timer info (authoritative)
  const startLessonTimer = useCallback(
    ({ sessionId, startedAt, duration }) => {
      if (!sessionId || !startedAt || !duration) return;

      if (lessonTimerIntervalRef.current) {
        clearInterval(lessonTimerIntervalRef.current);
        lessonTimerIntervalRef.current = null;
      }

      const updateTimer = () => {
        const currentTime = Date.now();

        const elapsed = Math.floor((currentTime - startedAt) / 1000);
        const remaining = Math.max(0, duration - elapsed);

        setAuthoritativeTimer({
          sessionId,
          startedAt,
          duration,
          remainingSeconds: remaining,
        });

        if (remaining <= 0 && lessonTimerIntervalRef.current) {
          clearInterval(lessonTimerIntervalRef.current);
          lessonTimerIntervalRef.current = null;
        }
      };

      // Hide any "waiting" messages once the authoritative timer starts
      setDisplayMsg({ show: false, msg: "" });
      updateTimer();
            lessonTimerIntervalRef.current = setInterval(updateTimer, 1000);
    },
    []
  );

  useEffect(() => {
    if (!socket) return;

    const handleBothJoin = (data) => {
        setDisplayMsg({
        show: true,
        msg: "Both participants joined. Session timer starting...",
      });

      // Mark that both users have joined - timer can now start
      setBothUsersJoined(true);

      if (accountType === AccountType.TRAINER && data?.socketReq?.newEndTime) {
        const convertedExtendedEndTime = CovertTimeAccordingToTimeZone(
          data.socketReq.newEndTime,
          time_zone,
          false
        );
        const formattedExtendedEndTime = formatToHHMM(convertedExtendedEndTime);
        setSessionEndTime(formattedExtendedEndTime);
      }
    };

    socket.on("ON_BOTH_JOIN", handleBothJoin);

    return () => {
      if (socket) {
        socket.off("ON_BOTH_JOIN", handleBothJoin);
      }
    };
  }, [socket, accountType, time_zone]);

    useEffect(() => {
    if (!socket) return;

    const handleTimerStarted = (timerData) => {
      const { sessionId, startedAt, duration } = timerData || {};

      if (sessionId !== id) return;

     startLessonTimer({ sessionId, startedAt, duration });
    };

    socket.on("TIMER_STARTED", handleTimerStarted);

    return () => {
      if (socket) {
        socket.off("TIMER_STARTED", handleTimerStarted);
      }
    };
  }, [socket, id, startLessonTimer]);

  // Listen to socket events with proper cleanup
  useEffect(() => {
    if (!socket) return;

    const handleCallJoin = ({ userInfo }) => {
      try {
        const { to_user, from_user, peerId } = userInfo || {};
        
        console.log('[VideoCall] Received ON_CALL_JOIN event', {
          userInfo,
          from_user,
          to_user,
          peerId,
          myPeerId: peerRef.current?.id,
          myUserId: fromUser?._id,
          targetUserId: toUser?._id
        });
        
        // Validate userInfo - must have either from_user or peerId
        if (!userInfo) {
          console.error('[VideoCall] Missing userInfo in ON_CALL_JOIN');
          return;
        }

        if (!(peerRef && peerRef.current)) {
          console.error('[VideoCall] Peer ref not available');
          return;
        }

        // Use peerId if provided (for unique device connections), otherwise fallback to from_user
        // This allows same user to join from multiple devices
        const targetPeerId = peerId || from_user;
        
        if (!targetPeerId) {
          console.error('[VideoCall] No valid peerId or from_user in userInfo:', userInfo);
          return;
        }

        // Don't connect to ourselves - check both peerId and from_user
        const myPeerId = peerRef.current.id;
        const myUserId = fromUser?._id;
        
        if (targetPeerId === myPeerId || (from_user && from_user === myUserId)) {
          console.log('[VideoCall] Ignoring self-connection attempt', {
            targetPeerId,
            myPeerId,
            from_user,
            myUserId
          });
          return;
        }
        
        console.log('[VideoCall] Attempting to connect to peer', {
          targetPeerId,
          myPeerId,
          from_user,
          myUserId,
          hasActiveCall: !!activeCallRef.current,
          activeCallPeer: activeCallRef.current?.peer,
          isConnecting: isConnectingRef.current
        });
        
        // Always attempt connection - connectToPeer will handle duplicate prevention
        connectToPeer(peerRef.current, targetPeerId);
      } catch (error) {
        console.error('[VideoCall] Error in handleCallJoin:', error);
        setDisplayMsg({ 
          show: true, 
          msg: "Error connecting to call. Please try again." 
        });
      }
    };

    const handleOffer = (offer) => {
      peerRef.current?.signal(offer);
    };

    const handleAnswer = (answer) => {
      peerRef.current?.signal(answer);
    };

    const handleIceCandidate = (candidate) => {
      peerRef.current?.signal(candidate);
    };

    const handleStopFeed = ({ feedStatus }) => {
      setIsRemoteStreamOff(feedStatus);
    };

    const handleCallClose = () => {
      setDisplayMsg({
        show: true,
        msg: `${toUser?.fullname} left the meeting. Waiting for them to join`,
      });
    };

    const handleParticipantStale = ({ socketId, timestamp }) => {
      // Backend detected that a participant's connection went stale (no heartbeat)
      // This doesn't necessarily mean they left - they might be reconnecting
      if (callState === "connected") {
        setDisplayMsg({
          show: true,
          msg: `${toUser?.fullname || "The other participant"} appears to have lost connection. Waiting for them to reconnect...`,
        });
        // Don't set callState to "reconnecting" here - that's for OUR connection
        // But we can show a message that the other side is having issues
      }
    };

    // Register event listeners
    socket.on("ON_CALL_JOIN", handleCallJoin);
    socket.on("PARTICIPANT_STALE", handleParticipantStale);
    socket.on(EVENTS.VIDEO_CALL.ON_OFFER, handleOffer);
    socket.on(EVENTS.VIDEO_CALL.ON_ANSWER, handleAnswer);
    socket.on(EVENTS.VIDEO_CALL.ON_ICE_CANDIDATE, handleIceCandidate);
    socket.on(EVENTS.VIDEO_CALL.STOP_FEED, handleStopFeed);
    socket.on(EVENTS.VIDEO_CALL.ON_CLOSE, handleCallClose);

    // Cleanup: Remove all listeners when component unmounts or dependencies change
    return () => {
      if (socket) {
        socket.off("ON_CALL_JOIN", handleCallJoin);
        socket.off("PARTICIPANT_STALE", handleParticipantStale);
        socket.off(EVENTS.VIDEO_CALL.ON_OFFER, handleOffer);
        socket.off(EVENTS.VIDEO_CALL.ON_ANSWER, handleAnswer);
        socket.off(EVENTS.VIDEO_CALL.ON_ICE_CANDIDATE, handleIceCandidate);
        socket.off(EVENTS.VIDEO_CALL.STOP_FEED, handleStopFeed);
        socket.off(EVENTS.VIDEO_CALL.ON_CLOSE, handleCallClose);
      }
      // Reset connection state on cleanup
      isConnectingRef.current = false;
      if (callEngineRef.current) {
        callEngineRef.current.cleanup();
        callEngineRef.current = null;
      }
    };
  }, [socket, toUser, connectToPeer]);

  // NOTE - handle user offline
  const handleOffline = () => {
    if (socket) {
      socket.emit("chunksCompleted");
    }
  };

  // handlePeerDisconnect moved earlier (before cleanupFunction)

  const handelTabClose = async () => {
    // mediaRecorder?.stop();
    // setRecording(false);
    if (socket) {
      socket.emit("chunksCompleted");
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = 'You are currently in a call. Are you sure you want to leave or reload? This will disconnect the call.';
    };

    const handleUnload = () => {
      cutCall()
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);


    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);

    };
  }, [cutCall]);

  const width1200 = useMediaQuery("(max-width:1200px)")

  useEffect(() => {
    if (!fromUser || !toUser || !startMeeting?.iceServers || !accountType) return;

    // Run preflight first; only start call once we've passed compatibility checks.
    if (!preflightDone) {
      runPreflightCheck();
      return;
    }

    if (!preflightPassed) {
      return;
    }

    if (typeof navigator !== "undefined") {
      Peer = require("peerjs").default;
    }
    handleStartCall();
    // listenSocketEvents() is now handled in useEffect above with proper cleanup
    window.addEventListener("offline", handleOffline);
    window.addEventListener("beforeunload", handelTabClose);

    return () => {
      window.removeEventListener("beforeunload", handelTabClose);
      window.removeEventListener("offline", handleOffline);

      // cutCall();
    };
  }, [
    startMeeting,
    accountType,
    fromUser,
    toUser,
    preflightDone,
    preflightPassed,
    runPreflightCheck,
  ]);
  useEffect(() => {
    if (sessionEndTime) return;

    if (extended_session_end_time) {
      setSessionEndTime(extended_session_end_time);
      return;
    }

   if (
      isTraineeJoined &&
      accountType === AccountType.TRAINEE &&
      session_start_time &&
      session_end_time &&
      id
    ) {
      extendSessionTime();
      setIsSessionExtended(true);
      return;
    }
    if (accountType === AccountType.TRAINER && session_end_time) {
      setSessionEndTime(session_end_time);
    }
  }, [
    isTraineeJoined,
    extended_session_end_time,
    session_start_time,
    session_end_time,
    id,
    accountType,
    sessionEndTime,
  ]);

  // Keep numeric countdown in sync with the current session end time,
  // and only start counting down once both users have joined.
  useEffect(() => {
    // Reset when users are not both joined
    if (!bothUsersJoined) {
      setTimeRemaining(null);
      return;
    }

    if (typeof sessionEndTime !== "string" || !sessionEndTime.includes(":")) {
      return;
    }

    const [endHours, endMinutes] = sessionEndTime.split(":").map(Number);
    if (
      Number.isNaN(endHours) ||
      Number.isNaN(endMinutes) ||
      endHours < 0 ||
      endHours > 23 ||
      endMinutes < 0 ||
      endMinutes > 59
    ) {
      return;
    }

    const updateRemaining = () => {
      const now = new Date();
      const endTime = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        endHours,
        endMinutes
      );
      const diffMs = endTime.getTime() - now.getTime();
      const remainingSeconds = Math.max(0, Math.floor(diffMs / 1000));
      setTimeRemaining(remainingSeconds);
    };

    // Initial compute and interval
    updateRemaining();
    const intervalId = setInterval(updateRemaining, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [bothUsersJoined, sessionEndTime]);

   
   
  // When both users have joined and we have streams, ensure state is in sync
  useEffect(() => {
    if (localStream && remoteStream && !bothUsersJoined) {
      setBothUsersJoined(true);
    }
  }, [localStream, remoteStream, bothUsersJoined]);

  // Once both users have joined, clear any "waiting" style messages
  useEffect(() => {
    if (
      bothUsersJoined &&
      displayMsg?.show &&
      typeof displayMsg?.msg === "string" &&
      displayMsg.msg.toLowerCase().includes("waiting for")
    ) {
      setDisplayMsg({ show: false, msg: "" });
    }
  }, [bothUsersJoined, displayMsg?.show, displayMsg?.msg]);

  // Sync callState to displayMsg so users see connection status
  useEffect(() => {
    if (callState === "connecting" && !displayMsg?.show) {
      setDisplayMsg({
        show: true,
        msg: `Connecting to ${toUser?.fullname || "the other participant"}...`,
      });
    } else if (callState === "reconnecting") {
      setDisplayMsg({
        show: true,
        msg: "Connection lost. Reconnecting...",
      });
    } else if (callState === "connected" && displayMsg?.show && displayMsg?.msg?.includes("Connecting")) {
      setDisplayMsg({ show: false, msg: "" });
    } else if (callState === "failed") {
      setDisplayMsg({
        show: true,
        msg: "Call connection failed. Please try refreshing the page.",
      });
    } else if (callState === "ended") {
      setDisplayMsg({ show: false, msg: "" });
    }
  }, [callState, toUser?.fullname, displayMsg?.show, displayMsg?.msg]);

  return (
    <div
      className="video-call-container"
      style={{
        alignItems: isMaximized ? "flex-start" : "center",
      }}
    >
      {displayMsg?.show && displayMsg?.msg && (
        <CenterMessage
          message={displayMsg.msg}
          type="waiting"
          showSpinner={true}
        />
      )}
      {selectedClips && selectedClips.length > 0 ? (
        <ClipModeCall
          timeRemaining={timeRemaining}
          bothUsersJoined={bothUsersJoined}
          isMaximized={isMaximized}
          setIsMaximized={setIsMaximized}
          selectedClips={selectedClips}
          setSelectedClips={setSelectedClips}
          isLock={isLockMode}
          localVideoRef={localVideoRef}
          remoteVideoRef={remoteVideoRef}
          toUser={toUser}
          fromUser={fromUser}
          localStream={localStream}
          remoteStream={remoteStream}
          isRemoteStreamOff={isRemoteStreamOff}
          isLocalStreamOff={isLocalStreamOff}
          takeScreenshot={takeScreenshot}
          setIsLock={setIsLockMode}
          isLandscape={isLandscape}
          canvasRef={canvasRef}
          canvasRef2={canvasRef2}
          videoRef={videoRef}
          videoRef2={videoRef2}
          videoContainerRef={videoContainerRef}
          videoContainerRef2={videoContainerRef2}
          setShowScreenshotButton={setShowScreenshotButton}
          lockPoint={lockPoint}
          setLockPoint={setLockPoint}
        />
      ) : (
        <OneOnOneCall
          timeRemaining={timeRemaining}
          bothUsersJoined={bothUsersJoined}
          selectedUser={selectedUser}
          setSelectedUser={setSelectedUser}
          localVideoRef={localVideoRef}
          remoteVideoRef={remoteVideoRef}
          toUser={toUser}
          fromUser={fromUser}
          localStream={localStream}
          remoteStream={remoteStream}
          isLocalStreamOff={isLocalStreamOff}
          setIsLocalStreamOff={setIsLocalStreamOff}
          isRemoteStreamOff={isRemoteStreamOff}
          setIsRemoteStreamOff={setIsRemoteStreamOff}
          isLandscape={isLandscape}
          setShowScreenshotButton={setShowScreenshotButton}
        />
      )}
      {!isMaximized && (
        <div style={{ 
          flexShrink: 0, 
          width: "100%", 
          padding: typeof window !== 'undefined' && window.innerWidth <= 768 
            ? "8px 15px 80px 15px" // Extra bottom padding on mobile for browser UI
            : "8px 15px"
        }}>
          <ActionButtons
          setSelectedUser={setSelectedUser}
          isShowVideos={isShowVideos}
          setIsShowVideos={setIsShowVideos}
          setIsLockMode={setIsLockMode}
          isLockMode={isLockMode}
          isVideoOff={isLocalStreamOff}
          setIsVideoOff={setIsLocalStreamOff}
          stream={localStream}
          fromUser={fromUser}
          toUser={toUser}
          isMuted={isMuted}
          setIsMuted={setIsMuted}
          takeScreenshot={takeScreenshot}
          isOpen={isOpen}
          setIsOpen={setIsOpen}
          isOpenConfirm={isOpenConfirm}
          setIsOpenConfirm={setIsOpenConfirm}
          selectedClips={selectedClips}
          setIsOpenReport={setIsOpenReport}
          cutCall={cutCall}
          setIsConfirmModelOpen={setIsConfirmModelOpen}
          showScreenshotButton={showScreenshotButton}
          setLockPoint={setLockPoint}
          videoRef={videoRef}
          videoRef2={videoRef2}
        />
        </div>
      )}

      <Modal
        isOpen={isOpenConfirm}
        toggle={() => {
          setIsOpenConfirm(false);
        }}
        centered
        className="clip-exit-confirm-modal"
        backdrop="static"
        keyboard={false}
      >
        <ModalHeader
          toggle={() => {
            setIsOpenConfirm(false);
            // Clear clips and emit socket event to sync with student
            setSelectedClips([]);
            emitVideoSelectEvent("clips", []);
          }}
          close={() => <></>}
          className="clip-exit-confirm-modal__header"
          style={{ textAlign: "center" }}
        >
          <div className="clip-exit-confirm-modal__title" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            <i className="fa fa-exclamation-triangle" role="img" aria-label="Warning"></i>
            <span>Confirm Exit</span>
          </div>
        </ModalHeader>
        <ModalBody className="clip-exit-confirm-modal__body" style={{ textAlign: "center", padding: "1.5rem" }}>
          <p style={{ margin: "0 0 1rem 0", fontSize: "1rem", color: "#333" }}>Are you sure you want to exit clip analysis mode?</p>
          <p className="clip-exit-confirm-modal__subtext" style={{ margin: 0, fontSize: "0.9rem", color: "#666" }}>
            Your selected clips will be cleared and you'll return to the regular call view.
          </p>
        </ModalBody>
        <ModalFooter className="clip-exit-confirm-modal__footer" style={{ display: "flex", justifyContent: "center", gap: "1rem", padding: "1rem 1.5rem" }}>
          <Button
            color="secondary"
            onClick={() => {
              setIsOpenConfirm(false);
            }}
            className="clip-exit-confirm-modal__btn-cancel"
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
              // Clear clips and emit socket event to sync with student
              setSelectedClips([]);
              // Explicitly emit the event to ensure student receives it immediately
              emitVideoSelectEvent("clips", []);
              setIsOpenConfirm(false);
            }}
            className="clip-exit-confirm-modal__btn-confirm"
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

      <CustomModal
        isOpen={isOpen}
        element={
          <>
            <div className="container media-gallery portfolio-section grid-portfolio clip-selection-modal">
              <div className="theme-title mb-4">
                <div className="media-body media-body text-right">
                  <div
                    className="icon-btn btn-sm btn-outline-light close-apps pointer"
                    onClick={() => {
                      setIsOpen(false);
                    }}
                    style={{
                      minWidth: "44px",
                      minHeight: "44px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <X />
                  </div>
                </div>
                <div className="media d-flex flex-column align-items-center">
                  <div style={{ textAlign: "center", padding: "0 1rem" }}>
                    <h2 style={{ 
                      fontSize: width1200 ? "18px" : "22px", 
                      fontWeight: "600",
                      marginBottom: "0.5rem",
                      lineHeight: "1.4"
                    }}>
                      Select The Videos.
                    </h2>
                    {selectClips.length > 0 && (
                      <div style={{ 
                        marginTop: "1rem", 
                        padding: "0.75rem 1rem", 
                        backgroundColor: "#e8f5e9", 
                        borderRadius: "8px",
                        display: "inline-block"
                      }}>
                        <span style={{ fontSize: "14px", fontWeight: "600", color: "#2e7d32" }}>
                          Selected: {selectClips.length}/2
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="theme-tab">
              <Nav 
                tabs 
                className="clip-selection-tabs" 
                style={{
                  justifyContent: 'center',
                  flexWrap: "nowrap",
                  gap: "8px",
                  marginBottom: "1.5rem",
                  overflowX: "auto"
                }}
              >
                  <NavItem 
                    className="mb-2" 
                    style={{
                      flex: "0 0 auto"
                    }}
                  >
                    <NavLink
                      className={`button-effect ${videoActiveTab === "media" ? "active" : ""
                        } select-clip-width`}
                      style={{
                        minWidth: "auto",
                        padding: width1200 ? "0.75rem 1rem" : "0.75rem 1.5rem",
                        fontSize: width1200 ? "14px" : "16px",
                        fontWeight: "500",
                        textAlign: "center",
                        minHeight: "44px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                      onClick={() => setAideoActiveTab("media")}
                    >
                      My Videos
                    </NavLink>
                  </NavItem>
                  <NavItem 
                    className="mb-2" 
                    style={{
                      flex: "0 0 auto"
                    }}
                  >
                    <NavLink
                      className={`button-effect ${videoActiveTab === "trainee" ? "active" : ""
                        } select-clip-width`}
                      style={{
                        minWidth: "auto",
                        padding: width1200 ? "0.75rem 1rem" : "0.75rem 1.5rem",
                        fontSize: width1200 ? "14px" : "16px",
                        fontWeight: "500",
                        textAlign: "center",
                        minHeight: "44px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                      onClick={() => setAideoActiveTab("trainee")}
                    >
                      Enthusiasts
                    </NavLink>
                  </NavItem>
                  <NavItem 
                    className="mb-2" 
                    style={{
                      flex: "0 0 auto"
                    }}
                  >
                    <NavLink
                      className={`button-effect ${videoActiveTab === "docs" ? "active" : ""
                        } select-clip-width`}
                      style={{
                        minWidth: "auto",
                        padding: width1200 ? "0.75rem 1rem" : "0.75rem 1.5rem",
                        fontSize: width1200 ? "14px" : "16px",
                        fontWeight: "500",
                        textAlign: "center",
                        minHeight: "44px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                      onClick={() => setAideoActiveTab("docs")}
                    >
                      NetQwix
                    </NavLink>
                  </NavItem>
                </Nav>
              </div>
              <div className="file-tab">
                {(
                  (videoActiveTab === "media" && clips && clips.length !== 0) ||
                  (videoActiveTab === "trainee" && traineeClip && traineeClip.length !== 0) ||
                  (videoActiveTab === "docs" && netquixVideos && netquixVideos && netquixVideos.length !== 0)
                ) && (
                  <div 
                    className="d-flex justify-content-center w-100 p-3" 
                    style={{
                      borderBottom: "1px solid #e0e0e0",
                      gap: "1rem"
                    }}
                  >
                    <Button
                      color="success"
                      onClick={() => {
                        if (selectClips && selectClips?.length) {
                          setSelectedClips(selectClips);
                          setClipSelectNote(false);
                        }
                        setIsOpen(false);
                      }}
                      disabled={selectClips.length === 0}
                      style={{
                        minWidth: "120px",
                        padding: "0.75rem 2rem",
                        fontSize: "16px",
                        fontWeight: "600",
                        minHeight: "44px"
                      }}
                    >
                      Select {selectClips.length > 0 && `(${selectClips.length})`}
                    </Button>
                  </div>
                )}
                <TabContent
                  activeTab={videoActiveTab}
                  className="custom-scroll"
                >
                  <TabPane tabId="media">
                    <div
                      className="media-gallery portfolio-section grid-portfolio"
                      style={{ 
                        overflowY: "auto", 
                        height: width1200 ? "50dvh" : "40dvh",
                        padding: "0.5rem"
                      }}
                    >
                      {clips?.length ? (
                        clips?.map((cl, ind) => (
                          <div key={ind} className={`collapse-block open mb-3`}>
                            <h5
                              className="block-title"
                              onClick={() => {
                                var temp = clips;
                                temp = temp.map((vl) => {
                                  return { ...vl, show: false };
                                });
                                temp[ind].show = true;
                                setClips([...temp]);
                              }}
                              style={{
                                fontSize: width1200 ? "16px" : "18px",
                                fontWeight: "600",
                                padding: "0.75rem 1rem",
                                cursor: "pointer",
                                minHeight: "44px",
                                display: "flex",
                                alignItems: "center"
                              }}
                            >
                              {cl?._id}
                              <label className="badge badge-primary sm ml-2">
                                {cl?.clips?.length}
                              </label>
                            </h5>
                            <div className={`block-content`}>
                              <div 
                                className="row" 
                                style={{ 
                                  margin: 0,
                                  display: "grid",
                                  gridTemplateColumns: "repeat(2, 1fr)",
                                  gap: "15px",
                                  padding: "0.5rem"
                                }}
                              >
                                {cl?.clips.map((clp, index) => {
                                  const sld = selectClips.find(
                                    (val) => val?._id === clp?._id
                                  );
                                  const isMaxSelected = selectClips.length >= 2;
                                  const isDisabled = isMaxSelected && !sld;
                                  
                                  return (
                                    <div
                                      key={index}
                                      style={{ 
                                        borderRadius: "8px",
                                        position: "relative",
                                        cursor: isDisabled ? "not-allowed" : "pointer",
                                        opacity: isDisabled ? 0.5 : 1,
                                        transition: "all 0.3s ease"
                                      }}
                                      onClick={() => {
                                        if (isDisabled) return;
                                        
                                        if (!sld && selectClips?.length < 2) {
                                          selectClips.push(clp);
                                          setSelectClips([...selectClips]);
                                        } else {
                                          var temp = JSON.parse(
                                            JSON.stringify(selectClips)
                                          );
                                          temp = temp.filter(
                                            (val) => val._id !== clp?._id
                                          );
                                          setSelectClips([...temp]);
                                        }
                                      }}
                                    >
                                      {/* Clip Title */}
                                      <h6
                                        className="text-truncate mb-2"
                                        style={{
                                          fontSize: "13px",
                                          fontWeight: "500",
                                          textAlign: "center",
                                          padding: "0 5px",
                                          marginBottom: "8px",
                                          maxWidth: "100%",
                                          color: isDisabled ? "#999" : "#333"
                                        }}
                                        title={clp?.title || "Untitled"}
                                      >
                                        {clp?.title && clp.title.length > 15 
                                          ? `${clp.title.slice(0, 15)}...` 
                                          : clp?.title || "Untitled"}
                                      </h6>
                                      
                                      {/* Video Container */}
                                      <div style={{ position: "relative" }}>
                                        <video
                                          poster={Utils?.generateThumbnailURL(clp)}
                                          style={{
                                            width: "100%",
                                            aspectRatio: "1/1",
                                            border: sld
                                              ? "4px solid #28a745"
                                              : "4px solid rgb(180, 187, 209)",
                                            borderRadius: "8px",
                                            objectFit: "cover",
                                            pointerEvents: isDisabled ? "none" : "auto"
                                          }}
                                        >
                                          <source
                                            src={Utils?.generateVideoURL(clp)}
                                            type="video/mp4"
                                          />
                                        </video>
                                        
                                        {/* Checkbox */}
                                        <div
                                          style={{
                                            position: "absolute",
                                            top: "8px",
                                            right: "8px",
                                            backgroundColor: sld ? "#28a745" : "white",
                                            border: "2px solid",
                                            borderColor: sld ? "#28a745" : "#b4bbd1",
                                            borderRadius: "4px",
                                            width: "24px",
                                            height: "24px",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            cursor: isDisabled ? "not-allowed" : "pointer",
                                            zIndex: 10,
                                            transition: "all 0.3s ease"
                                          }}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (isDisabled) return;
                                            
                                            if (!sld && selectClips?.length < 2) {
                                              selectClips.push(clp);
                                              setSelectClips([...selectClips]);
                                            } else {
                                              var temp = JSON.parse(
                                                JSON.stringify(selectClips)
                                              );
                                              temp = temp.filter(
                                                (val) => val._id !== clp?._id
                                              );
                                              setSelectClips([...temp]);
                                            }
                                          }}
                                        >
                                          {sld && (
                                            <svg
                                              width="16"
                                              height="16"
                                              viewBox="0 0 16 16"
                                              fill="none"
                                              xmlns="http://www.w3.org/2000/svg"
                                            >
                                              <path
                                                d="M13.5 4L6 11.5L2.5 8"
                                                stroke="black"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                              />
                                            </svg>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            minHeight: "200px"
                          }}
                        >
                          <h5 className="block-title">No Data Found</h5>
                        </div>
                      )}
                    </div>
                  </TabPane>
                  <TabPane tabId="trainee">
                    <div
                      className="media-gallery portfolio-section grid-portfolio"
                      style={{ 
                        overflowY: "auto", 
                        height: width1200 ? "50dvh" : "40dvh",
                        padding: "0.5rem"
                      }}
                    >
                      {traineeClip?.length ? (
                        traineeClip?.map((cl, ind) => (
                          <div key={ind} className={`collapse-block open mb-3`}>
                            <h5
                              className="block-title"
                              onClick={() => {
                                var temp = traineeClip;
                                temp = temp.map((vl) => {
                                  return { ...vl, show: false };
                                });
                                temp[ind].show = true;
                                setTraineeClips([...temp]);
                              }}
                              style={{
                                fontSize: width1200 ? "16px" : "18px",
                                fontWeight: "600",
                                padding: "0.75rem 1rem",
                                cursor: "pointer",
                                minHeight: "44px",
                                display: "flex",
                                alignItems: "center"
                              }}
                            >
                              {cl?._id?.fullname || "Enthusiasts Clips"}
                              {cl?.clips?.length && (
                                <label className="badge badge-primary sm ml-2">
                                  {cl?.clips?.length}
                                </label>
                              )}
                            </h5>
                            <div className={`block-content`}>
                              <div 
                                className="row" 
                                style={{ 
                                  margin: 0,
                                  display: "grid",
                                  gridTemplateColumns: "repeat(2, 1fr)",
                                  gap: "15px",
                                  padding: "0.5rem"
                                }}
                              >
                                {cl?.clips.map((clp, index) => {
                                  const sld = selectClips.find(
                                    (val) => val?._id === clp?._id
                                  );
                                  const isMaxSelected = selectClips.length >= 2;
                                  const isDisabled = isMaxSelected && !sld;
                                  
                                  return (
                                    <div
                                      key={index}
                                      style={{ 
                                        borderRadius: "8px",
                                        position: "relative",
                                        cursor: isDisabled ? "not-allowed" : "pointer",
                                        opacity: isDisabled ? 0.5 : 1,
                                        transition: "all 0.3s ease"
                                      }}
                                      onClick={() => {
                                        if (isDisabled) return;
                                        
                                        if (!sld && selectClips?.length < 2) {
                                          selectClips.push(clp);
                                          setSelectClips([...selectClips]);
                                        } else {
                                          var temp = JSON.parse(
                                            JSON.stringify(selectClips)
                                          );
                                          temp = temp.filter(
                                            (val) => val._id !== clp?._id
                                          );
                                          setSelectClips([...temp]);
                                        }
                                      }}
                                    >
                                      {/* Clip Title */}
                                      <h6
                                        className="text-truncate mb-2"
                                        style={{
                                          fontSize: "13px",
                                          fontWeight: "500",
                                          textAlign: "center",
                                          padding: "0 5px",
                                          marginBottom: "8px",
                                          maxWidth: "100%",
                                          color: isDisabled ? "#999" : "#333"
                                        }}
                                        title={clp?.title || "Untitled"}
                                      >
                                        {clp?.title && clp.title.length > 15 
                                          ? `${clp.title.slice(0, 15)}...` 
                                          : clp?.title || "Untitled"}
                                      </h6>
                                      
                                      {/* Video Container */}
                                      <div style={{ position: "relative" }}>
                                        <video
                                          poster={Utils?.generateThumbnailURL(clp)}
                                          style={{
                                            width: "100%",
                                            aspectRatio: "1/1",
                                            border: sld
                                              ? "4px solid #28a745"
                                              : clp.duringSession
                                                ? "4px solid #dc3545"
                                                : "4px solid rgb(180, 187, 209)",
                                            borderRadius: "8px",
                                            objectFit: "cover",
                                            pointerEvents: isDisabled ? "none" : "auto"
                                          }}
                                          preload="none"
                                        >
                                          <source
                                            src={Utils?.generateVideoURL(clp)}
                                            type="video/mp4"
                                          />
                                        </video>
                                        
                                        {/* Checkbox */}
                                        <div
                                          style={{
                                            position: "absolute",
                                            top: "8px",
                                            right: "8px",
                                            backgroundColor: sld ? "#28a745" : "white",
                                            border: "2px solid",
                                            borderColor: sld ? "#28a745" : "#b4bbd1",
                                            borderRadius: "4px",
                                            width: "24px",
                                            height: "24px",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            cursor: isDisabled ? "not-allowed" : "pointer",
                                            zIndex: 10,
                                            transition: "all 0.3s ease"
                                          }}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (isDisabled) return;
                                            
                                            if (!sld && selectClips?.length < 2) {
                                              selectClips.push(clp);
                                              setSelectClips([...selectClips]);
                                            } else {
                                              var temp = JSON.parse(
                                                JSON.stringify(selectClips)
                                              );
                                              temp = temp.filter(
                                                (val) => val._id !== clp?._id
                                              );
                                              setSelectClips([...temp]);
                                            }
                                          }}
                                        >
                                          {sld && (
                                            <svg
                                              width="16"
                                              height="16"
                                              viewBox="0 0 16 16"
                                              fill="none"
                                              xmlns="http://www.w3.org/2000/svg"
                                            >
                                              <path
                                                d="M13.5 4L6 11.5L2.5 8"
                                                stroke="black"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                              />
                                            </svg>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            minHeight: "200px"
                          }}
                        >
                          <h5 className="block-title">No Data Found</h5>
                        </div>
                      )}
                    </div>
                  </TabPane>
                  <TabPane tabId="docs">
                    <div
                      className="media-gallery portfolio-section grid-portfolio"
                      style={{ 
                        overflowY: "auto", 
                        height: width1200 ? "50dvh" : "40dvh",
                        padding: "0.5rem"
                      }}
                    >
                      <div className={`collapse-block open`}>
                        <div className={`block-content`}>
                          <div 
                            className="row"
                            style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(2, 1fr)",
                              gap: "15px",
                              margin: 0
                            }}
                          >
                            {netquixVideos.map((clp, index) => {
                              const sld = selectClips.find(
                                (val) => val?._id === clp?._id
                              );
                              const isMaxSelected = selectClips.length >= 2;
                              const isDisabled = isMaxSelected && !sld;
                              
                              return clp?.file_name ? (
                                <div
                                  key={index}
                                  style={{ 
                                    borderRadius: "8px",
                                    position: "relative",
                                    cursor: isDisabled ? "not-allowed" : "pointer",
                                    opacity: isDisabled ? 0.5 : 1,
                                    transition: "all 0.3s ease"
                                  }}
                                  onClick={() => {
                                    if (isDisabled) return;
                                    
                                    if (!sld && selectClips?.length < 2) {
                                      selectClips.push(clp);
                                      setSelectClips([...selectClips]);
                                    } else {
                                      var temp = JSON.parse(
                                        JSON.stringify(selectClips)
                                      );
                                      temp = temp.filter(
                                        (val) => val._id !== clp?._id
                                      );
                                      setSelectClips([...temp]);
                                    }
                                  }}
                                >
                                  {/* Clip Title */}
                                  <h6
                                    className="text-truncate mb-2"
                                    style={{
                                      fontSize: "13px",
                                      fontWeight: "500",
                                      textAlign: "center",
                                      padding: "0 5px",
                                      marginBottom: "8px",
                                      maxWidth: "100%",
                                      color: isDisabled ? "#999" : "#333"
                                    }}
                                    title={clp?.title || "Untitled"}
                                  >
                                    {clp?.title && clp.title.length > 15 
                                      ? `${clp.title.slice(0, 15)}...` 
                                      : clp?.title || "Untitled"}
                                  </h6>
                                  
                                  {/* Video Container */}
                                  <div style={{ position: "relative" }}>
                                    <video
                                      style={{
                                        width: "100%",
                                        aspectRatio: "1/1",
                                        border: sld
                                          ? "4px solid #28a745"
                                          : "4px solid rgb(180, 187, 209)",
                                        borderRadius: "8px",
                                        objectFit: "cover",
                                        pointerEvents: isDisabled ? "none" : "auto"
                                      }}
                                    >
                                      <source
                                        src={Utils?.generateVideoURL(clp)}
                                        type="video/mp4"
                                      />
                                    </video>
                                    
                                    {/* Checkbox */}
                                    <div
                                      style={{
                                        position: "absolute",
                                        top: "8px",
                                        right: "8px",
                                        backgroundColor: sld ? "#28a745" : "white",
                                        border: "2px solid",
                                        borderColor: sld ? "#28a745" : "#b4bbd1",
                                        borderRadius: "4px",
                                        width: "24px",
                                        height: "24px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        cursor: isDisabled ? "not-allowed" : "pointer",
                                        zIndex: 10,
                                        transition: "all 0.3s ease"
                                      }}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (isDisabled) return;
                                        
                                        if (!sld && selectClips?.length < 2) {
                                          selectClips.push(clp);
                                          setSelectClips([...selectClips]);
                                        } else {
                                          var temp = JSON.parse(
                                            JSON.stringify(selectClips)
                                          );
                                          temp = temp.filter(
                                            (val) => val._id !== clp?._id
                                          );
                                          setSelectClips([...temp]);
                                        }
                                      }}
                                    >
                                      {sld && (
                                        <svg
                                          width="16"
                                          height="16"
                                          viewBox="0 0 16 16"
                                          fill="none"
                                          xmlns="http://www.w3.org/2000/svg"
                                        >
                                          <path
                                            d="M13.5 4L6 11.5L2.5 8"
                                            stroke="black"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                          />
                                        </svg>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ) : null;
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabPane>
                </TabContent>
              </div>
            </div>

            {clipSelectNote && (
              <Notes
                isOpen={clipSelectNote}
                onClose={setClipSelectNote}
                title={"Select clips"}
                desc={
                  "Select clips to choose up to two clips, videos will load onto your board when you click the X (cross)."
                }
                style={{
                  top: "10px",
                  left: "10px",
                }}
                triangle={"clip-select"}
                nextFunc={() => {
                  setClipSelectNote(false);
                }}
              />
            )}
          </>
        }
      />

      {isScreenShotModelOpen && (
        <ScreenShotDetails
          screenShotImages={screenShots}
          setScreenShotImages={setScreenShots}
          currentScreenShot={currentScreenShot}
          setIsOpenDetail={setIsScreenShotModelOpen}
          isOpenDetail={isScreenShotModelOpen}
          currentReportData={{
            session: id,
            trainer: fromUser?._id,
            trainee: toUser?._id,
          }}
          isLoading={isLoading}
          reportObj={reportObj}
        />
      )}

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
        isFromCalling={true}
      />

      {accountType === AccountType.TRAINEE &&
        <ReactStrapModal
          allowFullWidth={true}
          element={
            <TraineeRatings
              accountType={accountType}
              booking_id={id}
              key={id}
              onClose={() => {
                setIsOpenRating(false)
              }}
              isFromCall={true}
              trainer={toUser}
            />
          }
          isOpen={isOpenRating}
          id={id}
        // width={"50%"}
        />}

      <PermissionModal isOpen={permissionModal} errorMessage={errorMessageForPermission} />

      <Modal isOpen={isConfirmModelOpen} centered>
        <ModalHeader style={{ textAlign: "center" }}>
          <h5
            style={{
              fontSize: "1.5rem",
              fontWeight: "600",
              margin: 0
            }}
          >{`Are you sure you want to exit the session?`}</h5>
        </ModalHeader>
        <ModalBody style={{ textAlign: "center", padding: "1.5rem" }}>
          <p style={{ margin: "0 0 1.5rem 0", fontSize: "1rem", color: "#333" }}>
            Exiting the session will end the call for all participants.
          </p>
          <div style={{
            display: "flex",
            justifyContent: "center",
            gap: "1rem",
            flexWrap: "wrap"
          }}>
            <Button
              color="secondary"
              onClick={() => {
                setIsConfirmModelOpen(false)
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
              color="danger"
              onClick={() => {
                cutCall();
                if (accountType === AccountType.TRAINER && socket) {
                  socket.emit(EVENTS.CALL_END, {
                    userInfo: { from_user: fromUser._id, to_user: toUser._id }
                  });
                }

              }}
              style={{
                backgroundColor: '#dc3545',
                borderColor: '#dc3545',
                color: '#ffffff',
                minHeight: '44px',
                padding: '0.75rem 1.5rem',
                fontWeight: '600'
              }}
            >
              Yes, Exit
            </Button>
          </div>
        </ModalBody>
      </Modal>

      {/* 30-Second Warning Modal */}
      <Modal isOpen={show30SecondWarning} centered backdrop="static" keyboard={false}>
        <ModalHeader style={{ 
          backgroundColor: remainingSeconds <= 10 ? '#dc3545' : '#ffc107',
          color: '#ffffff',
          borderBottom: 'none'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="fa fa-exclamation-triangle" aria-hidden="true" style={{ fontSize: '24px' }}></i>
            <span style={{ fontSize: '18px', fontWeight: '600' }}>Session Ending Soon</span>
          </div>
        </ModalHeader>
        <ModalBody style={{ padding: '2rem', textAlign: 'center' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <i 
              className="fa fa-clock-o" 
              aria-hidden="true" 
              style={{ 
                fontSize: '48px', 
                color: remainingSeconds <= 10 ? '#dc3545' : '#ffc107',
                marginBottom: '1rem'
              }}
            ></i>
            <h3 style={{ 
              color: remainingSeconds <= 10 ? '#dc3545' : '#333',
              marginBottom: '1rem',
              fontWeight: '600'
            }}>
              Session ending in {remainingSeconds} seconds
            </h3>
            <p style={{ color: '#666', fontSize: '16px', lineHeight: '1.6' }}>
              Your session time is almost up. The call will end automatically when the timer reaches zero.
            </p>
          </div>
          {remainingSeconds <= 10 && (
            <div style={{
              backgroundColor: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '8px',
              padding: '1rem',
              marginTop: '1rem'
            }}>
              <p style={{ margin: 0, color: '#856404', fontWeight: '500' }}>
                ⚠️ Less than 10 seconds remaining!
              </p>
            </div>
          )}
        </ModalBody>
        <ModalFooter style={{ 
          borderTop: 'none',
          justifyContent: 'center',
          padding: '1rem 2rem'
        }}>
          <Button 
            color="secondary" 
            onClick={() => { 
              setShow30SecondWarning(false);
              if (warning30SecondIntervalRef.current) {
                clearInterval(warning30SecondIntervalRef.current);
                warning30SecondIntervalRef.current = null;
              }
            }}
            style={{
              minWidth: '120px',
              padding: '0.75rem 1.5rem',
              fontWeight: '600'
            }}
          >
            <i className="fa fa-times" aria-hidden="true" style={{ marginRight: '8px' }}></i>
            Close
          </Button>
        </ModalFooter>
      </Modal>

      {/* Grace Period Modal (-4 minutes) */}
      <Modal isOpen={showGracePeriodModal} centered className="grace-period-modal">
        <ModalHeader className="grace-period-modal__header">
          <div className="grace-period-modal__title">
            <i className="fa fa-heart" aria-hidden="true"></i>
            <span>Thank you for using NetQwix!</span>
          </div>
        </ModalHeader>
        <ModalBody className="grace-period-modal__body">
          <div className="grace-period-modal__content">
            <p className="grace-period-modal__main-text">
              We give our community a 5 minute grace period after each session to say goodbye
              and discuss the game plan moving forward.
            </p>
            <div className="grace-period-modal__countdown">
              <i className="fa fa-clock-o" aria-hidden="true"></i>
              <p className="grace-period-modal__countdown-text">
                The session will automatically close in <strong>{countdownMessage}</strong>.
              </p>
            </div>
          </div>
        </ModalBody>
        <ModalFooter className="grace-period-modal__footer">
          <Button 
            color="primary" 
            onClick={() => { 
              gracePeriodModalDismissedRef.current = true; 
              setShowGracePeriodModal(false); 
            }}
            className="grace-period-modal__btn"
          >
            <i className="fa fa-check" aria-hidden="true" style={{ marginRight: "8px" }}></i>
            Got it
          </Button>
        </ModalFooter>
      </Modal>

      {/* Session Ended Modal (-5 minutes) */}
      <Modal isOpen={showSessionEndedModal} centered className="session-ended-modal">
        <ModalHeader className="session-ended-modal__header">
          <div className="session-ended-modal__title">
            <i className="fa fa-check-circle" aria-hidden="true"></i>
            <span>Your session has now ended</span>
          </div>
        </ModalHeader>
        <ModalBody className="session-ended-modal__body">
          <div className="session-ended-modal__content">
            <div className="session-ended-modal__icon-wrapper">
              <i className="fa fa-calendar-check-o" aria-hidden="true"></i>
            </div>
            <p className="session-ended-modal__main-text">
              Please make sure to rate your experience momentarily.
            </p>
            <p className="session-ended-modal__sub-text">
              Visit your locker shortly to view your game plan.
            </p>
            <div className="session-ended-modal__footer-text">
              <p>Thank you for using NetQwix.</p>
              <p className="session-ended-modal__goodbye">See you soon!</p>
            </div>
          </div>
        </ModalBody>
        <ModalFooter className="session-ended-modal__footer">
          <Button 
            color="primary" 
            onClick={() => {
              sessionEndedModalDismissedRef.current = true;
              setShowSessionEndedModal(false);
              if (accountType === AccountType.TRAINEE) {
                setIsOpenRating(true);
              } else {
                setIsOpenReport(true)
              }
            }}
            className="session-ended-modal__btn"
          >
            <i className="fa fa-star" aria-hidden="true" style={{ marginRight: "8px" }}></i>
            Rate Experience
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default VideoCallUI;
