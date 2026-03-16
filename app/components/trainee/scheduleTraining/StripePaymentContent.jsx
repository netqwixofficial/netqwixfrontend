import React, { useContext, useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../store";
import StripeCard from "../../../common/stripe";
import {
  bookSessionAsync,
  traineeAction,
  traineeState,
} from "../trainee.slice";
import { authAction, authState } from "../../auth/auth.slice";
import PaymentContent from "./PaymentContent";
import { X } from "react-feather";
import { routingPaths, topNavbarOptions } from "../../../common/constants";
import { useRouter } from "next/router";
import AddClip from "../../bookings/start/AddClip";
import { myClips } from "../../../../containers/rightSidebar/fileSection.api";
import {
  addTraineeClipInBookedSessionAsync,
  bookingsState,
  getScheduledMeetingDetailsAsync,
} from "../../common/common.slice";
import { SocketContext } from "../../socket";
import { EVENTS } from "../../../../helpers/events";
import { NotificationType, notificiationTitles } from "../../../../utils/constant";
const StripePaymentContent = ({
  transaction,
  setShowTransactionModal,
  setBookSessionPayload,
  bookSessionPayload,
  setIsPopoverOpen,
  trainerInfo: trainer = null,
}) => {
  const router = useRouter();
  const socket = useContext(SocketContext);
  const dispatch = useAppDispatch();
  const { newBookingData } = useAppSelector(traineeState);
  const { userInfo } = useAppSelector(authState);
  const { scheduledMeetingDetails } = useAppSelector(bookingsState);
  const { removePaymentIntent } = traineeAction;
  const [isAddClipModalOpen, setIsAddClipModalOpen] = useState(false);
  const [clips, setClips] = useState([]);
  const [selectedClips, setSelectedClips] = useState([]);
  const [trainerInfo, setTrainerInfo] = useState(trainer);

  const getMyClips = async () => {
    var res = await myClips({});
    // dispatch(getScheduledMeetingDetailsAsync());
    setClips(res?.data);
  };
  const addTraineeClipInBookedSession = async (selectedClips) => {
    const payload = {
      id: newBookingData?._id,
      trainee_clip: selectedClips?.map((val) => val?._id),
    };
    dispatch(addTraineeClipInBookedSessionAsync(payload));
    dispatch(traineeAction.removeNewBookingData());
    setClips(null);
    setIsAddClipModalOpen(false);
    setShowTransactionModal(false);
    // After booking/payment flow, go to Upcoming Sessions
    router.push("/dashboard/upcoming-sessions");
  };
  useEffect(() => {
    if (window.location.pathname !== "/dashboard/upcoming-sessions") {
      if (newBookingData?._id) {
        getMyClips();
        setIsAddClipModalOpen(true);
      }
    }
  }, [newBookingData]);

  useEffect(() => {
    if (window.location.pathname !== "/dashboard/upcoming-sessions") {
      const sessionTrainer = scheduledMeetingDetails?.find(
        (data) => data?._id === newBookingData?._id
      );
      setTrainerInfo(sessionTrainer?.trainer_info);
    }
  }, [scheduledMeetingDetails]);

  const sendNotifications = (data) => {
    socket?.emit(EVENTS.PUSH_NOTIFICATIONS.ON_SEND, data);
  };

  return (
    <>
      {transaction && transaction?.intent && transaction?.intent?.result ? (
        <div>
          <div className="d-flex justify-content-end mr-3">
            <h2
              type="button"
              className="btn-close"
              aria-label="Close"
              onClick={() => {
                setIsAddClipModalOpen(false);
                setShowTransactionModal(false);
                dispatch(removePaymentIntent());
              }}
            >
              <X />
            </h2>
          </div>
          <div>
            {/* <h5>To book a slot, please pay {TRAINER_AMOUNT_USD}$.</h5> */}
            <div>
              <StripeCard
                clientSecret={transaction?.intent?.result?.client_secret}
                handlePaymentSuccess={ async () => {
                  if (window.location.pathname === "/dashboard/upcoming-sessions") {
                    setShowTransactionModal(false);
                  }
                  const payload = {
                    ...bookSessionPayload,
                    payment_intent_id: transaction?.intent?.result?.id,
                    amount: transaction?.intent?.result?.amount / 100,
                    application_fee_amount:
                      transaction?.intent?.result?.application_fee_amount / 100,
                  };
                  dispatch(bookSessionAsync(payload));
                   
                  console.log("sendNotifications",{
                    title: notificiationTitles.newBookingRequest,
                    description: `${userInfo?.fullname} has booked a session with you. Please confirm and start the lesson via the upcoming sessions tab in My Locker.`,
                    senderId: userInfo?._id,
                    receiverId: payload?.trainer_id,
                    bookingInfo:null
                  })
                  sendNotifications({
                    title: notificiationTitles.newBookingRequest,
                    description: `${userInfo?.fullname} has booked a session with you. Please confirm and start the lesson via the upcoming sessions tab in My Locker.`,
                    senderId: userInfo?._id,
                    receiverId: payload?.trainer_id,
                    bookingInfo:null,
                    type:NotificationType.TRANSCATIONAL
                  });

                  // Refecting the current Booking 

                   // Redirecting to the Booking tab
                   dispatch(authAction?.setTopNavbarActiveTab(topNavbarOptions?.UPCOMING_SESSION));

                  dispatch(
                    getScheduledMeetingDetailsAsync({
                      status: "upcoming",
                    })
                  );

                  

                  setBookSessionPayload({});
                
                }}
                extraContent={
                  bookSessionPayload && bookSessionPayload.trainer_id ? (
                    // renderPaymentContent()
                    <PaymentContent bookSessionPayload={bookSessionPayload} />
                  ) : (
                    <></>
                  )
                }
                amount={bookSessionPayload?.charging_price ?? 0}
              />
            </div>
          </div>
        </div>
      ) : (
        <></>
      )}

      {/* <AddClip
        isOpen={isAddClipModalOpen}
        onClose={() => {
          setIsAddClipModalOpen(false);
          setShowTransactionModal(false);
          router.push(routingPaths.dashboard);
          
        }}
        trainer={trainerInfo?.fullname}
        selectedClips={selectedClips}
        setSelectedClips={setSelectedClips}
        clips={clips}
        shareFunc={addTraineeClipInBookedSession}
        sendNotfication={triggerNotification}
      /> */}
    </>
  );
};

export default StripePaymentContent;
