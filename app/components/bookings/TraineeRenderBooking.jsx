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
import { DateTime } from "luxon";
import { useMediaQuery } from "usehooks-ts";

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
  
  // Always use the latest status from Redux state, not just the prop
  // This ensures UI updates immediately after API refresh
  const latestBooking = scheduledMeetingDetails?.[booking_index];
  const currentStatus = latestBooking?.status || status;
  
  const isCompleted =
    has24HoursPassedSinceBooking || bookingInfo?.ratings?.trainee;

    // Use parent's isStartButtonEnabled so instant lessons (null start/end) and timezone-aware
    // scheduled checks work. Parent (BookingList/NavHomePage) uses Utils.meetingAvailability
    // with user timezone and returns true for null start_time/end_time.
    const isWithinTimeFrame = isStartButtonEnabled;
    const isCurrentTimeAfterEndTime = bookingInfo?.start_time && bookingInfo?.end_time
      ? DateTime.utc() > DateTime.fromISO(bookingInfo.end_time, { zone: "utc" })
      : false;
  const canShowRatingButton =
    !isUpcomingSession &&
    !isCurrentDateBefore &&
    !isStartButtonEnabled &&
    currentStatus !== BookedSession.booked &&
    Utils.compairDateGraterOrNot(start_time) &&
    !isCompleted;

  const handleClick = () => {
   updateParentState(booking_index)

  };

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
        // After successful update, refresh the bookings to get latest status
        // Force refresh to ensure we get the updated status from API
        await dispatch(getScheduledMeetingDetailsAsync({ forceRefresh: true }));
        // Also refresh upcoming sessions specifically
        await dispatch(getScheduledMeetingDetailsAsync({ status: "upcoming", forceRefresh: true }));
      } catch (error) {
        console.error("[TraineeRenderBooking] Error updating booking status:", error);
      }
    }
  };

  const sendNotifications = (data) => {
    socket?.emit(EVENTS.PUSH_NOTIFICATIONS.ON_SEND, data);
  };

  const isMeetingCanceled = () => {
    return (
      currentStatus === BookedSession.canceled || activeTabs === BookedSession.canceled
    );
  };

  const isMobileScreen = useMediaQuery('(max-width:600px)')

  return (
    <React.Fragment>
      {currentStatus !== BookedSession.canceled &&
        activeTabs !== BookedSession.canceled &&
        isMeetingDone && ratings && <h3 className="mt-1">Completed</h3>}
      {!ratings &&
           (isCurrentTimeAfterEndTime ||isMeetingDone)&& currentStatus === BookedSession.completed ?  (
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
              {currentStatus !== BookedSession.canceled && (
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
                  {currentStatus === BookedSession.booked ? (
                    <button
                    className={`btn btn-dark button-effect btn-sm ${isMobileScreen?"mr-1": "mr-2"} btn_cancel my-1 `}
                    
                      type="button"
                    
                      style={{
                        cursor:
                          currentStatus === BookedSession.booked && "not-allowed",
                          paddingLeft:isMobileScreen?"5px":"auto",paddingRight:isMobileScreen?"5px":"auto"
                      }}
                      disabled={currentStatus === BookedSession.booked}
                    >
                      {BookedSession.booked}
                    </button>
                  ) : (
                    <button
                    className={`btn btn-primary button-effect btn-sm ${isMobileScreen?"mr-1": "mr-2"} btn_cancel my-1 `}
            
                      type="button"
                      style={{
                        cursor:
                          currentStatus === BookedSession.confirmed && "not-allowed",
                          paddingLeft:isMobileScreen?"5px":"auto",paddingRight:isMobileScreen?"5px":"auto"
                      }}
                      disabled={currentStatus === BookedSession.confirmed}
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
              {currentStatus === BookedSession.confirmed && (
                <button
                className={`btn btn-primary button-effect btn-sm ${isMobileScreen?"mr-1": "mr-2"} btn_cancel my-1 `}

                  type="button"
                  style={{
                    cursor: isWithinTimeFrame ? "pointer" : "not-allowed",
                    paddingLeft:isMobileScreen?"5px":"auto",paddingRight:isMobileScreen?"5px":"auto"
                  }}
                  disabled={!isWithinTimeFrame}
                  onClick={async () => {
                    console.log("[TraineeRenderBooking] Start button clicked:", {
                      bookingId: _id,
                      isWithinTimeFrame,
                      status
                    });
                    
                    try {
                      // Ensure booking is fetched before navigating
                      console.log("[TraineeRenderBooking] Fetching bookings...");
                      await dispatch(getScheduledMeetingDetailsAsync({ status: "upcoming" }));
                      // Also fetch without status to ensure we have the booking
                      await dispatch(getScheduledMeetingDetailsAsync());
                      
                      console.log("[TraineeRenderBooking] Bookings fetched, navigating to meeting:", _id);
                      
                      // Navigate immediately - don't wait for timeout
                      navigateToMeeting(_id);
                      
                      // Send notification (non-blocking)
                      try {
                        if (socket) {
                        sendNotifications({
                          title: notificiationTitles.sessionStrated,
                          description: `${trainee_info.fullname} has started the session. Join the session via the upcoming sessions tab in My Locker.`,
                          senderId: trainee_info?._id,
                          receiverId: trainer_info?._id,
                          bookingInfo: bookingInfo,
                          type:NotificationType.TRANSCATIONAL
                        });
                        } else {
                          console.warn("[TraineeRenderBooking] Socket not available for notification");
                        }
                      } catch (notifError) {
                        console.warn("Failed to send notification:", notifError);
                        // Don't block navigation if notification fails
                      }
                    } catch (error) {
                      console.error("[TraineeRenderBooking] Error starting session:", error);
                      // Still try to navigate even if fetch fails
                      navigateToMeeting(_id);
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
                    currentStatus === BookedSession.canceled || isStartButtonEnabled
                      ? "not-allowed"
                      : "pointer",
                      paddingLeft:isMobileScreen?"5px":"auto",paddingRight:isMobileScreen?"5px":"auto"
                }}
                disabled={
                  currentStatus === BookedSession.canceled || isStartButtonEnabled
                }
                onClick={() => {
                  if (
                    !isStartButtonEnabled &&
                    (currentStatus === BookedSession?.booked ||
                      currentStatus === BookedSession?.confirmed)
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
                {currentStatus === BookedSession.canceled
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
                  currentStatus === BookedSession.canceled ? "not-allowed" : "pointer",
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
