import React, { useContext, useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../store";
import {
  addTraineeClipInBookedSessionAsync,
  bookingsState,
  getScheduledMeetingDetailsAsync,
  updateBookedSessionScheduledMeetingAsync,
} from "../common/common.slice";
import { CovertTimeAccordingToTimeZone, navigateToMeeting, Utils } from "../../../utils/utils";
import {
  AccountType,
  BookedSession,
  bookingButton,
} from "../../common/constants";
import { authState } from "../auth/auth.slice";
import { Button } from "reactstrap";
import { X } from "react-feather";
import Modal from "../../common/modal";
import { traineeAction } from "../trainee/trainee.slice";
import AddClip from "./start/AddClip";
import { commonState } from "../../common/common.slice";
import { SocketContext } from "../socket";
import { EVENTS } from "../../../helpers/events";
import { NotificationType, notificiationTitles } from "../../../utils/constant";
import { useMediaQuery } from "usehooks-ts";
import { formatUtcDateTime } from "../../../utils/dateTime";
import { DateTime } from "luxon";

const TraineeRenderBooking = ({
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
  isOpenID,
  addTraineeClipInBookedSession,
  trainee_clips,
  report,
  bookedSession,
  setBookedSession,
  tabBook,
  startMeeting,
  setStartMeeting,
  updateParentState,
  handleAddRatingModelState,
  accountType,
  activeTabs,
  start_time,
  bookingInfo
}) => {
  const { scheduledMeetingDetails, addRatingModel } =
    useAppSelector(bookingsState);
  const socket = useContext(SocketContext);
  const { clips } = useAppSelector(commonState);
  const dispatch = useAppDispatch();
  const { removeNewBookingData } = traineeAction;
  const isCompleted =
    has24HoursPassedSinceBooking || bookingInfo?.ratings?.trainee;

  // Treat stored start_time / end_time as UTC and format for local display
  const { dateLabel, timeLabel } = formatUtcDateTime(bookingInfo.start_time);
  const { timeLabel: endTimeLabel } = formatUtcDateTime(bookingInfo.end_time);

  const currentTime = DateTime.now();
  const startTime = DateTime.fromISO(bookingInfo.start_time, { zone: "utc" });
  const endTime = DateTime.fromISO(bookingInfo.end_time, { zone: "utc" });
  
  // Allow starting 5 minutes before the session starts
  const fiveMinutesBeforeStart = startTime.minus({ minutes: 5 });
  const isWithinTimeFrame =
    currentTime.isValid && startTime.isValid && endTime.isValid
      ? currentTime >= fiveMinutesBeforeStart && currentTime <= endTime
      : false;
  
  // Debug logging
  useEffect(() => {
    if (status === BookedSession.confirmed) {
      console.log("[TraineeRenderBooking] Start button state:", {
        bookingId: _id,
        isWithinTimeFrame,
        currentTime: currentTime.toISO(),
        startTime: startTime.toISO(),
        endTime: endTime.toISO(),
        fiveMinutesBeforeStart: fiveMinutesBeforeStart.toISO(),
      });
    }
  }, [status, isWithinTimeFrame, _id]);
  const isCurrentTimeAfterEndTime =
    currentTime.isValid && endTime.isValid ? currentTime > endTime : false;
  const canShowRatingButton =
    !isUpcomingSession &&
    !isCurrentDateBefore &&
    !isStartButtonEnabled &&
    status !== BookedSession.booked &&
    Utils.compairDateGraterOrNot(start_time) &&
    !isCompleted;

  const handleClick = () => {
   updateParentState(booking_index)

  };

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
      dispatch(getScheduledMeetingDetailsAsync());
    }
  };

  const sendNotifications = (data) => {
    socket?.emit(EVENTS.PUSH_NOTIFICATIONS.ON_SEND, data);
  };

  const isMeetingCanceled = () => {
    return (
      status === BookedSession.canceled || activeTabs === BookedSession.canceled
    );
  };

  const isMobileScreen = useMediaQuery('(max-width:600px)')

  return (
    <React.Fragment>
      {status !== BookedSession.canceled &&
        activeTabs !== BookedSession.canceled &&
        isMeetingDone && ratings && <h3 className="mt-1">Completed</h3>}
      {!ratings &&
           (isCurrentTimeAfterEndTime ||isMeetingDone)&& status === BookedSession.completed ?  (
        <button
          className={`btn btn-success button-effect btn-sm mr-2 my-1`}
          type="button"
          onClick={() => {
            const payload = {
              _id,
              isOpen: true,
            };
            handleAddRatingModelState(payload,trainer_info);
            sendNotifications({
              title: notificiationTitles.feedBackReceived,
              description:
                "Your enthusiasts has submitted a new rating for your session.",
              senderId: trainee_info?._id,
              receiverId: trainer_info?._id,
              bookingInfo: bookingInfo,
            });
          }}
        >
          Rating
        </button>
      ) : (
        <React.Fragment>
          {!isMeetingDone && (
            <React.Fragment>
              {status !== BookedSession.canceled && (
                <React.Fragment>
                  <button
                    className={`btn btn-success button-effect btn-sm ${isMobileScreen?"mr-1": "mr-2"} btn_cancel my-1 `}
                    type="button"
                    style={{paddingLeft:isMobileScreen?"5px":"auto",paddingRight:isMobileScreen?"5px":"auto"}}
                    onClick={() => {
                      if (trainee_clips?.length > 0)
                        setSelectedClips(trainee_clips);
                      setIsOpenID(_id);
                      setIsOpen(true);
                    }}
                  >
                    Add Clip
                  </button>
                  {status === BookedSession.booked ? (
                    <button
                    className={`btn btn-dark button-effect btn-sm ${isMobileScreen?"mr-1": "mr-2"} btn_cancel my-1 `}
                    
                      type="button"
                    
                      style={{
                        cursor:
                          status === BookedSession.booked && "not-allowed",
                          paddingLeft:isMobileScreen?"5px":"auto",paddingRight:isMobileScreen?"5px":"auto"
                      }}
                      disabled={status === BookedSession.booked}
                    >
                      {BookedSession.booked}
                    </button>
                  ) : (
                    <button
                    className={`btn btn-primary button-effect btn-sm ${isMobileScreen?"mr-1": "mr-2"} btn_cancel my-1 `}
            
                      type="button"
                      style={{
                        cursor:
                          status === BookedSession.confirmed && "not-allowed",
                          paddingLeft:isMobileScreen?"5px":"auto",paddingRight:isMobileScreen?"5px":"auto"
                      }}
                      disabled={status === BookedSession.confirmed}
                    >
                      {BookedSession.confirmed}
                    </button>
                  )}
                  {isOpenID === _id &&
                  <AddClip
                    isOpen={isOpen}
                    onClose={() => {
                      setIsOpen(false);
                      dispatch(removeNewBookingData());
                    }}
                    trainer={trainer_info?.fullname}
                    selectedClips={selectedClips}
                    setSelectedClips={setSelectedClips}
                    clips={clips}
                    shareFunc={addTraineeClipInBookedSession}
                    sendNotfication={null}
                  />}
                </React.Fragment>
              )}
              {status === BookedSession.confirmed && (
                <button
                className={`btn btn-primary button-effect btn-sm ${isMobileScreen?"mr-1": "mr-2"} btn_cancel my-1 `}

                  type="button"
                  style={{
                    cursor: isWithinTimeFrame ? "pointer" : "not-allowed",
                    paddingLeft:isMobileScreen?"5px":"auto",paddingRight:isMobileScreen?"5px":"auto"
                  }}
                  disabled={!isWithinTimeFrame}
                  onClick={async () => {
                    try {
                      // Ensure booking is fetched before navigating
                      await dispatch(getScheduledMeetingDetailsAsync({ status: "upcoming" }));
                      // Also fetch without status to ensure we have the booking
                      await dispatch(getScheduledMeetingDetailsAsync());
                      
                      // Small delay to ensure state is updated
                      setTimeout(() => {
                        navigateToMeeting(_id);
                      }, 100);
                      
                      // Send notification (non-blocking)
                      try {
                        sendNotifications({
                          title: notificiationTitles.sessionStrated,
                          description: `${trainee_info.fullname} has started the session. Join the session via the upcoming sessions tab in My Locker.`,
                          senderId: trainee_info?._id,
                          receiverId: trainer_info?._id,
                          bookingInfo: bookingInfo,
                          type:NotificationType.TRANSCATIONAL
                        });
                      } catch (notifError) {
                        console.warn("Failed to send notification:", notifError);
                        // Don't block navigation if notification fails
                      }
                    } catch (error) {
                      console.error("Error starting session:", error);
                    }
                  }}
                >
                  {BookedSession.start}
                </button>
              )}
              <button
                className={`btn btn-danger button-effect btn-sm ${isMobileScreen?"mr-1": "mr-2"} btn_cancel my-1 `}
                type="button"
                style={{
                  cursor:
                    status === BookedSession.canceled || isStartButtonEnabled
                      ? "not-allowed"
                      : "pointer",
                      paddingLeft:isMobileScreen?"5px":"auto",paddingRight:isMobileScreen?"5px":"auto"
                }}
                disabled={
                  status === BookedSession.canceled || isStartButtonEnabled
                }
                onClick={() => {
                  if (
                    !isStartButtonEnabled &&
                    (status === BookedSession?.booked ||
                      status === BookedSession?.confirmed)
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
                      senderId: trainee_info?._id,
                      receiverId: trainer_info?._id,
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
          {isMeetingCanceled() && isMeetingDone && (
            <button
             className={`btn btn-danger button-effect btn-sm ${isMobileScreen?"mr-1": "mr-2"} btn_cancel my-1 `}
              type="button"
              style={{
                cursor:
                  status === BookedSession.canceled ? "not-allowed" : "pointer",
                  paddingLeft:isMobileScreen?"5px":"auto",paddingRight:isMobileScreen?"5px":"auto"
              }}
              disabled={isMeetingCanceled()}
            >
              {isMeetingCanceled() ? BookedSession.canceled : "Cancel"}
            </button>
          )}
        </React.Fragment>
      )}
    </React.Fragment>
  );
};

export default TraineeRenderBooking;
