import React, { useContext, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../store";
import {
  bookingsState,
  updateBookedSessionScheduledMeetingAsync,
  getScheduledMeetingDetailsAsync,
} from "../common/common.slice";
import { AccountType, BookedSession } from "../../common/constants";
import { Button } from "reactstrap";
import { X } from "react-feather";
import Modal from "../../common/modal";
import { authState } from "../auth/auth.slice";
import { CovertTimeAccordingToTimeZone, formatTimeInLocalZone, navigateToMeeting, Utils } from "../../../utils/utils";
import { commonState } from "../../common/common.slice";
import { SocketContext } from "../socket";
import { EVENTS } from "../../../helpers/events";
import { NotificationType, notificiationTitles } from "../../../utils/constant";
import { formatUtcDateTime } from "../../../utils/dateTime";
import { DateTime } from "luxon";

const TrainerRenderBooking = ({
  _id,
  status,
  trainee_info,
  trainer_info,
  isCurrentDateBefore,
  isStartButtonEnabled,
  isMeetingDone,
  isUpcomingSession,
  ratings,
  booking_index,
  has24HoursPassedSinceBooking,
  isOpen,
  setIsOpen,
  selectedClips,
  setSelectedClips,
  setIsOpenID,
  addTraineeClipInBookedSession,
  trainee_clips,
  report,
  bookedSession,
  setBookedSession,
  tabBook,
  startMeeting,
  setStartMeeting,
  handleAddRatingModelState,
  updateParentState,
  start_time,
  bookingInfo,
}) => {
  const { scheduledMeetingDetails, addRatingModel } =
    useAppSelector(bookingsState);
  const socket = useContext(SocketContext);
  const { clips } = useAppSelector(commonState);
  const { accountType } = useAppSelector(authState);
  const dispatch = useAppDispatch();

  // Format start/end for display by treating them as UTC and converting to local
  const { dateLabel, timeLabel } = formatUtcDateTime(bookingInfo.start_time);
  const { timeLabel: endTimeLabel } = formatUtcDateTime(bookingInfo.end_time);

  // Calculate if current time is within the session time frame (UTC-aware)
  const currentTime = DateTime.now();
  
  // Try to parse start_time and end_time as ISO UTC strings
  // If parsing fails, fall back to using isStartButtonEnabled prop
  let startTime = null;
  let endTime = null;
  let isWithinTimeFrame = false;
  
  try {
    if (bookingInfo.start_time && bookingInfo.end_time) {
      startTime = DateTime.fromISO(bookingInfo.start_time, { zone: "utc" });
      endTime = DateTime.fromISO(bookingInfo.end_time, { zone: "utc" });
      
      if (startTime.isValid && endTime.isValid) {
        // Allow starting 5 minutes before the session starts
        const fiveMinutesBeforeStart = startTime.minus({ minutes: 5 });
        isWithinTimeFrame = 
          currentTime.isValid
            ? currentTime >= fiveMinutesBeforeStart && currentTime <= endTime
            : false;
      } else {
        // If parsing failed, fall back to isStartButtonEnabled prop
        console.warn("[TrainerRenderBooking] Invalid time format, using isStartButtonEnabled:", {
          start_time: bookingInfo.start_time,
          end_time: bookingInfo.end_time,
          startTimeValid: startTime.isValid,
          endTimeValid: endTime.isValid
        });
        isWithinTimeFrame = isStartButtonEnabled || false;
      }
    } else {
      // No times provided, use prop
      isWithinTimeFrame = isStartButtonEnabled || false;
    }
  } catch (error) {
    console.warn("[TrainerRenderBooking] Error parsing times, using isStartButtonEnabled:", error);
    isWithinTimeFrame = isStartButtonEnabled || false;
  }
  
  // Final check: button should be enabled if EITHER isWithinTimeFrame OR isStartButtonEnabled is true
  const canStartSession = isWithinTimeFrame || isStartButtonEnabled;
  
  // Debug logging
  useEffect(() => {
    if (status === BookedSession.confirmed) {
      console.log("[TrainerRenderBooking] Start button state:", {
        bookingId: _id,
        isWithinTimeFrame,
        isStartButtonEnabled,
        canStartSession,
        currentTime: currentTime.toISO(),
        startTime: startTime?.toISO() || "invalid",
        endTime: endTime?.toISO() || "invalid",
        start_time_raw: bookingInfo?.start_time,
        end_time_raw: bookingInfo?.end_time,
      });
    }
  }, [status, isWithinTimeFrame, isStartButtonEnabled, canStartSession, _id, bookingInfo?.start_time, bookingInfo?.end_time]);

  const isCurrentTimeAfterEndTime = currentTime.isValid && endTime?.isValid ? currentTime > endTime : false;

  const isCompleted =
    has24HoursPassedSinceBooking || bookingInfo?.ratings?.trainee;

  const canShowRatingButton =
    !isUpcomingSession &&
    !isCurrentDateBefore &&
    !isStartButtonEnabled &&
    status !== BookedSession.booked &&
    !isCompleted;

  const updateBookedStatusApi = (_id, booked_status) => {
    if (_id) {
      const updatePayload = {
        id: _id,
        booked_status: booked_status,
      };
      const payload = {
        ...(accountType === AccountType?.TRAINER
          ? { status: tabBook, updatePayload }
          : { updatePayload }),
      };
      dispatch(updateBookedSessionScheduledMeetingAsync(payload));
    }
  };

  const handleClick = () => {
    updateParentState(booking_index)

  };

  const sendNotifications = (data) => {
    socket?.emit(EVENTS.PUSH_NOTIFICATIONS.ON_SEND, data);
  };
  
  return (
    <React.Fragment>
      {ratings && status !== BookedSession.canceled && isMeetingDone && (
        <h3 className="mt-1">Completed</h3>
      )}
      <span>
        <span>
          {trainee_info?.fullname} has shared the following clips with you.{" "}
        </span>
        <span
          onClick={() => {
            if (trainee_clips?.length > 0) setSelectedClips(trainee_clips);
            setIsOpenID(_id);
            setIsOpen(!isOpen);
          }}
          style={{ textDecoration: "underline", cursor: "pointer" }}
        >
          Click here
        </span>{" "}
        to view.
      </span>
      <br />
      {status === BookedSession.canceled && isMeetingDone && (
        <button
          className="btn btn-danger button-effect btn-sm ml-2 my-1"
          type="button"
          style={{
            cursor:
              status === BookedSession.canceled ? "not-allowed" : "pointer",
          }}
          disabled={status === BookedSession.canceled}
        >
          {status === BookedSession.canceled
            ? BookedSession.canceled
            : "Cancel"}
        </button>
      )}
      {!ratings &&
      (isCurrentTimeAfterEndTime ||isMeetingDone)&& status === BookedSession.completed ? (
        <button
          className={`btn btn-success button-effect btn-sm mr-2 my-1`}
          type="button"
          onClick={() => {
            const payload = {
              _id,
              isOpen: true,
              booking_id: _id,
            };
            handleAddRatingModelState(payload);
          }}
        >
          Rating
        </button>
      ) : (
        <React.Fragment>
          {!isMeetingDone && (
            <React.Fragment>
              {status !== BookedSession.canceled && (
                <button
                  className={`btn btn-primary button-effect btn-sm mr-2 btn_cancel my-1`}
                  type="button"
                  style={{
                    cursor: status === BookedSession.confirmed && "not-allowed",
                  }}
                  disabled={status === BookedSession.confirmed}
                  onClick={() => {
                    setBookedSession({
                      ...bookedSession,
                      id: _id,
                      booked_status: BookedSession.confirmed,
                    });
                    updateBookedStatusApi(_id, BookedSession.confirmed);
                    sendNotifications({
                      title: notificiationTitles.sessionConfirmation,
                      description:
                        "Your upcoming training session has been confirmed.",
                      senderId: trainer_info?._id,
                      receiverId: trainee_info?._id,
                      bookingInfo: bookingInfo,
                      type:NotificationType.TRANSCATIONAL
                    });
                  }}
                >
                  {status === BookedSession.confirmed
                    ? BookedSession.confirmed
                    : BookedSession.confirm}
                </button>
              )}
              {status === BookedSession.confirmed && (
                <button
                  className={`btn btn-primary button-effect btn-sm mr-2 btn_cancel my-1`}
                  type="button"
                  style={{
                    cursor: canStartSession ? "pointer" : "not-allowed",
                  }}
                  disabled={!canStartSession}
                  onClick={async () => {
                    console.log("[TrainerRenderBooking] Start button clicked:", {
                      bookingId: _id,
                      isWithinTimeFrame,
                      isStartButtonEnabled,
                      canStartSession,
                      status,
                      bookingInfo: bookingInfo?._id,
                      start_time: bookingInfo?.start_time,
                      end_time: bookingInfo?.end_time
                    });
                    
                    try {
                      // Ensure booking is fetched before navigating
                      console.log("[TrainerRenderBooking] Fetching bookings...");
                      await dispatch(getScheduledMeetingDetailsAsync({ status: "upcoming" }));
                      // Also fetch without status to ensure we have the booking
                      await dispatch(getScheduledMeetingDetailsAsync());
                      
                      console.log("[TrainerRenderBooking] Bookings fetched, navigating to meeting:", _id);
                      
                      // Navigate immediately - don't wait for timeout
                      navigateToMeeting(_id);
                      
                      // Send notification (non-blocking)
                      try {
                        if (socket) {
                          sendNotifications({
                            title: notificiationTitles.sessionStrated,
                            description: `${trainer_info.fullname} has started the session. Join the session via the upcoming sessions tab in My Locker.`,
                            senderId: trainer_info?._id,
                            receiverId: trainee_info?._id,
                            bookingInfo: bookingInfo,
                            type:NotificationType.TRANSCATIONAL
                          });
                        } else {
                          console.warn("[TrainerRenderBooking] Socket not available for notification");
                        }
                      } catch (notifError) {
                        console.warn("Failed to send notification:", notifError);
                        // Don't block navigation if notification fails
                      }
                    } catch (error) {
                      console.error("[TrainerRenderBooking] Error starting session:", error);
                      // Still try to navigate even if fetch fails
                      navigateToMeeting(_id);
                    }
                  }}
                >
                  {BookedSession.start}
                </button>
              )}
              <button
                className={`btn btn-danger button-effect btn-sm btn_cancel my-1`}
                type="button"
                style={{
                  cursor:
                    status === BookedSession.canceled 
                      ? "not-allowed"
                      : "pointer",
                }}
                disabled={
                  status === BookedSession.canceled
                }
                onClick={() => {
                  if (
                   
                    status === BookedSession?.booked ||
                      status === BookedSession?.confirmed
                  ) {
                    setBookedSession({
                      ...bookedSession,
                      id: _id,
                      booked_status: BookedSession.canceled,
                    });
                    updateBookedStatusApi(_id, BookedSession.canceled);
                    sendNotifications({
                      title: notificiationTitles.sessionCancelattion,
                      description:
                        "A scheduled training session has been cancelled. Please check your calendar for details.",
                      senderId: trainer_info?._id,
                      receiverId: trainee_info?._id,
                      bookingInfo: null,
                      type:NotificationType.TRANSCATIONAL
                    });
                  }
                }}
              >
                {status === BookedSession.canceled
                  ? BookedSession.canceled
                  : "Cancel"}
              </button>
            </React.Fragment>
          )}
        </React.Fragment>
      )}

      <Modal
        isOpen={isOpen}
        element={
          <>
            <div className="container media-gallery portfolio-section grid-portfolio ">
              <div className="theme-title">
                <div className="media">
                  <div className="media-body media-body text-right">
                    <div
                      className="icon-btn btn-sm btn-outline-light close-apps pointer"
                      onClick={() => {
                        setIsOpen(false);
                      }}
                    >
                      {" "}
                      <X />{" "}
                    </div>
                  </div>
                </div>
              </div>
              <div className="d-flex flex-column  align-items-center">
                <h1 className="p-3">
                  {trainee_info.fullname} has shared the following clips with you.
                </h1>
                {selectedClips?.length ? (
                  <div>
                    <div className={`block-content`}>
                      <div className="row">
                        {selectedClips?.map((clp, index) => (
                          <>
                            <div
                              key={index}
                              className="col-md-6 col-sm-12 col-xs-12 p-2"
                            >
                              <div className="col">
                                <dl className="row">
                                  <h3 className="ml-1">{clp?.title || "-"}</h3>
                                </dl>
                              </div>
                              <video className="videoStyle" controls>
                                <source
                                  src={Utils?.generateVideoURL(clp)}
                                  type="video/mp4"
                                />
                              </video>
                            </div>
                          </>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <></>
                )}
              </div>
              <div className="justify-content-center"></div>
            </div>
          </>
        }
      />
    </React.Fragment>
  );
};

export default TrainerRenderBooking;
