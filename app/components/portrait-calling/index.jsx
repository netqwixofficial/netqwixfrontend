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
import { getTraineeClips } from "../NavHomePage/navHomePage.api";
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

  // selects trainee clips on load

  useEffect(() => {
    if (isTraineeJoined) {
      if (startMeeting?.trainee_clip?.length > 0) {
        setSelectedClips(startMeeting.trainee_clip);
      } else {
        setSelectedClips([]);
      } // Set the selected clips immediately
    }
  }, [accountType, startMeeting, isTraineeJoined]); // Dependencies to ensure it updates correctly

   

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
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

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
        toast.error("You have been disconnected from the server. Please reconnect.");
        // Additional logic to handle the disconnect (e.g., retry connection or show UI)
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

      // Generate unique Peer ID per session/device to allow same user from multiple devices
      // Format: userId_sessionId_timestamp_random
      // This ensures each device/session combination gets a unique Peer ID
      // This fixes the issue where same user joining from 2 different devices causes 'unavailable-id' error
      const uniquePeerId = `${fromUser._id}_${id}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      const peer = new Peer(uniquePeerId, {
        config: { iceServers: startMeeting.iceServers },
      });

      peer.on("error", (error) => {
        console.error("Peer error:", error);
         

        switch (error.type) {
          case 'browser-incompatible':
            toast.error("The browser does not support some or all WebRTC features.");
            break;
          case 'disconnected':
            toast.error("You have been disconnected from the server. No new connections can be made.");
            break;
          case 'invalid-id':
            toast.error("The ID contains illegal characters.");
            break;
          case 'invalid-key':
            toast.error("The API key contains illegal characters or is not recognized.");
            break;
          case 'network':
            toast.error("Lost or unable to establish a connection to the signaling server.");
            break;
          case 'peer-unavailable':
            toast.error("The peer you're trying to connect to does not exist.");
            break;
          case 'ssl-unavailable':
            toast.error("SSL is unavailable on the server. Consider using a custom PeerServer.");
            break;
          case 'server-error':
            toast.error("Unable to reach the server. Please try again later.");
            break;
          case 'socket-error':
            toast.error("A socket error occurred.");
            break;
          case 'socket-closed':
            toast.error("The underlying socket was closed unexpectedly.");
            break;
          case 'unavailable-id':
            // This should rarely happen now with unique Peer IDs, but keep the error handling
            // It might occur if there's a race condition or if cleanup didn't happen properly
            console.warn("Peer ID unavailable - this might be a cleanup issue. Retrying with new ID...");
            // Don't set userAlreadyInCall to true immediately - allow retry
            toast.error("Connection issue detected. Please try refreshing the page.");
            break;
          case 'webrtc':
            toast.error("A native WebRTC error occurred.");
            break;
          default:
            toast.error("An error occurred while trying to start the call.");
        }
      });

      peerRef.current = peer;

      // Handle Peer events
      peer.on("open", (peerId) => {
        if (socket) {
          // Send both user IDs (for backend matching) and the actual Peer ID (for peer-to-peer connection)
          socket.emit("ON_CALL_JOIN", {
            userInfo: { 
              from_user: fromUser._id, 
              to_user: toUser._id,
              sessionId: id,
              peerId: peerId  // Send the actual Peer ID so backend can route connections correctly
            },
          });
        }
      });



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
      // Check if we already have an active call to this peer
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
            // Call is still active or connecting, skip duplicate
            console.log('[VideoCall] Active call already exists for peer:', peerId, 'state:', connectionState);
            return;
          }
        } else if (existingCall && !existingCall.peerConnection) {
          // Call exists but no peerConnection yet (might be initializing), allow it to proceed
          console.log('[VideoCall] Call exists but no peerConnection yet, allowing connection attempt');
        }
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

    // Register event listeners
    socket.on("ON_CALL_JOIN", handleCallJoin);
    socket.on(EVENTS.VIDEO_CALL.ON_OFFER, handleOffer);
    socket.on(EVENTS.VIDEO_CALL.ON_ANSWER, handleAnswer);
    socket.on(EVENTS.VIDEO_CALL.ON_ICE_CANDIDATE, handleIceCandidate);
    socket.on(EVENTS.VIDEO_CALL.STOP_FEED, handleStopFeed);
    socket.on(EVENTS.VIDEO_CALL.ON_CLOSE, handleCallClose);

    // Cleanup: Remove all listeners when component unmounts or dependencies change
    return () => {
      if (socket) {
        socket.off("ON_CALL_JOIN", handleCallJoin);
        socket.off(EVENTS.VIDEO_CALL.ON_OFFER, handleOffer);
        socket.off(EVENTS.VIDEO_CALL.ON_ANSWER, handleAnswer);
        socket.off(EVENTS.VIDEO_CALL.ON_ICE_CANDIDATE, handleIceCandidate);
        socket.off(EVENTS.VIDEO_CALL.STOP_FEED, handleStopFeed);
        socket.off(EVENTS.VIDEO_CALL.ON_CLOSE, handleCallClose);
      }
      // Reset connection state on cleanup
      isConnectingRef.current = false;
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
    if (fromUser && toUser && startMeeting?.iceServers && accountType) {
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
    }
  }, [startMeeting, accountType]);
   
  // Add this useEffect to handle session extension when both parties join
  useEffect(() => {
    if (extended_session_end_time) {
      setSessionEndTime(extended_session_end_time);
    } else {
      if (isTraineeJoined && accountType === AccountType.TRAINEE && session_start_time && session_end_time && id) {
        extendSessionTime();
        setIsSessionExtended(true);
      }
    }
  }, [isTraineeJoined, extended_session_end_time, session_start_time, session_end_time, id, accountType]);

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

   
   
  return (
    <div
      className="video-call-container"
      style={{
        alignItems: isMaximized ? "normal" : "center",
        margin: isLandscape ? "auto" : "none",
        width: isLandscape ? "50%" : "100%",
        height: "100vh",
        maxHeight: "100vh",
        overflow: "hidden",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
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
        <div style={{ flexShrink: 0, width: "100%", padding: "8px 15px" }}>
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
                      Select one video to do a full-screen analysis or select
                      two videos to do a comparison.
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
                <Nav tabs className="clip-selection-tabs" style={{
                  justifyContent: 'center',
                  flexWrap: width1200 ? "wrap" : "nowrap",
                  gap: "8px",
                  marginBottom: "1.5rem"
                }}>
                  <NavItem className="mb-2" style={{
                    width: width1200 ? "100%" : "auto",
                    flex: width1200 ? "1 1 100%" : "1 1 auto"
                  }}>
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
                  <NavItem className="mb-2" style={{
                    width: width1200 ? "100%" : "auto",
                    flex: width1200 ? "1 1 100%" : "1 1 auto"
                  }}>
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
                      Enthusiast
                    </NavLink>
                  </NavItem>
                  <NavItem className="mb-2" style={{
                    width: width1200 ? "100%" : "auto",
                    flex: width1200 ? "1 1 100%" : "1 1 auto"
                  }}>
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
                    {clips && clips.length !== 0 && (
                      <div className="d-flex justify-content-center w-100 p-3" style={{
                        borderTop: "1px solid #e0e0e0",
                        gap: "1rem"
                      }}>
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
                              {cl?._id?.fullname || "Enthusiast Clips"}
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
                    {traineeClip && traineeClip.length !== 0 && (
                      <div className="d-flex justify-content-center w-100 p-3" style={{
                        borderTop: "1px solid #e0e0e0",
                        gap: "1rem"
                      }}>
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
                    {netquixVideos && netquixVideos?.length !== 0 && (
                      <div className="d-flex justify-content-center w-100 p-3" style={{
                        borderTop: "1px solid #e0e0e0",
                        gap: "1rem"
                      }}>
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
