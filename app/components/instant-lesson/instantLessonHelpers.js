/**
 * Helper functions for instant lesson flow
 */

import { instantLessonAction } from "./instantLesson.slice";
import { store } from "../../store";

/**
 * Initiate the trainee flow when an instant lesson request is sent
 * Call this function after successfully sending an instant lesson request via socket
 * 
 * @param {Object} params - Parameters for the instant lesson
 * @param {string} params.lessonId - The lesson ID returned from the booking/request
 * @param {string} params.coachId - The coach/trainer ID
 * @param {Object} params.traineeInfo - Trainee information object
 * @param {number} params.duration - Duration in minutes
 * @param {Object} params.requestData - Additional request data (optional)
 * 
 * @example
 * // After emitting instant lesson request via socket:
 * socket.emit(EVENTS.INSTANT_LESSON.REQUEST, requestPayload);
 * 
 * // Initiate trainee flow:
 * initiateTraineeFlow({
 *   lessonId: requestPayload.lessonId,
 *   coachId: requestPayload.coachId,
 *   traineeInfo: userInfo,
 *   duration: 30,
 *   requestData: requestPayload
 * });
 */
export const initiateTraineeFlow = (params) => {
  const { lessonId, coachId, traineeInfo, duration, requestData } = params;
  
  if (!lessonId || !coachId) {
    console.error("initiateTraineeFlow: lessonId and coachId are required");
    return;
  }

  store.dispatch(
    instantLessonAction.initiateTraineeFlowFromBooking({
      lessonId,
      coachId,
      traineeInfo: traineeInfo || {},
      duration: duration || 30,
      requestData: requestData || {},
    })
  );
};

/**
 * Clear the trainee flow (e.g., when lesson is cancelled or completed)
 */
export const clearTraineeFlow = () => {
  store.dispatch(instantLessonAction.clearTraineeFlow());
  
  // Also clear localStorage
  if (typeof window !== "undefined") {
    localStorage.removeItem("instantLessonTraineeFlow");
  }
};

