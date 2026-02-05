import React, { useContext, useEffect, useRef, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../store";
import { SocketContext } from "../socket";
import { notificationAction } from "../notifications-service/notification.slice";
import { NotificationType, notificiationTitles } from "../../../utils/constant";
import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from "reactstrap";
import { EVENTS } from "../../../helpers/events";
import AppModel from "../../common/modal";
import {
  bookingsAction,
  bookingsState,
  getScheduledMeetingDetailsAsync,
  updateBookedSessionScheduledMeetingAsync,
} from "../common/common.slice";
import { authState } from "../auth/auth.slice";
import { BookedSession, bookingButton } from "../../common/constants";
import { getScheduledMeetingDetails } from "../common/common.api";
import { navigateToMeeting } from "../../../utils/utils";
import { toast } from "react-toastify";

const initialModelValue = {
  title: "",
  description: "",
  cta: {
    title: "",
    call: () => { },
  },
};

const ctaTitle = {
  confirmBooking: "Confirm",
  joinSession: "Join Session",
};

const NotificationPopup = () => {
  const dispatch = useAppDispatch();
  const socket = useContext(SocketContext);
  const [modelObj, setModelObj] = useState(initialModelValue);
  const [isOpen, SetIsOpen] = useState(false);
  const { startMeeting, scheduledMeetingDetails } = useAppSelector(bookingsState);
  const { userInfo } = useAppSelector(authState);
  const [isLoading, setIsLoading] = useState(false);
  const [hasShownPopup, setHasShownPopup] = useState(false);
  const [lastNotificationId, setLastNotificationId] = useState(null);
  const autoCloseTimerRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    if (!socket) {
      console.error("Socket is null or undefined");
      return;
    }

    // Socket event handler - only updates state, does NOT trigger API calls
    const handleNotification = (notification) => {
      dispatch(notificationAction.addNotification(notification));
      notificationHandler(notification);
    };

    socket.on(EVENTS.PUSH_NOTIFICATIONS.ON_RECEIVE, handleNotification);

    // Cleanup: Remove listener on unmount to prevent duplicates
    return () => {
      if (socket) {
        socket.off(EVENTS.PUSH_NOTIFICATIONS.ON_RECEIVE, handleNotification);
      }
    };
  }, [socket, dispatch]);

  // Reset popup state and clear any running auto-close timer
  // when component unmounts or user changes
  useEffect(() => {
    return () => {
      setHasShownPopup(false);
      setLastNotificationId(null);
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
        autoCloseTimerRef.current = null;
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      setCountdown(30);
    };
  }, [userInfo?._id]);

  const getUpcomingBookings = async () => {
    try {
      const response = await getScheduledMeetingDetails({
        status: bookingButton[0],
      });

      dispatch(
        getScheduledMeetingDetailsAsync({
          status: bookingButton[0],
        })
      );
      return response.data;
    } catch (err) {
       
    }

  };

  const updateBookedStatusApi = async (_id, booked_status) => {
    try {
      const updatePayload = {
        id: _id,
        booked_status: booked_status,
      };
      await dispatch(updateBookedSessionScheduledMeetingAsync({ status: "upcoming", updatePayload })).unwrap();
    } catch (error) {
      if (!error.isUnauthorized) {
        toast.error(error.response.data.error);
      }
      throw error;
    }
    
  };

  const sendNotifications = (data) => {
    socket?.emit(EVENTS.PUSH_NOTIFICATIONS.ON_SEND, data);
  };

  const notificationHandler = (notification) => {
    // Prevent showing the same notification multiple times
    if (hasShownPopup && lastNotificationId === notification._id) {
      return;
    }

    const tempObj = initialModelValue;

    switch (notification.title) {
      case notificiationTitles.newBookingRequest:
        
        tempObj.cta.title = ctaTitle.confirmBooking;
        // getUpcomingBookings();
        // const newBooking = scheduledMeetingDetails[0];
        // updateBookedStatusApi(newBooking._id , BookedSession.confirmed)
        // Wrap the logic inside an async IIFE (Immediately Invoked Function Expression)

        tempObj.cta.call = () => {
          (async () => {
            try {
              setIsLoading(true)
              tempObj.cta.title = "Confirming...";
              const bookingdata = await getUpcomingBookings();

              // Access the updated state after fetching
              const newBooking = bookingdata[0];
              if (newBooking) {
              
                await updateBookedStatusApi(newBooking._id, BookedSession.confirmed);
                setIsLoading(false)
                tempObj.cta.title = ctaTitle.joinSession;
                const MeetingPayload = {
                  ...startMeeting,
                  id: userInfo._id,
                  isOpenModal: true,
                  traineeInfo: newBooking.trainee_info,
                  trainerInfo: newBooking.trainer_info,
                  endTime: newBooking.session_end_time,
                  iceServers: newBooking.iceServers,
                  trainee_clip: newBooking.trainee_clip
                };

                tempObj.cta.call = () => {
                   
                  navigateToMeeting(newBooking?._id)
                  sendNotifications({
                    title: notificiationTitles.sessionStrated,
                    description: `Expert has Confirmed and started the session. Join the session via the upcoming sessions tab in My Locker.`,
                    senderId: userInfo._id,
                    receiverId: newBooking.trainee_info._id,
                    bookingInfo: newBooking,
                  });
                  toggle();
                };
              }
            } catch (error) {
              setIsLoading(false)
              tempObj.cta.title = ctaTitle.confirmBooking;
            }
          })();
        };
        break;
      case notificiationTitles.sessionStrated:
        tempObj.cta.title = ctaTitle.joinSession;
        break;
      case notificiationTitles.sessionConfirmation:
        tempObj.cta.title = ctaTitle.joinSession;
        getUpcomingBookings();
        return;
        break;
      default:
        return;
    }

    if (notification.title !== notificiationTitles.newBookingRequest) {
      const MeetingPayload = {
        ...startMeeting,
        id: userInfo._id,
        isOpenModal: true,
        traineeInfo: notification?.bookingInfo?.trainee_info,
        trainerInfo: notification?.bookingInfo?.trainer_info,
        endTime: notification?.bookingInfo?.session_end_time,
        iceServers: notification?.bookingInfo?.iceServers,
        trainee_clip: notification?.bookingInfo?.trainee_clip
      };

      tempObj.cta.call = () => {
         
        navigateToMeeting(notification?.bookingInfo?._id)
        toggle();
      };
    }

    tempObj.title = notification.title;
    tempObj.description = notification.description;
    setModelObj(tempObj);

    // Only show popup if not already shown and no drawing canvas is present
    if (!document.getElementById("drawing-canvas") && !hasShownPopup) {
      SetIsOpen(true);
      setHasShownPopup(true);
      setLastNotificationId(notification._id);
      setCountdown(30);
      
      // Clear any existing timers
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
      
      // Start countdown timer
      countdownTimerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (countdownTimerRef.current) {
              clearInterval(countdownTimerRef.current);
              countdownTimerRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      // Auto-close after 30 seconds
      autoCloseTimerRef.current = setTimeout(() => {
        SetIsOpen(false);
        setCountdown(30);
        if (countdownTimerRef.current) {
          clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
        }
      }, 30000);
    }
  };

  const toggle = () => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdown(30);
    SetIsOpen((prev) => !prev);
  };

  return isOpen ? (
    <div
      style={{
        position: "relative",
        height: "100vh",
        width: "100vw",
        display: "flex",
      }}
    >
      <AppModel
        isOpen={isOpen}
        toggle={toggle}
        id="notification_Model_id"
        element={
          <>
            <Modal isOpen={isOpen} toggle={toggle} centered={true}>
              <ModalHeader 
                toggle={toggle}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>{modelObj?.title}</span>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span
                    style={{
                      fontSize: "14px",
                      fontWeight: "normal",
                      color: countdown <= 3 ? "#dc3545" : "#666",
                    }}
                  >
                    Auto-closes in: {countdown}s
                  </span>
                  <button
                    onClick={toggle}
                    style={{
                      background: "transparent",
                      border: "none",
                      fontSize: "20px",
                      cursor: "pointer",
                      padding: "0 5px",
                      color: "#666",
                      lineHeight: "1",
                    }}
                    aria-label="Close notification"
                  >
                    ×
                  </button>
                </div>
              </ModalHeader>
              <ModalBody>{modelObj?.description}</ModalBody>
              <ModalFooter>
                <Button
                  color="primary"
                  style={{
                    background: "green",
                  }}
                  disabled={isLoading}
                  onClick={() => modelObj.cta.call()}
                >
                  {modelObj?.cta?.title}
                </Button>
                <Button
                  color="secondary"
                  style={{
                    background: "red",
                  }}
                  onClick={toggle}
                >
                  Close
                </Button>
              </ModalFooter>
            </Modal>
          </>
        }
      />
    </div>
  ) : null;
};

export default NotificationPopup;
