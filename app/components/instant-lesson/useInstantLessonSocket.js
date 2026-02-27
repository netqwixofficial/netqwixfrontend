import { useEffect, useContext } from "react";
import { useAppDispatch, useAppSelector } from "../../store";
import store from "../../store";
import { SocketContext } from "../socket/SocketProvider";
import { instantLessonAction } from "./instantLesson.slice";
import { EVENTS } from "../../../helpers/events";
import { AccountType } from "../../common/constants";
import { authState } from "../auth/auth.slice";

/**
 * Global hook to listen for instant lesson requests via socket
 * This should be initialized at the app level (_app.jsx)
 */
export const useInstantLessonSocket = () => {
  const dispatch = useAppDispatch();
  const socket = useContext(SocketContext);
  const { accountType, userInfo } = useAppSelector(authState);

  useEffect(() => {
    if (!socket) {
      return;
    }

    // TRAINER SIDE: Listen for incoming instant lesson requests
    if (accountType === AccountType.TRAINER) {
      const handleInstantLessonRequest = (payload) => {
        // Validate payload
        if (!payload || !payload.lessonId || !payload.coachId) {
          console.error("Invalid instant lesson request payload:", payload);
          return;
        }

        // Check if request is for this coach
        if (payload.coachId !== userInfo?._id) {
          return;
        }

        // Calculate expiration time (default 60 seconds if not provided)
        const expiresAt = payload.expiresAt 
          ? new Date(payload.expiresAt).getTime()
          : Date.now() + (payload.duration || 60) * 1000;

        // Dispatch to Redux store
        dispatch(
          instantLessonAction.setIncomingRequest({
            lessonId: payload.lessonId,
            expiresAt,
            coachId: payload.coachId,
            traineeInfo: payload.traineeInfo || payload.trainee_info,
            lessonType: payload.lessonType || `${payload.duration || 60} Minutes`,
            duration: payload.duration || 60,
            requestData: payload,
          })
        );
      };

      const handleInstantLessonAccept = (payload) => {
        // Handle accept confirmation from server if needed
        console.log("Instant lesson accept confirmed:", payload);
        // The modal will handle its own state, but we can listen for server confirmations here
      };

      const handleInstantLessonDecline = (payload) => {
        // Handle decline confirmation from server if needed
        console.log("Instant lesson decline confirmed:", payload);
        // The modal will handle its own state, but we can listen for server confirmations here
      };

      const handleInstantLessonExpire = (payload) => {
        // Handle expiration confirmation from server if needed
        console.log("Instant lesson expire confirmed:", payload);
        // The modal will handle its own state, but we can listen for server confirmations here
      };

      // Register socket event listeners for trainer
      socket.on(EVENTS.INSTANT_LESSON.REQUEST, handleInstantLessonRequest);
      socket.on(EVENTS.INSTANT_LESSON.ACCEPT, handleInstantLessonAccept);
      socket.on(EVENTS.INSTANT_LESSON.DECLINE, handleInstantLessonDecline);
      socket.on(EVENTS.INSTANT_LESSON.EXPIRE, handleInstantLessonExpire);

      // Cleanup on unmount
      return () => {
        socket.off(EVENTS.INSTANT_LESSON.REQUEST, handleInstantLessonRequest);
        socket.off(EVENTS.INSTANT_LESSON.ACCEPT, handleInstantLessonAccept);
        socket.off(EVENTS.INSTANT_LESSON.DECLINE, handleInstantLessonDecline);
        socket.off(EVENTS.INSTANT_LESSON.EXPIRE, handleInstantLessonExpire);
      };
    }

    // TRAINEE SIDE: Listen for coach acceptance
    if (accountType === AccountType.TRAINEE) {
      const handleCoachAccept = (payload) => {
        // Validate payload
        if (!payload || !payload.lessonId) {
          console.error("Invalid coach accept payload:", payload);
          return;
        }

        // Check if this accept is for the current trainee's lesson
        // Get current lessonId from Redux state to verify this accept is for the active flow
        const currentState = store.getState().instantLesson;
        if (currentState.isTraineeFlow && currentState.lessonId !== payload.lessonId) {
          // This accept is for a different lesson, ignore it
          console.log("Coach accept received for different lesson, ignoring:", payload.lessonId);
          return;
        }

        console.log("Coach accepted instant lesson:", payload);
        
        // Update Redux state to mark coach as accepted
        dispatch(instantLessonAction.setCoachAccepted());
      };

      const handleCoachDecline = (payload) => {
        console.log("Coach declined instant lesson:", payload);
        // Clear trainee flow
        dispatch(instantLessonAction.clearTraineeFlow());
      };

      // Register socket event listeners for trainee
      socket.on(EVENTS.INSTANT_LESSON.ACCEPT, handleCoachAccept);
      socket.on(EVENTS.INSTANT_LESSON.DECLINE, handleCoachDecline);

      // Cleanup on unmount
      return () => {
        socket.off(EVENTS.INSTANT_LESSON.ACCEPT, handleCoachAccept);
        socket.off(EVENTS.INSTANT_LESSON.DECLINE, handleCoachDecline);
      };
    }
  }, [socket, accountType, userInfo, dispatch]);
};

/**
 * Mock function to simulate instant lesson request
 * For testing purposes - can be called from browser console
 * Example: window.mockInstantLessonRequest({ lessonId: '123', coachId: 'coach123', traineeInfo: { fullname: 'John Doe' }, duration: 30 })
 */
export const mockInstantLessonRequest = (socket, payload) => {
  if (!socket) {
    console.error("Socket not available");
    return;
  }

  const mockPayload = {
    lessonId: payload.lessonId || `lesson_${Date.now()}`,
    coachId: payload.coachId,
    traineeInfo: payload.traineeInfo || {
      _id: "trainee_123",
      fullname: payload.traineeName || "Test Student",
      profile_picture: null,
    },
    lessonType: payload.lessonType || "Instant Lesson",
    duration: payload.duration || 30,
    expiresAt: payload.expiresAt || new Date(Date.now() + (payload.duration || 30) * 1000).toISOString(),
    ...payload,
  };

  // Emit mock event
  socket.emit(EVENTS.INSTANT_LESSON.REQUEST, mockPayload);
  console.log("Mock instant lesson request sent:", mockPayload);
};

// Make mock function available globally for testing
if (typeof window !== "undefined") {
  window.mockInstantLessonRequest = (payload) => {
    // This will be set up in _app.jsx when socket is available
    console.log("To use mockInstantLessonRequest, socket must be available via SocketContext");
  };
}

