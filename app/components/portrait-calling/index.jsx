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
  const clipsLoadedRef = useRef(false); // Track if clips have been loaded to prevent race conditions
  const selectedClipsRef = useRef([]); // Track current clips for socket handler to access latest value
  const lastEmittedClipIdsRef = useRef(''); // Track last emitted clip IDs to prevent duplicate emissions loop
  const bookingClipsLoadedOnceRef = useRef(false); // Prevent startMeeting from overriding manual clip selection
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
  const bothUsersJoinedAtRef = useRef(null);
  const [timerBufferElapsed, setTimerBufferElapsed] = useState(false);
  const [bufferCountdown, setBufferCountdown] = useState(null);
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
  const [showSessionEndedModal, setShowSessionEndedModal] = useState(false);
  const [showFiveMinuteWarning, setShowFiveMinuteWarning] = useState(false);
  const [showTwoMinuteWarning, setShowTwoMinuteWarning] = useState(false);
  const [peerJoinedModalOpen, setPeerJoinedModalOpen] = useState(false);
  const [peerJoinedModalName, setPeerJoinedModalName] = useState("");
  const lastPartnerJoinNotifyAtRef = useRef(0);
  const warningThresholdsRef = useRef({ five: false, two: false, ended: false });

  const showPartnerJoinedPrompt = useCallback(() => {
    const t = Date.now();
    if (t - lastPartnerJoinNotifyAtRef.current < 12000) return;
    lastPartnerJoinNotifyAtRef.current = t;
    const partnerName = toUser?.fullname || "Your partner";
    toast.info(
      `${partnerName} has joined the meeting. Please stay on this page while your cameras connect.`,
      { autoClose: 9000, position: "top-center" }
    );
    setPeerJoinedModalName(partnerName);
    setPeerJoinedModalOpen(true);
  }, [toUser?.fullname]);

  const [lockPoint, setLockPoint] = useState(0);
  const callEngineRef = useRef(null);
  const [preflightDone, setPreflightDone] = useState(false);
  const [preflightPassed, setPreflightPassed] = useState(false);
  const [callState, setCallState] = useState("idle"); // idle | connecting | connected | reconnecting | failed | ended
  const qualityMonitorIntervalRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  /** Same socket instance: remove previous handlers before re-attaching (handleStartCall can run more than once). */
  const socketCallLifecycleHandlersRef = useRef(null);

  // Authoritative lesson timer (backend-driven)
  const lessonTimerIntervalRef = useRef(null);
  const [authoritativeTimer, setAuthoritativeTimer] = useState(null);
  const [lessonTimerStatus, setLessonTimerStatus] = useState("waiting");
  const autoLessonTimerRequestedRef = useRef(false);

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
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
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

    const handleVideoSelect = ({ videos, type, userInfo }) => {
      if (type === "clips") {
        const newClips = Array.isArray(videos) ? [...videos] : [];
        const fromUid =
          userInfo?.from_user != null ? String(userInfo.from_user) : "";
        const myUid = fromUser?._id != null ? String(fromUser._id) : "";

        // Trainee follows trainer-driven clip updates (including [] to exit clip mode).
        if (accountType === AccountType.TRAINEE) {
          if (fromUid && fromUid === myUid) return;
          setSelectedClips(newClips);
          selectedClipsRef.current = newClips;
          clipsLoadedRef.current = newClips.length > 0;
          lastEmittedClipIdsRef.current = newClips
            .map((c) => c?._id)
            .filter(Boolean)
            .sort()
            .join(",");
          if (socket && fromUser?._id && toUser?._id) {
            socket.emit(EVENTS.ON_CLEAR_CANVAS, {
              userInfo: { from_user: fromUser._id, to_user: toUser._id },
              canvasIndex: 1,
            });
          }
          return;
        }

        // Trainer: ignore empty payloads that would wipe booking clips unless this is our own echo.
        const currentClipsLength = selectedClipsRef.current.length;
        const hasClipsFromBooking = clipsLoadedRef.current && currentClipsLength > 0;
        const isReceivingEmptyClips = newClips.length === 0;
        if (
          hasClipsFromBooking &&
          isReceivingEmptyClips &&
          !(fromUid && fromUid === myUid)
        ) {
          console.log("[VideoCallUI] Ignoring socket event that would clear booking clips", {
            receivedClips: newClips.length,
            currentClips: currentClipsLength,
            clipsLoadedFromBooking: clipsLoadedRef.current,
          });
          return;
        }

        console.log("[VideoCallUI] Updating clips from socket event", {
          receivedClips: newClips.length,
          currentClips: currentClipsLength,
          clipIds: newClips.map((c) => c?._id),
        });
        setSelectedClips(newClips);
        selectedClipsRef.current = newClips;

        if (newClips.length > 0) {
          clipsLoadedRef.current = true;
        } else {
          clipsLoadedRef.current = false;
        }

        if (socket && fromUser?._id && toUser?._id) {
          socket.emit(EVENTS.ON_CLEAR_CANVAS, {
            userInfo: { from_user: fromUser._id, to_user: toUser._id },
            canvasIndex: 1,
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
  }, [socket, accountType, cutCall, fromUser?._id, toUser?._id]);

  // Synchronized warning modals and auto-end behavior from authoritative timer.
  // Both users derive warnings from the same backend remainingSeconds so they stay in sync.
  useEffect(() => {
    const remaining = authoritativeTimer?.remainingSeconds;
    if (typeof remaining !== "number") return;

    if (remaining > 300) {
      warningThresholdsRef.current.five = false;
      warningThresholdsRef.current.two = false;
      return;
    }

    if (!warningThresholdsRef.current.five && remaining <= 300 && remaining > 120) {
      warningThresholdsRef.current.five = true;
      setShowFiveMinuteWarning(true);
      toast.warning("Only 5 minutes left in this session.");
    }

    if (!warningThresholdsRef.current.two && remaining <= 120 && remaining > 0) {
      warningThresholdsRef.current.two = true;
      setShowTwoMinuteWarning(true);
      toast.warning("Only 2 minutes left in this session.");
    }
  }, [authoritativeTimer?.remainingSeconds]);

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
      setShowFiveMinuteWarning(false);
      setShowTwoMinuteWarning(false);

      // End the call when backend declares time over.
      // Use non-manual path so report/rating opens automatically per role.
      cutCall(false);
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

  //NOTE - emit event after selecting the clips (trainer only — trainee must not re-broadcast).
  // Deduplication prevents echo loops when references change without ID changes.
  useEffect(() => {
    if (accountType !== AccountType.TRAINER) return;
    const currentIds = (selectedClips || [])
      .map((c) => c?._id)
      .filter(Boolean)
      .sort()
      .join(",");
    if (currentIds === lastEmittedClipIdsRef.current) return;
    lastEmittedClipIdsRef.current = currentIds;
    if (clipsLoadedRef.current || selectedClips.length > 0) {
      emitVideoSelectEvent("clips", selectedClips);
    }
  }, [selectedClips, socket, fromUser?._id, toUser?._id, accountType]);

  // Select trainee clips that were attached to the booking before the session.
  // Backend can send this field as either `trainee_clips` (array of populated clip docs)
  // or legacy `trainee_clip`. We support both for backward compatibility.
  // FIX: Load clips as soon as startMeeting is available, not waiting for trainee to join.
  // This ensures clips are visible from the start of the session.
  // IMPORTANT: Use a ref to track if clips have been loaded to prevent clearing them
  // during subsequent startMeeting updates (race condition prevention).
  useEffect(() => {
    if (!startMeeting) return;

    const bookingTraineeClips =
      Array.isArray(startMeeting.trainee_clips) && startMeeting.trainee_clips.length > 0
        ? startMeeting.trainee_clips
        : Array.isArray(startMeeting.trainee_clip) && startMeeting.trainee_clip.length > 0
          ? startMeeting.trainee_clip
          : [];

    if (bookingTraineeClips.length > 0) {
      // Only load booking clips once — after the trainer manually manages clips,
      // subsequent startMeeting re-renders (e.g. Redux meetingDetails re-reference)
      // must NOT override the trainer's selection.
      if (bookingClipsLoadedOnceRef.current) return;
      bookingClipsLoadedOnceRef.current = true;

      console.log("[VideoCallUI] Loading trainee clips from booking (once)", {
        clipCount: bookingTraineeClips.length,
        clipIds: bookingTraineeClips.map(c => c._id),
      });
      // CRITICAL: Set refs BEFORE setting state to ensure socket handler has correct values
      selectedClipsRef.current = bookingTraineeClips;
      clipsLoadedRef.current = true;
      setSelectedClips(bookingTraineeClips);
    } else {
      // Only clear clips if we explicitly have empty arrays from backend AND
      // clips were previously loaded (prevents clearing during initial load when field might be missing)
      const hasEmptyClips = 
        (Array.isArray(startMeeting.trainee_clips) && startMeeting.trainee_clips.length === 0) ||
        (Array.isArray(startMeeting.trainee_clip) && startMeeting.trainee_clip.length === 0);
      
      // Only clear if backend explicitly says "no clips" AND we previously loaded clips
      // This prevents clearing clips during initial load when startMeeting might not have the field yet
      if (hasEmptyClips && clipsLoadedRef.current && selectedClips.length > 0) {
        console.log("[VideoCallUI] Backend sent empty clips array, clearing selected clips");
        setSelectedClips([]);
        selectedClipsRef.current = []; // Update ref
        clipsLoadedRef.current = false;
      }
    }
  }, [startMeeting]);

  // Once we clearly have the other side connected, clear any "waiting for ..."
  // style messages so users are not stuck with a stale banner.
  // FIX: Also check remoteVideoRef to catch cases where stream exists but state hasn't updated
  // ENHANCED: Also set bothUsersJoined if we have remote stream but flag isn't set yet
  useEffect(() => {
    const hasRemoteStream = !!remoteStream;
    const hasRemoteVideoElement = !!remoteVideoRef?.current?.srcObject;
    const hasRemoteConnection = !!isTraineeJoined || !!bothUsersJoined;

    const hasRemote = hasRemoteStream || hasRemoteVideoElement || hasRemoteConnection;

    // FALLBACK: If we have a remote stream but bothUsersJoined isn't set, set it now
    // This handles cases where backend doesn't emit ON_BOTH_JOIN but WebRTC stream is active
    if ((hasRemoteStream || hasRemoteVideoElement) && !bothUsersJoined) {
      console.log("[VideoCallUI] Fallback: Setting bothUsersJoined=true (remote stream detected but flag not set)", {
        hasRemoteStream,
        hasRemoteVideoElement,
        isTraineeJoined,
        bothUsersJoined,
      });
      setBothUsersJoined(true);
    }

    if (
      hasRemote &&
      displayMsg?.show &&
      typeof displayMsg?.msg === "string" &&
      displayMsg.msg.toLowerCase().includes("waiting for")
    ) {
      console.log("[VideoCallUI] Clearing waiting message - remote side connected", {
        hasRemoteStream,
        hasRemoteVideoElement,
        hasRemoteConnection,
        msg: displayMsg.msg,
      });
      setDisplayMsg({ show: false, msg: "" });
    }
  }, [remoteStream, isTraineeJoined, bothUsersJoined, displayMsg?.show, displayMsg?.msg]);

  // Track when both users joined (for buffer before fallback countdown; authoritative timer uses backend)
  useEffect(() => {
    if (bothUsersJoined) {
      if (bothUsersJoinedAtRef.current == null) bothUsersJoinedAtRef.current = Date.now();
    } else {
      bothUsersJoinedAtRef.current = null;
      setTimerBufferElapsed(false);
      setBufferCountdown(null);
    }
  }, [bothUsersJoined]);

  // Short client buffer before slot-based fallback countdown (authoritative timer bypasses this).
  const TIMER_BUFFER_SECONDS = 15;
  useEffect(() => {
    if (!bothUsersJoined) return;
    const t = setTimeout(() => setTimerBufferElapsed(true), TIMER_BUFFER_SECONDS * 1000);
    return () => clearTimeout(t);
  }, [bothUsersJoined]);

  // Buffer countdown (15, 14, … 0) for "Session starting in X seconds..."
  useEffect(() => {
    if (!bothUsersJoined || timerBufferElapsed) {
      setBufferCountdown(null);
      return;
    }
    const update = () => {
      if (bothUsersJoinedAtRef.current == null) return;
      const elapsed = Math.floor((Date.now() - bothUsersJoinedAtRef.current) / 1000);
      setBufferCountdown(Math.max(0, TIMER_BUFFER_SECONDS - elapsed));
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [bothUsersJoined, timerBufferElapsed]);

   

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

      const prevHs = socketCallLifecycleHandlersRef.current;
      if (prevHs) {
        socket.off("disconnect", prevHs.onDisconnect);
        socket.off("connect_error", prevHs.onConnectError);
        socket.off("reconnect_error", prevHs.onReconnectError);
        socket.off("reconnect_failed", prevHs.onReconnectFailed);
        socket.off("connect", prevHs.onConnect);
      }

      const onDisconnect = () => {
        toast.error("You have been disconnected from the server. Attempting to reconnect...");
        setCallState((prev) => (prev === "ended" ? prev : "reconnecting"));
      };

      // connect_error fires for every failed WebSocket attempt; Socket.IO then falls back to polling
      // and connects — so a generic toast here is a false alarm.
      const onConnectError = (err) => {
        if (process.env.NODE_ENV === "development") {
          console.error("Socket connect error:", err);
        }
        const msgLower = String(err?.message || "").toLowerCase();
        if (err?.type === "TransportError" || msgLower.includes("websocket")) {
          return;
        }
        if (/auth|unauthorized|jwt|token|forbidden|not authorized/i.test(msgLower)) {
          toast.error("Unable to verify your session. Please refresh and sign in again.");
        }
      };

      const onReconnectError = (err) => {
        if (process.env.NODE_ENV === "development") {
          console.error("Socket reconnect error:", err);
        }
      };

      const onReconnectFailed = () => {
        toast.error("Reconnection to the server failed. Please check your internet and try again.");
      };

      const onConnect = () => {
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
      };

      socketCallLifecycleHandlersRef.current = {
        onDisconnect,
        onConnectError,
        onReconnectError,
        onReconnectFailed,
        onConnect,
      };

      socket.on("disconnect", onDisconnect);
      socket.on("connect_error", onConnectError);
      socket.on("reconnect_error", onReconnectError);
      socket.on("reconnect_failed", onReconnectFailed);
      socket.on("connect", onConnect);

      // Start heartbeat: emit every 10 seconds to prove we're alive
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      heartbeatIntervalRef.current = setInterval(() => {
        if (socket && socket.connected) {
          socket.emit("HEARTBEAT");
        }
      }, 10000);

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
              console.log("[VideoCallUI] Received remote stream via call.on('stream')", {
                accountType,
                hasStream: !!remoteStream,
                currentBothUsersJoined: bothUsersJoined,
              });
              setIsTraineeJoined(true);
              setCallState("connected");
              // Check if both users are now joined (local user + remote user)
              // For trainer: they joined when handleStartCall ran, trainee joins here
              // For trainee: they joined when handleStartCall ran, trainer joins here
              if (accountType === AccountType.TRAINER) {
                // Trainer is already in call, trainee just joined
                console.log("[VideoCallUI] Trainer: Setting bothUsersJoined to true (trainee stream received)");
                setBothUsersJoined(true);
              } else {
                // Trainee is already in call, trainer just joined
                console.log("[VideoCallUI] Trainee: Setting bothUsersJoined to true (trainer stream received)");
                setBothUsersJoined(true);
              }
              setDisplayMsg({ show: false, msg: "" });
              
              // Set remote stream state first, then useEffect will sync to video element
              setRemoteStream(remoteStream);
              
              // Also set directly as fallback
              if (remoteVideoRef?.current) {
                console.log("[VideoCallUI] Directly setting remoteVideoRef.srcObject in call.on('stream')");
                remoteVideoRef.current.srcObject = remoteStream;
                // Ensure video plays
                remoteVideoRef.current.play().catch(err => {
                  console.warn("[VideoCallUI] Failed to play remote video in call.on('stream')", err);
                });
              }

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


  // Sync remote stream to video element (one ref; UserBox/UserBoxMini use internal refs so every video gets the stream)
  useEffect(() => {
    if (!remoteVideoRef?.current) return;

    if (remoteStream) {
      if (remoteVideoRef.current.srcObject !== remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      if (remoteVideoRef.current.paused) {
        remoteVideoRef.current.play().catch((err) => {
          if (err?.name !== "AbortError") console.warn("[VideoCallUI] Failed to play remote video", err);
        });
      }
      if (accountType === AccountType.TRAINEE) setIsModelOpen(true);
    } else {
      // Avoid clearing srcObject immediately when remoteStream is temporarily null.
      // UserBox components handle rendering based on isStreamOff and their own sync.
    }
  }, [remoteStream, accountType]);

  // Keep primary local <video> in sync for PeerJS outbound (ref must not point at a mini tile).
  useEffect(() => {
    if (!localVideoRef?.current || !localStream) return;
    if (localVideoRef.current.srcObject !== localStream) {
      localVideoRef.current.srcObject = localStream;
    }
    if (localVideoRef.current.paused) {
      localVideoRef.current.play().catch((err) => {
        if (err?.name !== "AbortError") {
          console.warn("[VideoCallUI] Failed to play local video", err);
        }
      });
    }
  }, [localStream]);

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

      if (!peer || !peerId) {
        console.error('[VideoCall] Invalid peer or peerId', { peer, peerId });
        return;
      }

      // Check if peer is still open/connected
      if (peer.destroyed || peer.disconnected) {
        console.error('[VideoCall] Peer is destroyed or disconnected');
        return;
      }

      const outboundStream =
        localVideoRef.current?.srcObject || localStream || null;
      if (!outboundStream) {
        console.error('[VideoCall] Local video stream not available');
        return;
      }

      isConnectingRef.current = true;

      const call = peer.call(peerId, outboundStream);
      
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
          console.log("[VideoCallUI] Received remote stream via connectToPeer", {
            accountType,
            hasStream: !!remoteStream,
            currentBothUsersJoined: bothUsersJoined,
          });
          setDisplayMsg({ show: false, msg: "" });
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          setIsTraineeJoined(true);
          console.log("[VideoCallUI] Setting bothUsersJoined to true (remote stream received)");
          setBothUsersJoined(true);
          
          // Set remote stream state first, then useEffect will sync to video element
          setRemoteStream(remoteStream);
          
          // Also set directly as fallback
          if (remoteVideoRef?.current) {
            console.log("[VideoCallUI] Directly setting remoteVideoRef.srcObject in connectToPeer");
            remoteVideoRef.current.srcObject = remoteStream;
            // Ensure video plays
            remoteVideoRef.current.play().catch(err => {
              console.warn("[VideoCallUI] Failed to play remote video in connectToPeer", err);
            });
          }
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
  
  // Start lesson countdown based on backend timer info (authoritative).
  // Prefer remainingSeconds from the server so we are not sensitive to client
  // clock skew; we simply count down locally from the server-provided value.
  const startLessonTimer = useCallback(
    ({ sessionId, startedAt, duration, remainingSeconds }) => {
      if (!sessionId || !duration) return;

      if (lessonTimerIntervalRef.current) {
        clearInterval(lessonTimerIntervalRef.current);
        lessonTimerIntervalRef.current = null;
      }

      const remainingAtStart =
        typeof remainingSeconds === "number" && remainingSeconds >= 0
          ? Math.floor(remainingSeconds)
          : Math.floor(duration);

      // Initial paint immediately (based on authoritative backend time)
      const now = Date.now();
      const elapsed = startedAt ? Math.floor((now - startedAt) / 1000) : 0;
      const initialRemaining = Math.max(0, remainingAtStart - elapsed);

      const updateTimer = () => {
        const current = Date.now();
        const elapsedSeconds = startedAt
          ? Math.floor((current - startedAt) / 1000)
          : 0;
        const currentRemaining = Math.max(0, remainingAtStart - elapsedSeconds);

        setAuthoritativeTimer({
          sessionId,
          startedAt,
          duration,
          remainingSeconds: currentRemaining,
        });

        if (currentRemaining <= 0 && lessonTimerIntervalRef.current) {
          clearInterval(lessonTimerIntervalRef.current);
          lessonTimerIntervalRef.current = null;
        }
      };

      // Hide any "waiting" messages once the authoritative timer starts
      setDisplayMsg({ show: false, msg: "" });
      // Initial state
      setAuthoritativeTimer({
        sessionId,
        startedAt,
        duration,
        remainingSeconds: initialRemaining,
      });
      lessonTimerIntervalRef.current = setInterval(updateTimer, 1000);
    },
    []
  );

  const requestCoachTimerStart = useCallback(() => {
    if (!socket || !id) return;
    socket.emit("LESSON_TIMER_START_REQUEST", { sessionId: id });
  }, [socket, id]);

  const requestCoachTimerPause = useCallback(() => {
    if (!socket || !id) return;
    socket.emit("LESSON_TIMER_PAUSE_REQUEST", { sessionId: id });
  }, [socket, id]);

  const requestCoachTimerResume = useCallback(() => {
    if (!socket || !id) return;
    socket.emit("LESSON_TIMER_RESUME_REQUEST", { sessionId: id });
  }, [socket, id]);

  useEffect(() => {
    if (!socket) return;

    const handleBothJoin = (data) => {
      console.log("[VideoCallUI] Received ON_BOTH_JOIN event from backend", {
        data,
        accountType,
        currentBothUsersJoined: bothUsersJoined,
      });

      // CRITICAL FIX: Clear waiting messages when both users join, don't set a new message
      // The backend confirms both users are in the session, so hide any waiting/connecting messages
      setDisplayMsg({ show: false, msg: "" });

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

  // TIMER_STARTED and other timer state events are handled in the
  // unified lesson timer sync effect below.

  useEffect(() => {
    if (!socket || !id) return;

    const handleLessonStateSync = (state) => {
      if (!state || String(state.sessionId) !== String(id)) return;

      const {
        status,
        startedAt,
        duration,
        remainingSeconds,
        trainerConnected,
        traineeConnected,
      } = state;

      // Use backend presence flags as the source of truth for "both joined".
      // This avoids relying on ON_BOTH_JOIN, which can be missed depending on routing.
      setBothUsersJoined(!!trainerConnected && !!traineeConnected);
      setLessonTimerStatus(status || "waiting");

      if (status === "running" && startedAt && duration) {
        startLessonTimer({ sessionId: id, startedAt, duration, remainingSeconds });
      } else if (status === "paused") {
        if (lessonTimerIntervalRef.current) {
          clearInterval(lessonTimerIntervalRef.current);
          lessonTimerIntervalRef.current = null;
        }
        setAuthoritativeTimer({
          sessionId: id,
          startedAt: null,
          duration: duration || remainingSeconds || 0,
          remainingSeconds: Math.max(0, Math.floor(remainingSeconds || 0)),
        });
      } else if (status === "ended") {
        if (lessonTimerIntervalRef.current) {
          clearInterval(lessonTimerIntervalRef.current);
          lessonTimerIntervalRef.current = null;
        }
        setAuthoritativeTimer({
          sessionId: id,
          startedAt: null,
          duration: duration || 0,
          remainingSeconds: 0,
        });
      }
    };

    const handleTimerStarted = (data) => {
      if (!data || String(data.sessionId) !== String(id)) return;
      setLessonTimerStatus("running");
      // Apply payload immediately so the UI counts down without waiting on LESSON_STATE_REQUEST.
      if (data.duration != null) {
        startLessonTimer({
          sessionId: id,
          startedAt: data.startedAt,
          duration: data.duration,
          remainingSeconds: data.remainingSeconds,
        });
      } else {
        socket.emit("LESSON_STATE_REQUEST", { sessionId: id });
      }
    };

    const handleTimerPaused = (data) => {
      if (!data || String(data.sessionId) !== String(id)) return;
      setLessonTimerStatus("paused");
      if (lessonTimerIntervalRef.current) {
        clearInterval(lessonTimerIntervalRef.current);
        lessonTimerIntervalRef.current = null;
      }
      setAuthoritativeTimer((prev) => ({
        sessionId: id,
        startedAt: null,
        duration: prev?.duration || data.duration || 0,
        remainingSeconds: Math.max(0, Math.floor(data.remainingSeconds || 0)),
      }));
    };

    const handleTimerResumed = (data) => {
      if (!data || String(data.sessionId) !== String(id)) return;
      setLessonTimerStatus("running");
      startLessonTimer({
        sessionId: id,
        startedAt: data.startedAt,
        duration: data.duration,
        remainingSeconds: data.remainingSeconds,
      });
    };

    const handleTimerEnded = (data) => {
      if (!data || String(data.sessionId) !== String(id)) return;
      setLessonTimerStatus("ended");
      if (lessonTimerIntervalRef.current) {
        clearInterval(lessonTimerIntervalRef.current);
        lessonTimerIntervalRef.current = null;
      }
      setAuthoritativeTimer((prev) => ({
        sessionId: id,
        startedAt: null,
        duration: prev?.duration || 0,
        remainingSeconds: 0,
      }));
    };

    const handleTimerError = (data) => {
      if (data?.message) {
        toast.error(data.message);
        autoLessonTimerRequestedRef.current = false;
      }
    };

    socket.emit("LESSON_STATE_REQUEST", { sessionId: id });
    socket.on("LESSON_STATE_SYNC", handleLessonStateSync);
    socket.on("TIMER_STARTED", handleTimerStarted);
    socket.on("LESSON_TIME_PAUSED", handleTimerPaused);
    socket.on("LESSON_TIME_RESUMED", handleTimerResumed);
    socket.on("LESSON_TIME_ENDED", handleTimerEnded);
    socket.on("LESSON_TIMER_ERROR", handleTimerError);

    return () => {
      socket.off("LESSON_STATE_SYNC", handleLessonStateSync);
      socket.off("TIMER_STARTED", handleTimerStarted);
      socket.off("LESSON_TIME_PAUSED", handleTimerPaused);
      socket.off("LESSON_TIME_RESUMED", handleTimerResumed);
      socket.off("LESSON_TIME_ENDED", handleTimerEnded);
      socket.off("LESSON_TIMER_ERROR", handleTimerError);
    };
  }, [socket, id, startLessonTimer]);

  useEffect(() => {
    autoLessonTimerRequestedRef.current = false;
  }, [id]);

  // Auto-start backend lesson timer for the trainer after both sides joined + client buffer
  // (avoids relying on an easy-to-miss manual "Play" on the timer chip).
  useEffect(() => {
    if (accountType !== AccountType.TRAINER) return;
    if (!socket?.connected || !id) return;
    if (!bothUsersJoined || !timerBufferElapsed) return;
    if (lessonTimerStatus !== "waiting") return;
    if (authoritativeTimer?.remainingSeconds != null) return;
    if (autoLessonTimerRequestedRef.current) return;
    autoLessonTimerRequestedRef.current = true;
    socket.emit("LESSON_TIMER_START_REQUEST", { sessionId: id });
  }, [
    accountType,
    socket,
    id,
    bothUsersJoined,
    timerBufferElapsed,
    lessonTimerStatus,
    authoritativeTimer?.remainingSeconds,
  ]);

  // Periodically re-sync lesson state from backend while in call to prevent drift
  // between users if any timer event was delayed/missed on one client.
  useEffect(() => {
    if (!socket || !id) return;
    const syncInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit("LESSON_STATE_REQUEST", { sessionId: id });
      }
    }, 10000);
    return () => clearInterval(syncInterval);
  }, [socket, id]);

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

        // Use peerId if provided (for unique device connections), otherwise fallback to from_user
        // This allows same user to join from multiple devices
        const targetPeerId = peerId || from_user;
        
        if (!targetPeerId) {
          console.error('[VideoCall] No valid peerId or from_user in userInfo:', userInfo);
          return;
        }

        // Don't connect to ourselves - check both peerId and from_user
        if (!peerRef.current) {
          console.error('[VideoCall] Peer ref not available in handleCallJoin');
          return;
        }
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

        showPartnerJoinedPrompt();

        if (!(peerRef && peerRef.current)) {
          console.error('[VideoCall] Peer ref not available');
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

    const handleStopFeed = ({ feedStatus, userInfo }) => {
      // Only apply remote feed status when event comes from the other participant.
      // Ignore echoed self-events so we don't incorrectly hide the remote user box.
      if (!userInfo?.from_user || String(userInfo.from_user) !== String(toUser?._id)) {
        return;
      }
      setIsRemoteStreamOff(feedStatus);
    };

    const handleCallClose = () => {
      setDisplayMsg({
        show: true,
        msg: `${toUser?.fullname} left the meeting. Waiting for them to join`,
      });
    };

    const handleParticipantStatusChanged = (payload) => {
      if (!payload?.sessionId || String(payload.sessionId) !== String(id)) return;
      if (String(payload.userId) !== String(toUser?._id)) return;
      showPartnerJoinedPrompt();
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
    socket.on("PARTICIPANT_STATUS_CHANGED", handleParticipantStatusChanged);
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
        socket.off("PARTICIPANT_STATUS_CHANGED", handleParticipantStatusChanged);
        socket.off("PARTICIPANT_STALE", handleParticipantStale);
        socket.off(EVENTS.VIDEO_CALL.ON_OFFER, handleOffer);
        socket.off(EVENTS.VIDEO_CALL.ON_ANSWER, handleAnswer);
        socket.off(EVENTS.VIDEO_CALL.ON_ICE_CANDIDATE, handleIceCandidate);
        socket.off(EVENTS.VIDEO_CALL.STOP_FEED, handleStopFeed);
        socket.off(EVENTS.VIDEO_CALL.ON_CLOSE, handleCallClose);
      }
      // Reset connection state on cleanup
      isConnectingRef.current = false;
    };
  }, [socket, toUser, toUser?._id, id, connectToPeer, showPartnerJoinedPrompt]);

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
    if (session_end_time) {
      // Support both "HH:MM" and ISO strings (e.g. instant lessons)
      if (typeof session_end_time === "string" && session_end_time.includes("T")) {
        try {
          const dt = DateTime.fromISO(session_end_time, { zone: "utc" });
          if (dt.isValid) {
            // Convert from UTC to the viewer's local timezone
            const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            setSessionEndTime(dt.setZone(localZone).toFormat("HH:mm"));
          } else {
            setSessionEndTime(session_end_time);
          }
        } catch {
          setSessionEndTime(session_end_time);
        }
      } else {
        // session_end_time is a "HH:MM" string in the booking's time_zone.
        // Convert that booked time into the viewer's local timezone so that
        // trainer and trainee each see the correct local session time.
        try {
          const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          if (time_zone && session_end_time.includes(":")) {
            const dtInBookingZone = DateTime.fromFormat(
              session_end_time,
              "HH:mm",
              { zone: time_zone }
            );
            if (dtInBookingZone.isValid) {
              const dtLocal = dtInBookingZone.setZone(localZone);
              setSessionEndTime(dtLocal.toFormat("HH:mm"));
              return;
            }
          }
          // Fallback to raw value if anything looks off
          setSessionEndTime(session_end_time);
        } catch {
          setSessionEndTime(session_end_time);
        }
      }
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

  // Keep numeric countdown in sync with the current session end time for
  // scheduled sessions. This is ONLY a fallback when we do NOT have the
  // authoritative backend timer (TIMER_STARTED). When authoritativeTimer
  // is present, we use that instead.
  useEffect(() => {
    // If backend timer isn't running yet and both users haven't joined,
    // we keep the timer hidden (waiting state). If backend timer exists,
    // don't clear it just because `bothUsersJoined` is still false; this
    // prevents showing late/incorrect remaining time.
    if (!bothUsersJoined && authoritativeTimer?.remainingSeconds == null) {
      setTimeRemaining(null);
      return;
    }

    // If backend timer is running, don't override it with a local estimate.
    if (authoritativeTimer?.remainingSeconds != null) {
      return;
    }

    // Don't show a countdown during the buffer window.
    if (!timerBufferElapsed) {
      setTimeRemaining(null);
      return;
    }

    const parseHHMMToMinutes = (value) => {
      if (typeof value !== "string") return null;
      // Strictly match "HH:MM" (no ISO datetime strings).
      const match = value.match(/^(\d{1,2}):(\d{2})$/);
      if (!match) return null;
      const h = Number(match[1]);
      const m = Number(match[2]);
      if (Number.isNaN(h) || Number.isNaN(m)) return null;
      if (h < 0 || h > 23 || m < 0 || m > 59) return null;
      return h * 60 + m;
    };

    const timerStartAtMs =
      (bothUsersJoinedAtRef.current ?? Date.now()) +
      TIMER_BUFFER_SECONDS * 1000;

    // Derive the lesson duration from the selected session start/end.
    // Then start the countdown at (bothUsersJoined + buffer).
    let durationSeconds = null;

    const startMinutes = parseHHMMToMinutes(session_start_time);
    const endMinutes = parseHHMMToMinutes(session_end_time);
    if (startMinutes != null && endMinutes != null) {
      let durationMinutes = endMinutes - startMinutes;
      if (durationMinutes < 0) durationMinutes += 24 * 60;
      durationSeconds = Math.max(0, Math.floor(durationMinutes * 60));
    } else if (typeof sessionEndTime === "string" && sessionEndTime.includes(":")) {
      // Fallback: derive remaining duration from sessionEndTime relative to the buffer start.
      const endMinutesLocal = parseHHMMToMinutes(sessionEndTime);
      if (endMinutesLocal != null) {
        const endHours = Math.floor(endMinutesLocal / 60);
        const endMins = endMinutesLocal % 60;
        const now = new Date(timerStartAtMs);
        const endTime = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          endHours,
          endMins
        );
        durationSeconds = Math.max(
          0,
          Math.floor((endTime.getTime() - timerStartAtMs) / 1000)
        );
      }
    }

    if (!durationSeconds) return;

    const updateRemaining = () => {
      const elapsedSeconds = Math.floor(
        (Date.now() - timerStartAtMs) / 1000
      );
      // Clamp so it never goes above the original duration.
      const remainingSeconds = Math.max(
        0,
        Math.min(durationSeconds, durationSeconds - elapsedSeconds)
      );
      setTimeRemaining(remainingSeconds);
    };

    updateRemaining();
    const intervalId = setInterval(updateRemaining, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [
    session_start_time,
    session_end_time,
    bothUsersJoined,
    timerBufferElapsed,
    authoritativeTimer?.remainingSeconds,
  ]);

  // Use authoritative timer (from TIMER_STARTED) for countdown when available, so both trainer and trainee see the timer
  useEffect(() => {
    if (authoritativeTimer?.remainingSeconds != null) {
      setTimeRemaining(authoritativeTimer.remainingSeconds);
    }
  }, [authoritativeTimer?.remainingSeconds]);

   

  const waitingMessageSuppressedRef = useRef(false);

  // Sync callState to displayMsg so users see connection status
  useEffect(() => {
    if (callState === "connecting" && !displayMsg?.show && !waitingMessageSuppressedRef.current) {
      setDisplayMsg({
        show: true,
        msg: `Connecting to ${toUser?.fullname || "the other participant"}...`,
      });
    } else if (callState === "reconnecting") {
      setDisplayMsg({
        show: true,
        msg: "Connection lost. Reconnecting...",
      });
    } else if (callState === "connected" && displayMsg?.show) {
      // Clear any waiting/connecting message when we're connected (not just "Connecting...")
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

  // Auto-hide "Waiting for..." / "Connecting to..." after 20s so users aren't stuck
  const WAITING_MESSAGE_TIMEOUT_MS = 20000;
  useEffect(() => {
    const isWaitingMsg =
      displayMsg?.show &&
      typeof displayMsg?.msg === "string" &&
      (displayMsg.msg.toLowerCase().includes("waiting for") || displayMsg.msg.toLowerCase().includes("connecting to"));
    if (!isWaitingMsg) return;
    const t = setTimeout(() => {
      console.log("[VideoCallUI] Auto-hiding waiting message after timeout", { msg: displayMsg?.msg });
      waitingMessageSuppressedRef.current = true;
      setDisplayMsg({ show: false, msg: "" });
    }, WAITING_MESSAGE_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [displayMsg?.show, displayMsg?.msg]);

  return (
    <div
      className="video-call-container"
      style={{
        alignItems: isMaximized ? "flex-start" : "center",
      }}
    >
      {/* 
        Show the center waiting/connection message ONLY while the call is still
        being established. Once both parties have clearly joined the call,
        we hide this overlay so it never blocks the UI even if some internal
        callState or timers briefly say "connecting"/"waiting".
        
        CRITICAL: Check bothUsersJoined AND remoteStream to ensure we hide the message
        when either backend confirms both joined OR WebRTC stream is active.
      */}
      {(() => {
        const clipModeActive =
          selectedClips && Array.isArray(selectedClips) && selectedClips.length > 0;

        const shouldShowMessage = 
          !clipModeActive && // Never show waiting/connecting overlay when we're in ClipMode review
          displayMsg?.show && 
          displayMsg?.msg && 
          !bothUsersJoined && 
          !isTraineeJoined && 
          !remoteStream && 
          !remoteVideoRef?.current?.srcObject;
        
        return shouldShowMessage;
      })() && (
        <CenterMessage
          message={displayMsg.msg}
          type="waiting"
          showSpinner={true}
        />
      )}
      {selectedClips && Array.isArray(selectedClips) && selectedClips.length > 0 ? (
        <ClipModeCall
          sessionId={id}
          timeRemaining={timeRemaining}
          bothUsersJoined={bothUsersJoined}
          bufferSecondsRemaining={
            lessonTimerStatus === "waiting" &&
            authoritativeTimer?.remainingSeconds == null
              ? bufferCountdown
              : null
          }
          lessonTimerStatus={lessonTimerStatus}
          onStartTimer={requestCoachTimerStart}
          onPauseTimer={requestCoachTimerPause}
          onResumeTimer={requestCoachTimerResume}
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
          bufferSecondsRemaining={
            lessonTimerStatus === "waiting" &&
            authoritativeTimer?.remainingSeconds == null
              ? bufferCountdown
              : null
          }
          lessonTimerStatus={lessonTimerStatus}
          onStartTimer={requestCoachTimerStart}
          onPauseTimer={requestCoachTimerPause}
          onResumeTimer={requestCoachTimerResume}
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
            ? "8px 15px 15px 15px" // Extra bottom padding on mobile for browser UI
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
            setSelectedClips([]);
            selectedClipsRef.current = [];
            clipsLoadedRef.current = false;
            lastEmittedClipIdsRef.current = '';
            bookingClipsLoadedOnceRef.current = true;
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
              selectedClipsRef.current = [];
              clipsLoadedRef.current = false;
              lastEmittedClipIdsRef.current = ''; // Allow re-emitting same clips if re-selected
              bookingClipsLoadedOnceRef.current = true; // Prevent startMeeting from reloading booking clips
              emitVideoSelectEvent("clips", []);
              setIsOpenConfirm(false);
              // Don't immediately re-open clip selector — trainer returns to video streaming view.
              // They can enter clip mode again by clicking the clip button.
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
                          // Update refs before state so emit useEffect and socket handler see correct values
                          selectedClipsRef.current = selectClips;
                          clipsLoadedRef.current = true;
                          bookingClipsLoadedOnceRef.current = true; // Protect from startMeeting override
                          setSelectedClips(selectClips);
                          setSelectClips([]); // Reset picker for next open
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
          scrollableBody={true}
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

      <Modal
        isOpen={peerJoinedModalOpen}
        toggle={() => setPeerJoinedModalOpen(false)}
        centered
      >
        <ModalHeader toggle={() => setPeerJoinedModalOpen(false)}>
          Join the meeting
        </ModalHeader>
        <ModalBody>
          <p className="mb-0" style={{ fontSize: "1rem", color: "#444", lineHeight: 1.5 }}>
            <strong>{peerJoinedModalName}</strong> has joined the session. Please stay on this page so your cameras can connect.
          </p>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={() => setPeerJoinedModalOpen(false)}>
            OK
          </Button>
        </ModalFooter>
      </Modal>

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

      {/* 5-minute warning modal */}
      <Modal isOpen={showFiveMinuteWarning} centered>
        <ModalHeader style={{ backgroundColor: "#ffc107", color: "#ffffff", borderBottom: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <i className="fa fa-exclamation-triangle" aria-hidden="true" style={{ fontSize: "24px" }}></i>
            <span style={{ fontSize: "18px", fontWeight: "600" }}>5 Minutes Left</span>
          </div>
        </ModalHeader>
        <ModalBody style={{ padding: "1.5rem", textAlign: "center", color: "#555" }}>
          Session will end in 5 minutes. Please wrap up your discussion.
        </ModalBody>
        <ModalFooter style={{ borderTop: "none", justifyContent: "center" }}>
          <Button color="secondary" onClick={() => setShowFiveMinuteWarning(false)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>

      {/* 2-minute warning modal */}
      <Modal isOpen={showTwoMinuteWarning} centered>
        <ModalHeader style={{ backgroundColor: "#fd7e14", color: "#ffffff", borderBottom: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <i className="fa fa-clock-o" aria-hidden="true" style={{ fontSize: "24px" }}></i>
            <span style={{ fontSize: "18px", fontWeight: "600" }}>2 Minutes Left</span>
          </div>
        </ModalHeader>
        <ModalBody style={{ padding: "1.5rem", textAlign: "center", color: "#555" }}>
          Session is about to end. The call will close automatically at 00:00.
        </ModalBody>
        <ModalFooter style={{ borderTop: "none", justifyContent: "center" }}>
          <Button color="secondary" onClick={() => setShowTwoMinuteWarning(false)}>
            Close
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