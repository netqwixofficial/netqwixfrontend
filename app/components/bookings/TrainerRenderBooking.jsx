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

  // Always use the latest status from Redux state, not just the prop
  // This ensures UI updates immediately after API refresh
  const latestBooking = scheduledMeetingDetails?.[booking_index];
  const currentStatus = latestBooking?.status || status;

  // Use prop from parent (Utils.meetingAvailability) so timezone and null start/end are handled correctly.
  // For instant lessons with null start/end, parent returns isStartButtonEnabled true.
  const hasStartEnd = bookingInfo?.start_time && bookingInfo?.end_time;
  const startTime = hasStartEnd ? DateTime.fromISO(bookingInfo.start_time, { zone: "utc" }) : null;
  const endTime = hasStartEnd ? DateTime.fromISO(bookingInfo.end_time, { zone: "utc" }) : null;
  const currentTime = DateTime.now();
  const isCurrentTimeAfterEndTime = endTime ? currentTime > endTime : false;
  const isWithinTimeFrame = isStartButtonEnabled;

  const isCompleted =
    has24HoursPassedSinceBooking || bookingInfo?.ratings?.trainee;

  const canShowRatingButton =
    !isUpcomingSession &&
    !isCurrentDateBefore &&
    !isStartButtonEnabled &&
    currentStatus !== BookedSession.booked &&
    !isCompleted;

  const updateBookedStatusApi = async (_id, booked_status) => {
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
      try {
        // Wait for the update to complete
        await dispatch(updateBookedSessionScheduledMeetingAsync(payload)).unwrap();
        if (accountType === AccountType?.TRAINER) {
          await dispatch(getScheduledMeetingDetailsAsync({ status: tabBook, forceRefresh: true }));
        } else {
          await dispatch(getScheduledMeetingDetailsAsync({ forceRefresh: true }));
        }
        await dispatch(getScheduledMeetingDetailsAsync({ status: "upcoming", forceRefresh: true }));
      } catch (error) {
        console.error("[TrainerRenderBooking] Error updating booking status:", error);
      }
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
      {ratings && currentStatus !== BookedSession.canceled && isMeetingDone && (
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
      {currentStatus === BookedSession.canceled && isMeetingDone && (
        <button
          className="btn btn-danger button-effect btn-sm ml-2 my-1"
          type="button"
          style={{
            cursor:
              currentStatus === BookedSession.canceled ? "not-allowed" : "pointer",
          }}
          disabled={currentStatus === BookedSession.canceled}
        >
          {currentStatus === BookedSession.canceled
            ? BookedSession.canceled
            : "Cancel"}
        </button>
      )}
      {!ratings &&
      (isCurrentTimeAfterEndTime ||isMeetingDone)&& currentStatus === BookedSession.completed ? (
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
              {currentStatus !== BookedSession.canceled && (
                <button
                  className={`btn btn-primary button-effect btn-sm mr-2 btn_cancel my-1`}
                  type="button"
                  style={{
                    cursor: currentStatus === BookedSession.confirmed && "not-allowed",
                  }}
                  disabled={currentStatus === BookedSession.confirmed}
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
                  {currentStatus === BookedSession.confirmed
                    ? BookedSession.confirmed
                    : BookedSession.confirm}
                </button>
              )}
              {currentStatus === BookedSession.confirmed && (
                <button
                  className={`btn btn-primary button-effect btn-sm mr-2 btn_cancel my-1`}
                  type="button"
                  style={{
                    cursor: isWithinTimeFrame ? "pointer" : "not-allowed",
                  }}
                  disabled={!isWithinTimeFrame}
                  onClick={async () => {
                    console.log("[TrainerRenderBooking] Start button clicked:", {
                      bookingId: _id,
                      isWithinTimeFrame,
                      status
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
                    currentStatus === BookedSession.canceled 
                      ? "not-allowed"
                      : "pointer",
                }}
                disabled={
                  currentStatus === BookedSession.canceled
                }
                onClick={() => {
                  if (
                   
                    currentStatus === BookedSession?.booked ||
                      currentStatus === BookedSession?.confirmed
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
                {currentStatus === BookedSession.canceled
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
