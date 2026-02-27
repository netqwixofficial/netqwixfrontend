import React, { useEffect, useState, useContext, useCallback } from "react";
import { Modal, ModalBody, ModalFooter, Button, ModalHeader } from "reactstrap";
import { useAppDispatch, useAppSelector } from "../../store";
import { instantLessonState, instantLessonAction, INSTANT_LESSON_STEPS } from "./instantLesson.slice";
import { AccountType } from "../../common/constants";
import { SocketContext } from "../socket/SocketProvider";
import { EVENTS } from "../../../helpers/events";
import { toast } from "react-toastify";
import { navigateToMeeting } from "../../../utils/utils";
import SelectClips from "../bookings/start/SelectClips";
import { traineeClips } from "../../../containers/rightSidebar/fileSection.api";
import "./InstantLessonModal.scss";

const STORAGE_KEY = "instantLessonTraineeFlow";

const InstantLessonTraineeModal = () => {
  const dispatch = useAppDispatch();
  const socket = useContext(SocketContext);
  const { 
    isTraineeFlow, 
    currentStep, 
    selectedVideos, 
    coachAccepted, 
    canJoin,
    lessonId,
    coachId,
    traineeInfo,
    lessonType,
    duration,
    requestData
  } = useAppSelector(instantLessonState);
  const { accountType, userInfo } = useAppSelector((state) => state.auth);
  const [clips, setClips] = useState([]);
  const [isSelectClipsOpen, setIsSelectClipsOpen] = useState(false);
  const [isLoadingClips, setIsLoadingClips] = useState(false);

  // Only show for trainees
  if (!isTraineeFlow || accountType !== AccountType.TRAINEE) {
    return null;
  }

  // Persist state to localStorage
  useEffect(() => {
    if (isTraineeFlow && typeof window !== "undefined") {
      const stateToSave = {
        currentStep,
        selectedVideos,
        coachAccepted,
        canJoin,
        lessonId,
        coachId,
        traineeInfo,
        lessonType,
        duration,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } else if (!isTraineeFlow && typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [isTraineeFlow, currentStep, selectedVideos, coachAccepted, canJoin, lessonId, coachId, traineeInfo, lessonType, duration]);

  // Restore state from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined" && accountType === AccountType.TRAINEE) {
      const savedState = localStorage.getItem(STORAGE_KEY);
      if (savedState) {
        try {
          const parsed = JSON.parse(savedState);
          if (parsed.lessonId) {
            // Restore trainee flow state
            dispatch(instantLessonAction.initiateTraineeFlowFromBooking({
              lessonId: parsed.lessonId,
              coachId: parsed.coachId,
              traineeInfo: parsed.traineeInfo,
              duration: parsed.duration,
              requestData: {},
            }));
            // Restore step and other state
            if (parsed.currentStep) {
              dispatch(instantLessonAction.setCurrentStep(parsed.currentStep));
            }
            if (parsed.selectedVideos && parsed.selectedVideos.length > 0) {
              dispatch(instantLessonAction.setSelectedVideos(parsed.selectedVideos));
            }
            if (parsed.coachAccepted) {
              dispatch(instantLessonAction.setCoachAccepted());
            }
          }
        } catch (error) {
          console.error("Error restoring instant lesson state:", error);
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    }
  }, []); // Only run on mount

  // Load trainee clips when component mounts or when entering video selection step
  useEffect(() => {
    if (currentStep === INSTANT_LESSON_STEPS.SELECT_VIDEOS || currentStep === INSTANT_LESSON_STEPS.REQUEST) {
      loadTraineeClips();
    }
  }, [currentStep]);

  const loadTraineeClips = async () => {
    try {
      setIsLoadingClips(true);
      const response = await traineeClips(userInfo?._id);
      if (response?.data) {
        // Transform clips data to match SelectClips component format
        const formattedClips = Object.keys(response.data).map((categoryId) => ({
          _id: categoryId,
          show: false,
          clips: response.data[categoryId] || [],
        }));
        setClips(formattedClips);
      }
    } catch (error) {
      console.error("Error loading trainee clips:", error);
      toast.error("Failed to load videos. Please try again.");
    } finally {
      setIsLoadingClips(false);
    }
  };

  const handleVideoSelection = (videos) => {
    // Enforce max 2 videos - limit to first 2 if more are selected
    const limitedVideos = videos.slice(0, 2);
    if (videos.length > 2) {
      toast.warning("You can select a maximum of 2 videos. Only the first 2 will be used.");
    }
    dispatch(instantLessonAction.setSelectedVideos(limitedVideos));
  };

  const handleOpenVideoSelection = () => {
    setIsSelectClipsOpen(true);
  };

  const handleCloseVideoSelection = () => {
    setIsSelectClipsOpen(false);
  };

  const handleJoinLesson = useCallback(() => {
    if (!canJoin) {
      toast.warning("Please complete video selection and wait for coach acceptance.");
      return;
    }

    if (!lessonId) {
      toast.error("Lesson ID not found. Please try again.");
      return;
    }

    // Clear localStorage before navigating
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }

    // Navigate to meeting room
    navigateToMeeting(lessonId);
    
    // Clear trainee flow state
    dispatch(instantLessonAction.clearTraineeFlow());
  }, [canJoin, lessonId, dispatch]);

  const handleCancel = useCallback(() => {
    // Emit cancel event if needed
    if (socket && lessonId) {
      socket.emit(EVENTS.INSTANT_LESSON.DECLINE, {
        lessonId,
        coachId,
        traineeId: userInfo?._id,
        requestData,
      });
    }
    
    // Clear localStorage
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
    
    // Clear trainee flow state
    dispatch(instantLessonAction.clearTraineeFlow());
    toast.info("Instant lesson request cancelled.");
  }, [socket, lessonId, coachId, userInfo, requestData, dispatch]);

  const getStepTitle = () => {
    switch (currentStep) {
      case INSTANT_LESSON_STEPS.REQUEST:
        return "Request Instant Lesson";
      case INSTANT_LESSON_STEPS.SELECT_VIDEOS:
        return coachAccepted 
          ? "Coach is Ready - Select Your Videos"
          : "Select Your Videos";
      case INSTANT_LESSON_STEPS.COACH_ACCEPTED:
        return "Coach is Ready";
      case INSTANT_LESSON_STEPS.JOIN_LESSON:
        return "Ready to Join";
      default:
        return "Instant Lesson";
    }
  };

  const getStepMessage = () => {
    switch (currentStep) {
      case INSTANT_LESSON_STEPS.REQUEST:
        return "Your instant lesson request has been sent. Please select your videos.";
      case INSTANT_LESSON_STEPS.SELECT_VIDEOS:
        if (coachAccepted) {
          return "Coach is ready. Please finish selecting your video.";
        }
        return "Please select up to 2 videos to share during the lesson.";
      case INSTANT_LESSON_STEPS.COACH_ACCEPTED:
        return "Coach is ready. You can now join the lesson.";
      case INSTANT_LESSON_STEPS.JOIN_LESSON:
        return "All set! Click 'Join Lesson' to start.";
      default:
        return "";
    }
  };

  return (
    <>
      <div className="instant-lesson-modal-overlay">
        <Modal
          isOpen={isTraineeFlow}
          toggle={() => {}} // Prevent closing by clicking outside
          centered
          className="instant-lesson-modal"
          backdrop="static"
          keyboard={false}
          role="dialog"
          aria-labelledby="instant-lesson-trainee-title"
          aria-modal="true"
        >
          <ModalHeader id="instant-lesson-trainee-title">
            {getStepTitle()}
          </ModalHeader>
          <ModalBody className="instant-lesson-modal-body">
            <div className="instant-lesson-content">
              <div className="step-indicator" style={{ marginBottom: "20px", textAlign: "center" }}>
                <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginBottom: "10px" }}>
                  {[1, 2, 3, 4].map((step) => (
                    <div
                      key={step}
                      style={{
                        width: "30px",
                        height: "30px",
                        borderRadius: "50%",
                        background: currentStep >= step ? "#28a745" : "#e0e0e0",
                        color: currentStep >= step ? "#fff" : "#666",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: "bold",
                        fontSize: "14px",
                      }}
                    >
                      {step}
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: "12px", color: "#666" }}>
                  {currentStep === INSTANT_LESSON_STEPS.REQUEST && "Request Sent"}
                  {currentStep === INSTANT_LESSON_STEPS.SELECT_VIDEOS && "Select Videos"}
                  {currentStep === INSTANT_LESSON_STEPS.COACH_ACCEPTED && "Coach Accepted"}
                  {currentStep === INSTANT_LESSON_STEPS.JOIN_LESSON && "Join Lesson"}
                </div>
              </div>

              <div className="step-message" style={{ marginBottom: "20px", textAlign: "center" }}>
                <p style={{ color: "#666", fontSize: "14px" }}>{getStepMessage()}</p>
              </div>

              {/* Video Selection Status */}
              {(currentStep === INSTANT_LESSON_STEPS.SELECT_VIDEOS || 
                currentStep === INSTANT_LESSON_STEPS.COACH_ACCEPTED ||
                currentStep === INSTANT_LESSON_STEPS.JOIN_LESSON) && (
                <div style={{ marginBottom: "20px" }}>
                  <div style={{ 
                    padding: "15px", 
                    background: "#f5f5f5", 
                    borderRadius: "5px",
                    marginBottom: "10px"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: "500" }}>Selected Videos:</span>
                      <span style={{ color: selectedVideos.length > 0 ? "#28a745" : "#999" }}>
                        {selectedVideos.length} / 2
                      </span>
                    </div>
                    {selectedVideos.length > 0 && (
                      <div style={{ marginTop: "10px", fontSize: "12px", color: "#666" }}>
                        {selectedVideos.map((video, idx) => (
                          <div key={video._id || idx} style={{ marginTop: "5px" }}>
                            • {video.title || video.name || `Video ${idx + 1}`}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {selectedVideos.length < 2 && (
                    <Button
                      color="primary"
                      size="sm"
                      onClick={handleOpenVideoSelection}
                      disabled={isLoadingClips}
                      style={{ 
                        width: "100%",
                        backgroundColor: '#007bff',
                        borderColor: '#007bff',
                        color: '#ffffff',
                        minHeight: '44px',
                        fontWeight: '600'
                      }}
                    >
                      {selectedVideos.length === 0 ? "Select Videos" : "Add More Videos"}
                    </Button>
                  )}
                </div>
              )}

              {/* Coach Accepted Indicator */}
              {coachAccepted && (
                <div style={{ 
                  padding: "10px", 
                  background: "#d4edda", 
                  borderRadius: "5px",
                  marginBottom: "15px",
                  textAlign: "center"
                }}>
                  <i className="fa fa-check-circle" style={{ color: "#28a745", marginRight: "5px" }}></i>
                  <span style={{ color: "#155724", fontWeight: "500" }}>
                    Coach has accepted your request
                  </span>
                </div>
              )}

              {/* Lesson Info */}
              <div style={{ 
                padding: "10px", 
                background: "#e7f3ff", 
                borderRadius: "5px",
                fontSize: "12px",
                color: "#0066cc"
              }}>
                <div><strong>Lesson Type:</strong> {lessonType || `${duration} Minutes`}</div>
                {duration && <div><strong>Duration:</strong> {duration} minutes</div>}
              </div>
            </div>
          </ModalBody>

          <ModalFooter className="instant-lesson-footer">
            <Button
              color="secondary"
              onClick={handleCancel}
              className="cancel-btn"
              style={{
                backgroundColor: '#6c757d',
                borderColor: '#6c757d',
                color: '#ffffff',
                minHeight: '44px',
                fontWeight: '600'
              }}
            >
              Cancel
            </Button>
            
            {(currentStep === INSTANT_LESSON_STEPS.SELECT_VIDEOS || 
              currentStep === INSTANT_LESSON_STEPS.COACH_ACCEPTED ||
              currentStep === INSTANT_LESSON_STEPS.JOIN_LESSON) && (
              <Button
                color="primary"
                onClick={handleJoinLesson}
                className="join-btn"
                disabled={!canJoin}
                style={{
                  backgroundColor: '#007bff',
                  borderColor: '#007bff',
                  color: '#ffffff',
                  minHeight: '44px',
                  fontWeight: '600'
                }}
              >
                {canJoin ? (
                  <>
                    <i className="fa fa-video-camera" aria-hidden="true"></i> Join Lesson
                  </>
                ) : (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Waiting...
                  </>
                )}
              </Button>
            )}
          </ModalFooter>
        </Modal>
      </div>

      {/* Video Selection Modal */}
      <SelectClips
        isOpen={isSelectClipsOpen}
        onClose={handleCloseVideoSelection}
        selectedClips={selectedVideos}
        clips={clips}
        isTrainer={false}
        userInfo={userInfo}
        setSelectedClips={(newClips) => {
          // Enforce max 2 videos limit
          if (newClips.length > 2) {
            toast.warning("Maximum 2 videos allowed. Please deselect some videos.");
            return;
          }
          handleVideoSelection(newClips);
        }}
        onShare={() => {
          const currentSelected = selectedVideos.length;
          if (currentSelected > 0) {
            handleCloseVideoSelection();
            // Auto-advance step if coach already accepted and videos are selected
            if (coachAccepted && currentSelected > 0 && currentSelected <= 2) {
              dispatch(instantLessonAction.setCurrentStep(INSTANT_LESSON_STEPS.COACH_ACCEPTED));
            } else if (currentSelected > 0 && currentSelected <= 2) {
              // Move to video selection step if not already there
              if (currentStep === INSTANT_LESSON_STEPS.REQUEST) {
                dispatch(instantLessonAction.setCurrentStep(INSTANT_LESSON_STEPS.SELECT_VIDEOS));
              }
            }
            toast.success(`${currentSelected} video(s) selected. ${coachAccepted ? 'You can now join!' : 'Waiting for coach acceptance...'}`);
          } else {
            toast.warning("Please select at least one video.");
          }
        }}
      />
    </>
  );
};

export default InstantLessonTraineeModal;

