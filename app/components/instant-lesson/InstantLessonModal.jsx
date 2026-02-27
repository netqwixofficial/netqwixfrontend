import React, { useEffect, useState, useRef, useContext, useCallback } from "react";
import { Modal, ModalBody, ModalFooter, Button, ModalHeader } from "reactstrap";
import { useAppDispatch, useAppSelector } from "../../store";
import { instantLessonState, instantLessonAction, UI_STATES } from "./instantLesson.slice";
import { AccountType } from "../../common/constants";
import { Utils } from "../../../utils/utils";
import { SocketContext } from "../socket/SocketProvider";
import { EVENTS } from "../../../helpers/events";
import { toast } from "react-toastify";
import { useRouter } from "next/router";
import CenterMessage from "../common/CenterMessage";
import "./InstantLessonModal.scss";

const InstantLessonModal = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const socket = useContext(SocketContext);
  const { isIncoming, uiState, lessonId, expiresAt, traineeInfo, lessonType, duration, requestData, errorMessage } = useAppSelector(instantLessonState);
  const { accountType } = useAppSelector((state) => state.auth);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isPulsing, setIsPulsing] = useState(false);
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);
  const audioRef = useRef(null);
  const intervalRef = useRef(null);
  const hasEmittedExpireRef = useRef(false);

  // Fallback beep sound generator - using useCallback to prevent recreation
  const playBeepSound = useCallback(() => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800; // Beep frequency
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
      // Web Audio API not supported or blocked
      console.log("Could not play notification sound:", error);
    }
  }, []);

  // Play sound alert once when request arrives
  useEffect(() => {
    if (isIncoming && uiState === UI_STATES.INCOMING) {
      // Try to play audio file if available
      if (audioRef.current) {
        try {
          // Set volume (0.0 to 1.0)
          audioRef.current.volume = 0.7;
          audioRef.current.play().catch((err) => {
            // Auto-play may be blocked by browser, fallback to beep
            console.log("Audio play blocked, using fallback beep:", err);
            playBeepSound();
          });
        } catch (error) {
          console.log("Error playing audio, using fallback beep:", error);
          playBeepSound();
        }
      } else {
        // Fallback: Generate beep sound using Web Audio API
        playBeepSound();
      }
      
      setIsPulsing(true);
      // Stop pulsing after animation completes
      const pulseTimer = setTimeout(() => setIsPulsing(false), 2000);
      hasEmittedExpireRef.current = false;
      
      return () => {
        clearTimeout(pulseTimer);
      };
    }
  }, [isIncoming, uiState, playBeepSound]);

  // Countdown timer - pauses when accepting/declining/expired
  useEffect(() => {
    if (!isIncoming || !expiresAt) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Don't update timer if paused (accepting, declining, expired, error)
    const isPaused = [
      UI_STATES.ACCEPTING,
      UI_STATES.DECLINING,
      UI_STATES.EXPIRED,
      UI_STATES.ERROR,
    ].includes(uiState);

    if (isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
      setTimeRemaining(remaining);

      if (remaining <= 0 && !hasEmittedExpireRef.current) {
        hasEmittedExpireRef.current = true;
        
        // Update UI state
        dispatch(instantLessonAction.setExpired());

        // Emit expire event via socket
        if (socket && lessonId) {
          socket.emit(EVENTS.INSTANT_LESSON.EXPIRE, {
            lessonId,
            coachId: requestData?.coachId,
            traineeId: traineeInfo?._id,
            requestData,
          });
        }
      }
    };

    updateTimer();
    intervalRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isIncoming, expiresAt, uiState, dispatch, socket, lessonId, requestData, traineeInfo]);

  // Auto-close modal after expiration message
  useEffect(() => {
    if (uiState === UI_STATES.EXPIRED) {
      const timer = setTimeout(() => {
        dispatch(instantLessonAction.clearIncomingRequest());
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [uiState, dispatch]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAccept = useCallback(async () => {
    // Prevent double actions
    if (uiState !== UI_STATES.INCOMING) {
      return;
    }

    try {
      // Immediately update UI state - but don't redirect
      dispatch(instantLessonAction.setAccepting());

      // Emit accept event via socket
      if (socket && lessonId) {
        socket.emit(EVENTS.INSTANT_LESSON.ACCEPT, {
          lessonId,
          coachId: requestData?.coachId,
          traineeId: traineeInfo?._id,
          requestData,
        });
      }

      // Show success message but don't redirect
      toast.success("Lesson accepted! Waiting for trainee to complete video selection...");
      
      // Keep modal open - don't close or redirect
      // The modal will show waiting state until trainee joins
    } catch (error) {
      console.error("Error accepting lesson:", error);
      dispatch(instantLessonAction.setError({ message: "Failed to accept lesson request" }));
      toast.error("Failed to accept lesson request. Please try again.");
    }
  }, [uiState, dispatch, socket, lessonId, requestData, traineeInfo]);

  const handleDeclineClick = useCallback(() => {
    // Show confirmation dialog
    setShowDeclineConfirm(true);
  }, []);

  const handleDeclineConfirm = useCallback(async () => {
    // Prevent double actions
    if (uiState !== UI_STATES.INCOMING) {
      setShowDeclineConfirm(false);
      return;
    }

    try {
      // Update UI state
      dispatch(instantLessonAction.setDeclining());

      // Emit decline event via socket
      if (socket && lessonId) {
        socket.emit(EVENTS.INSTANT_LESSON.DECLINE, {
          lessonId,
          coachId: requestData?.coachId,
          traineeId: traineeInfo?._id,
          requestData,
        });
      }

      // Show success toast
      toast.success("Lesson request declined");

      // Close confirmation dialog
      setShowDeclineConfirm(false);

      // Close modal smoothly after short delay
      setTimeout(() => {
        dispatch(instantLessonAction.clearIncomingRequest());
      }, 300);
    } catch (error) {
      console.error("Error declining lesson:", error);
      dispatch(instantLessonAction.setError({ message: "Failed to decline lesson request" }));
      toast.error("Failed to decline lesson request. Please try again.");
      setShowDeclineConfirm(false);
    }
  }, [uiState, dispatch, socket, lessonId, requestData, traineeInfo]);

  const handleDeclineCancel = useCallback(() => {
    setShowDeclineConfirm(false);
  }, []);

  // Note: handleExpire logic moved to useEffect to avoid stale closure issues

  // Only show for trainers
  if (!isIncoming || accountType !== AccountType.TRAINER) {
    return null;
  }

  const traineeName = traineeInfo?.fullname || traineeInfo?.fullName || "Student";
  const lessonTypeLabel = lessonType || `${duration} Minutes`;
  const profilePicture = traineeInfo?.profile_picture 
    ? Utils.getImageUrlOfS3(traineeInfo.profile_picture)
    : "/assets/images/demoUser.png";

  // Determine button states
  const isProcessing = uiState === UI_STATES.ACCEPTING || uiState === UI_STATES.DECLINING;
  const isExpired = uiState === UI_STATES.EXPIRED;
  const isError = uiState === UI_STATES.ERROR;
  const buttonsDisabled = isProcessing || isExpired || isError;

  // Get button text based on state
  const getAcceptButtonText = () => {
    if (uiState === UI_STATES.ACCEPTING) return "Confirming…";
    if (uiState === UI_STATES.EXPIRED) return "Expired";
    if (uiState === UI_STATES.ERROR) return "Error";
    return "Confirm";
  };

  return (
    <>
      <audio ref={audioRef} preload="auto">
        <source src="/assets/sounds/notification.wav" type="audio/wav" />
      </audio>

      <Modal
        isOpen={isIncoming}
        toggle={() => dispatch(instantLessonAction.clearIncomingRequest())}
        centered
        size="sm"
      >
        <ModalHeader
          toggle={() => dispatch(instantLessonAction.clearIncomingRequest())}
        >
          Instant Lesson Request
        </ModalHeader>
        <ModalBody>
          {isError ? (
            <p style={{ marginBottom: 0, color: "#dc3545" }}>
              {errorMessage || "An error occurred. Please try again."}
            </p>
          ) : isExpired ? (
            <p style={{ marginBottom: 0 }}>
              This instant lesson request has expired.
            </p>
          ) : (
            <>
              <p style={{ marginBottom: 8 }}>
                <strong>{traineeName}</strong> has requested an instant lesson{" "}
                {lessonTypeLabel ? `(${lessonTypeLabel})` : ""}.
              </p>
              {typeof timeRemaining === "number" && (
                <p
                  style={{
                    marginBottom: 0,
                    fontSize: 12,
                    color: "#6c757d",
                  }}
                >
                  Time remaining to respond:{" "}
                  <strong>{formatTime(timeRemaining)}</strong>
                </p>
              )}
            </>
          )}
        </ModalBody>
        {!isExpired && !isError && (
          <ModalFooter>
            <Button
              color="secondary"
              onClick={handleDeclineConfirm}
              disabled={buttonsDisabled}
            >
              Cancel
            </Button>
            <Button
              color="primary"
              onClick={handleAccept}
              disabled={buttonsDisabled}
            >
              {getAcceptButtonText()}
            </Button>
          </ModalFooter>
        )}
      </Modal>
    </>
  );
};

export default InstantLessonModal;
