import React, { useContext, useEffect, useState, useRef } from "react";
import TrainerSlider from "./trainerSlider";
import ReactDatePicker from "react-datepicker";
import moment from "moment";
import { getLocalTimeZone, Utils } from "../../../../utils/utils";
import {
  checkSlotAsync,
  commonAction,
  commonState,
} from "../../../common/common.slice";
import { useAppDispatch, useAppSelector } from "../../../store";
import { getAvailability } from "../../calendar/calendar.api";
// import Input from './Input';
import { SetColumns } from "./SetColumns";
import {
  bookSessionAsync,
  createPaymentIntentAsync,
  traineeAction,
  traineeState,
} from "../trainee.slice";
import StripePaymentContent from "./StripePaymentContent";
// import { Modal } from 'reactstrap';
import Modal from "../../../common/modal";
import {
  AccountType,
  BookedSession,
  DefaultTimeRange,
  LOCAL_STORAGE_KEYS,
  STATUS,
  routingPaths,
  topNavbarOptions,
} from "../../../common/constants";
import { ToastContainer, toast } from "react-toastify";
import { authAction, authState } from "../../auth/auth.slice";
import { useRouter } from "next/router";
import AuthUserModal from "./authUserModal";
import InstantLessonTimeLine from "./InstantLessonTimeLine";
import { currentTimeZone } from "../../../../utils/videoCall";
import { checkSlot } from "../../../common/common.api";
import { useSelector } from "react-redux";
import { DateTime } from "luxon";
import { SocketContext } from "../../socket";
import { EVENTS } from "../../../../helpers/events";
import { getScheduledMeetingDetailsAsync } from "../../common/common.slice";
import { NotificationType, notificiationTitles } from "../../../../utils/constant";
// import { SocketContext } from "../socket";

const BookingTable = ({
  selectedTrainer,
  trainerInfo,
  setStartDate,
  startDate,
  getParams,
  isUserOnline = false,
}) => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const socket = useContext(SocketContext);
  const isTokenExists = localStorage.getItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN);
  const { status, getTraineeSlots, transaction } = useAppSelector(traineeState);
  const { userInfo, isAuthModalOpen, slotData, onlineUsers } =
    useAppSelector(authState);
  const { removePaymentIntent } = traineeAction;
  const [amount, setAmount] = useState(0);
  const [availableSlotsState, setAvailableSlotsState] = useState([]);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [bookSessionPayload, setBookSessionPayload] = useState({});
  const [listOfTrainers, setListOfTrainers] = useState([]);
  const [bookingColumns, setBookingColumns] = useState([]);
  const [isInstantLessonModalOpen, setIsInstantLessonModalOpen] =
    useState(false);
  const [timeRange, setTimeRange] = useState({
    startTime: "",
    endTime: "",
  });
  const [showCommonBookingOption, setShowCommonBookingOption] = useState(false);
  const { data: { extraInfo } = {}, trainer_id } = selectedTrainer || {};
  const { from, to } = extraInfo?.working_hours || {};
  const fromHours = from ? Utils.getTimeFormate(from) : null;
  const toHours = to ? Utils.getTimeFormate(to) : null;
  const formateStartTime = Utils.getTimeFormate(
    trainerInfo?.userInfo?.extraInfo?.working_hours?.from
  );
  const formateEndTime = Utils.getTimeFormate(
    trainerInfo?.userInfo?.extraInfo?.working_hours?.to
  );
  const { slots } = useAppSelector(commonState);
  const [isCommonBooking, setIsCommonBooking] = useState(false);
  const [selectedSlots, setSelectedSlot] = useState(null);
  const bookingProcessedRef = useRef(false);

  const sendNotifications = (data) => {
    socket?.emit(EVENTS.PUSH_NOTIFICATIONS.ON_SEND, data);
  };

  useEffect(() => {
    // Add CSS animation for glowing effect
    const style = document.createElement('style');
    style.id = 'book-instant-glow-animation';
    style.textContent = `
      @keyframes slowGlow {
        0%, 100% {
          box-shadow: 0 0 10px rgba(255, 0, 0, 0.5),
                      0 0 20px rgba(255, 0, 0, 0.3),
                      0 0 30px rgba(255, 0, 0, 0.2);
        }
        50% {
          box-shadow: 0 0 20px rgba(255, 0, 0, 0.8),
                      0 0 40px rgba(255, 0, 0, 0.6),
                      0 0 60px rgba(255, 0, 0, 0.4);
        }
      }
    `;
    if (!document.getElementById('book-instant-glow-animation')) {
      document.head.appendChild(style);
    }
    return () => {
      const existingStyle = document.getElementById('book-instant-glow-animation');
      if (existingStyle) {
        document.head.removeChild(existingStyle);
      }
    };
  }, []);

  useEffect(() => {
    const todaySDate = Utils.getDateInFormatIOS(new Date());
    const { weekDates, weekDateFormatted } =
      Utils.getNext7WorkingDays(todaySDate);
    SetColumns(weekDateFormatted, setBookingColumns);
    setListOfTrainers(
      getTraineeSlots.map((trainer) => {
        return {
          id: trainer._id,
          trainer_id: trainer.trainer_id,
          background_image: trainer?.profilePicture,
          isActive: true,
          category: trainer?.category,
          name: trainer?.fullname,
          isCategory: false,
          extraInfo: trainer.extraInfo,
          is_kyc_completed: trainer?.is_kyc_completed,
          stripe_account_id: trainer?.stripe_account_id,
          commission: trainer?.commission ?? 5,
        };
      })
    );
  }, [getTraineeSlots]);
  useEffect(() => {
    // Show payment modal if client_secret exists
    if (transaction?.intent?.result?.client_secret) {
      setShowTransactionModal(true);
    }

    // Handle skip transaction (free bookings)
    if (
      transaction?.intent?.result?.skip && 
      bookSessionPayload?.trainer_id &&
      Object.keys(bookSessionPayload).length > 0 &&
      !bookingProcessedRef.current
    ) {
      bookingProcessedRef.current = true; // Mark as processed to prevent duplicate calls
      
      const payload = {
        ...bookSessionPayload,
        amount: bookSessionPayload.charging_price || 0,
        // Ensure all required fields are present
        trainer_id: bookSessionPayload.trainer_id,
        booked_date: bookSessionPayload.booked_date,
        session_start_time: bookSessionPayload.session_start_time,
        session_end_time: bookSessionPayload.session_end_time,
        start_time: bookSessionPayload.start_time,
        end_time: bookSessionPayload.end_time,
        status: bookSessionPayload.status || BookedSession.booked,
      };

      // Clear payload immediately to prevent duplicate calls
      setBookSessionPayload({});
      
      // Dispatch booking
      dispatch(bookSessionAsync(payload))
        .then((result) => {
          // Only send notification and redirect if booking succeeds
          if (result.type === 'add/trainee/book-session/fulfilled') {
            sendNotifications({
              title: notificiationTitles.newBookingRequest,
              description: `${userInfo?.fullname} has booked a session with you. Please confirm and start the lesson via the upcoming sessions tab in My Locker.`,
              senderId: userInfo?._id,
              receiverId: payload?.trainer_id,
              bookingInfo: null,
              type: NotificationType.TRANSCATIONAL
            });

            // Redirecting to the Booking tab
            dispatch(authAction?.setTopNavbarActiveTab(topNavbarOptions?.UPCOMING_SESSION));

            // Refresh scheduled meetings
            dispatch(
              getScheduledMeetingDetailsAsync({
                status: "upcoming",
              })
            );
          }
          // Reset ref after booking completes (success or failure)
          bookingProcessedRef.current = false;
        })
        .catch((error) => {
          console.error('Booking failed:', error);
          // Reset ref on error to allow retry
          bookingProcessedRef.current = false;
        });
    }

    // Reset ref when transaction changes (new payment intent)
    if (!transaction?.intent?.result?.skip) {
      bookingProcessedRef.current = false;
    }
  }, [transaction?.intent?.result, bookSessionPayload?.trainer_id, dispatch, userInfo, sendNotifications]);

   

  // useEffect(() => {
  //   if (status === STATUS.fulfilled) {
  //     const bookingDate = Utils.getDateInFormatIOS(startDate);
  //     if (
  //       trainerInfo?.userInfo?.trainer_id ||
  //       selectedTrainer?.trainer_id ||
  //       trainerInfo?.userInfo?.id ||
  //       trainerInfo?.userInfo?._id
  //     ) {
  //       const payload = {
  //         trainer_id:
  //           trainerInfo?.userInfo?.trainer_id ||
  //           selectedTrainer?.trainer_id ||
  //           trainerInfo?.userInfo?.id || trainerInfo?.userInfo?._id,
  //         booked_date: bookingDate,
  //         slotTime: {
  //           from: timeRange.startTime
  //             ? timeRange.startTime
  //             : DefaultTimeRange.startTime,
  //           to: timeRange.endTime
  //             ? timeRange.endTime
  //             : DefaultTimeRange.endTime,
  //         },
  //       };
  //       let date = new Date(startDate).toISOString().split("T")[0];
  //       let dateArr = date?.split("-");
  //       let start_time = new Date(
  //         Number(dateArr[0]),
  //         Number(dateArr[1]) - 1,
  //         Number(dateArr[2]),
  //         0,
  //         0,
  //         0,
  //         0
  //       ).toISOString();
  //       let end_time = new Date(
  //         Number(dateArr[0]),
  //         Number(dateArr[1]) - 1,
  //         Number(dateArr[2]),
  //         23,
  //         59,
  //         0,
  //         0
  //       ).toISOString();
  //       // dispatch(authAction.updateTrainerAndDate({selectedTrainerId : trainerInfo?.userInfo?.trainer_id || selectedTrainer?.trainer_id , selectedDate: startDate}))
  //       // getAvailability({
  //       //   trainer_id:
  //       //     trainerInfo?.userInfo?.trainer_id ||
  //       //     selectedTrainer?.trainer_id ||
  //       //     trainerInfo?.userInfo?.id || trainerInfo?.userInfo?._id,
  //       //   start_time: start_time,
  //       //   end_time: end_time,
  //       // })
  //       //   .then((res) => {
  //       //     setAvailableSlotsState(res?.data);
  //       //   })
  //       //   .catch((err) => {
  //       //     // dispatch(authAction.updateIsAuthModalOpen(true))
  //       //   });
  //       // dispatch(checkSlotAsync(payload));
  //        
  //       checkSlot(payload).then(res => {
  //          
  //         dispatch(commonAction.setSlots(res.data.availableSlots))
  //       }).catch((err) =>{
  //         dispatch(commonAction.setSlots([]))
  //       })
  //     }
  //   }
  // }, [status,showCommonBookingOption]);

  useEffect(() => {
    if (
      isTokenExists &&
      Object.keys(userInfo).length !== 0 &&
      window.location.pathname !== routingPaths.dashboard
    ) {
      if (userInfo?.account_type === AccountType.TRAINEE) {
        dispatch(
          createPaymentIntentAsync({
            amount: +amount,
            destination: trainerInfo?.userInfo?.stripe_account_id,
            commission: trainerInfo?.userInfo?.commission,
            customer: userInfo?.stripe_account_id,
          })
        );
      } else {
        setTimeout(() => {
          toast.error("You cannot book a slot with a trainer account.");
        }, 2000);

        setTimeout(() => {
          router.push(routingPaths.dashboard);
        }, 5000);
      }
    }
  }, [isTokenExists, userInfo]);
  useEffect(() => {
    setAvailableSlotsState(slotData);
  }, [slotData]);

  const Input = ({ onChange, placeholder, value, isSecure, id, onClick }) => (
    <span
      onChange={onChange}
      placeholder={placeholder}
      value={value}
      isSecure={isSecure}
      id={id}
      onClick={onClick}
      className="select_date"
    >
      {Utils.formateDate(startDate)}
    </span>
  );
  //  

  const userIsOnlineOrNot =
    isUserOnline ||
    Utils.isTrainerOnline(
      trainerInfo?.userInfo?._id ||
      trainerInfo?.userInfo?.trainer_id ||
      selectedTrainer?.trainer_id ||
      trainerInfo?.userInfo?.id,
      onlineUsers
    );

  const renderBookingComponent = () => {
    return (
      <div className="row">
        <div className="col-12 mb-3 d-flex ml-n3 ">
          <label className="mr-2 mt-2 ml-3" style={{ fontSize: "14px" }}>
            Select date :{" "}
          </label>
          <div className="date-picker">
            <ReactDatePicker
              style={{
                fontSize: "14px",
              }}
              className="mt-1"
              minDate={moment().toDate()}
              onChange={(date) => {
                if (date) {
                  let booked_date = DateTime.fromJSDate(date, { zone: 'utc' }); // Sample booked date
                   
                  const today = DateTime.now();

                  // Initialize a variable to store the final formatted date
                  let finalFormattedDate;

                  if (booked_date.hasSame(today, "day")) {
                    // If the booked_date is the same day as today
                    finalFormattedDate =
                      today.toISO({
                        suppressMilliseconds: false,
                        includeOffset: false,
                      }) + "Z";
                    console.log(
                      "Formatted Date (Same Day):",
                      finalFormattedDate
                    );
                  } else if (booked_date > today) {
                    // If the booked_date is in the future
                    finalFormattedDate =
                      booked_date
                        .startOf("day")
                        .toISO({
                          suppressMilliseconds: false,
                          includeOffset: false,
                        }) + "Z";
                    console.log(
                      "Formatted Date (Future Date):",
                      finalFormattedDate
                    );
                  } else {
                    // Optional: Handle the case where the booked_date is in the past
                    finalFormattedDate = null; // or any other value you want to set for past dates
                     
                  }

                  const payload = {
                    trainer_id:
                      trainerInfo?.userInfo?._id ||
                      trainerInfo?.userInfo?.trainer_id ||
                      selectedTrainer?.trainer_id ||
                      trainerInfo?.userInfo?.id,
                    booked_date: finalFormattedDate,
                    slotTime: {
                      from:
                        formateStartTime ||
                        timeRange.startTime ||
                        DefaultTimeRange.startTime,
                      to:
                        formateEndTime ||
                        timeRange.endTime ||
                        DefaultTimeRange.endTime,
                    },
                    traineeTimeZone: getLocalTimeZone(),
                  };
                  // dispatch(checkSlotAsync(payload));
                  setStartDate(date);
                  date = new Date(date).toISOString().split("T")[0];
                  let dateArr = date?.split("-");
                  let start_time = new Date(
                    Number(dateArr[0]),
                    Number(dateArr[1]) - 1,
                    Number(dateArr[2]),
                    0,
                    0,
                    0,
                    0
                  ).toISOString();
                  let end_time = new Date(
                    Number(dateArr[0]),
                    Number(dateArr[1]) - 1,
                    Number(dateArr[2]),
                    23,
                    59,
                    0,
                    0
                  ).toISOString();
                  // getAvailability({
                  //   trainer_id:
                  //     trainerInfo?.userInfo?._id ||
                  //     trainerInfo?.userInfo?.trainer_id ||
                  //     selectedTrainer?.trainer_id ||
                  //     trainerInfo?.userInfo?.id,
                  //   start_time: start_time,
                  //   end_time: end_time,
                  // }).then((res) => {
                  //   setAvailableSlotsState(res?.data);
                  // });
                  checkSlot(payload)
                    .then((res) => {
                      dispatch(commonAction.setSlots(res.data.availableSlots));
                    })
                    .catch((err) => {
                      dispatch(commonAction.setSlots(null));
                    });
                }
                const todaySDate = Utils.getDateInFormatIOS(date.toString());
                const { weekDateFormatted, weekDates } =
                  Utils.getNext7WorkingDays(todaySDate);
                SetColumns(weekDateFormatted, setBookingColumns);
                // setTableData(getTraineeSlots, weekDates);
                SetColumns(weekDateFormatted, setBookingColumns);
              }}
              selected={startDate}
              customInput={<Input />}
              dateFormat="MM-dd-yyyy"
            />
          </div>
        </div>

        <div className="col-11">
          {

            <div className="row">
              <label className="mt-1 ml-3" style={{ fontSize: "13px" }}>
                Select Slot :{" "}
              </label>
              <div
                className="row"
                style={{
                  display: "flex",
                  width: "100%",
                  justifyContent: "space-between",
                  margin: "0px 10px",
                  textAlign: "center",
                }}
              >
                {slots?.length > 0 &&
                  Utils.isSlotAvailable(slots, startDate) ? (
                  <>
                    {" "}
                    {slots?.map((item, i) => {
                      // let today = new Date().toISOString().split('T')[0];
                      // if(startDate === today){
                      //   if (!Utils.isInFuture(item.end)) return;
                      // }

                      return (
                        <div
                          onClick={() => {
                            setIsInstantLessonModalOpen(true);
                            setIsCommonBooking(true);
                            setSelectedSlot(item);
                          }}
                          className="col-6"
                          style={{
                            border: item?.status
                              ? "2px solid grey"
                              : item?.isSelected
                                ? "2px solid green"
                                : "1px solid",
                            cursor: "pointer",
                            padding: "10px 0px",
                          }}
                        >
                          <b
                            style={{ color: item?.status ? "grey" : "#000080" }}
                          >
                            {item?.start}
                            {"  -  "}
                            {item?.end}
                          </b>
                        </div>
                      );
                    })}
                    {/* <div className="col-12 mb-3 d-flex justify-content-center align-items-center">
                    <button
                      type="button"
                      disabled={
                        !availableSlotsState?.find((slt) => slt?.isSelected)
                      }
                      className="mt-3 btn btn-sm btn-primary"
                      onClick={() => {
                        var slot = availableSlotsState?.find(
                          (slt) => slt?.isSelected
                        );

                        var start_time = `${new Date(slot?.start_time)
                          .getHours()
                          .toString()
                          .padStart(2, "0")}:${new Date(slot?.start_time)
                            .getMinutes()
                            .toString()
                            .padStart(2, "0")}`;
                        var end_time = `${new Date(slot?.end_time)
                          .getHours()
                          .toString()
                          .padStart(2, "0")}:${new Date(slot?.end_time)
                            .getMinutes()
                            .toString()
                            .padStart(2, "0")}`;

                        const amountPayable = Utils.getMinutesFromHourMM(
                          start_time,
                          end_time,
                          trainerInfo?.userInfo?.extraInfo?.hourly_rate
                        );

                        if (amountPayable > 0) {
                          if (
                            Utils.isInRange(startDate, start_time, end_time)
                          ) {
                            toast.error(
                              "The specified time has elapsed. Please select another time..."
                            );
                          } else {
                            if (isTokenExists) {
                              dispatch(
                                authAction.updateIsAuthModalOpen(false)
                              );
                              dispatch(
                                createPaymentIntentAsync({
                                  amount: +amountPayable.toFixed(1),
                                  destination:
                                    trainerInfo?.userInfo?.stripe_account_id,
                                  commission:
                                    trainerInfo?.userInfo?.commission,
                                  customer: userInfo?.stripe_account_id,
                                })
                              );
                            } else {
                              dispatch(
                                authAction.updateIsAuthModalOpen(true)
                              );
                            }
                            const payload = {
                              slot_id: slot?._id,
                              charging_price: amountPayable,
                              trainer_id:
                                trainerInfo?._id ||
                                trainerInfo?.userInfo?._id ||
                                trainerInfo?.userInfo?.trainer_id ||
                                selectedTrainer?.trainer_id,
                              trainer_info:
                                trainerInfo || selectedTrainer.data,
                              hourly_rate:
                                trainerInfo?.userInfo?.extraInfo
                                  ?.hourly_rate ||
                                selectedTrainer?.data?.extraInfo?.hourly_rate,
                              status: BookedSession.booked,
                              booked_date: startDate,
                              session_start_time: start_time,
                              session_end_time: end_time,
                              start_time: slot?.start_time,
                              end_time: slot?.end_time,
                            };
                            setBookSessionPayload(payload);
                            setAmount(amountPayable.toFixed(1));
                          }
                        }
                      }}
                    >
                      Book Slot Now
                    </button>
                  </div> */}
                  </>
                ) : (
                  <div className="mt-1 ml-3" style={{ fontSize: "13px" }}>
                    <span>Expert is not available.</span>
                  </div>
                )}
              </div>
            </div>
          }
        </div>
      </div>
    );
  };

   

  if (trainerInfo?.userInfo?.status !== "approved") {
    return <p style={{ textAlign: "center", color: "red" }}>You cannot book session with unverified trainer!</p>;
  }

  if (userInfo?.account_type === AccountType.TRAINEE) {
    if (userInfo?.status === "pending") {
      return <p style={{ textAlign: "center", color: "orange" }}>Please wait while the admin approves your request.</p>;
    }

    if (userInfo?.status === "rejected") {
      return <p style={{ textAlign: "center", color: "darkred" }}>Your account has been rejected by the admin. Please contact customer support.</p>;
    }
  }


  return (
    <>
      {/* <ToastContainer /> */}

      <div
        style={{
          width: "100%",
          display: "flex",
          // justifyContent: "space-between",
          alignItems: "center",
          padding: "1rem",
          flexDirection: "column",
          // backgroundColor: "#f0f0f0",
        }}
      >
        {" "}
        {/* Banner styles */}
        {userIsOnlineOrNot && (
          <>
            <div
              style={{ display: "flex", alignItems: "center", width: "100%" }}
            >
              {" "}
              {/* <h2
                style={{
                  fontSize: "1.2rem",
                  fontWeight: "bold",
                  // color: "#28a745",
                  marginRight: "auto",
                  marginLeft: "auto",
                  marginBottom: 10,
                }}
              >
                Book Instant Lesson
              </h2> */}
              {/* <button
                style={{
                  backgroundColor: "#28a745",
                  color: "#fff",
                  padding: "0.7rem 1rem",
                  borderRadius: "5px",
                  margin : '5px auto',
                  border : '1px solid #28a745',
                  width : '100%',
                  fontSize : '1rem'
                }}
              >
                Trainer is Online
              </button> */}
            </div>
            <div
              style={{ display: "flex", alignItems: "center", width: "100%" }}
            >
              {" "}
              {/* Banner right styles */}
              <button
                className="book-instant-glow"
                style={{
                  backgroundColor: "#ff0000",
                  color: "#fff",
                  padding: "0.7rem 1rem",
                  borderRadius: "5px",
                  margin: "5px auto",
                  width: "100%",
                  fontSize: "1rem",
                  border: "none",
                  transition: "all 0.3s ease",
                  cursor: "pointer",
                  fontWeight: 600,
                  position: "relative",
                  animation: "slowGlow 3s ease-in-out infinite"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#dc2626";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#ff0000";
                }}
                onClick={() => {
                  setIsInstantLessonModalOpen(true);
                  setShowCommonBookingOption(false);
                }}
              >
                Book Instant Lesson Now
              </button>
            </div>
            <div style={{ margin: "5px auto" }}>
              <p
                style={{
                  color: "rgb(0, 0, 128)",
                  fontSize: "1.5rem",
                  fontWeight: "bold",
                  margin: "0",
                }}
              >
                OR
              </p>
            </div>
          </>
        )}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginLeft: "10px",
            width: "100%",
          }}
        >
          <button
            style={{
              backgroundColor: "#000080",
              border: "1px solid #000080",
              color: "#fff",
              padding: "0.7rem 1rem",
              borderRadius: "5px",
              margin: "5px auto",
              width: "100%",
              fontSize: "1rem",
            }}
            onClick={() => {
              let date = new Date();
              if (date) {
                let booked_date = DateTime.fromJSDate(date, { zone: 'utc' }); // Sample booked date
                 
                const today = DateTime.now();

                // Initialize a variable to store the final formatted date
                let finalFormattedDate;

                if (booked_date.hasSame(today, "day")) {
                  // If the booked_date is the same day as today
                  finalFormattedDate =
                    today.toISO({
                      suppressMilliseconds: false,
                      includeOffset: false,
                    }) + "Z";
                  console.log(
                    "Formatted Date (Same Day):",
                    finalFormattedDate
                  );
                } else if (booked_date > today) {
                  // If the booked_date is in the future
                  finalFormattedDate =
                    booked_date
                      .startOf("day")
                      .toISO({
                        suppressMilliseconds: false,
                        includeOffset: false,
                      }) + "Z";
                  console.log(
                    "Formatted Date (Future Date):",
                    finalFormattedDate
                  );
                } else {
                  // Optional: Handle the case where the booked_date is in the past
                  finalFormattedDate = null; // or any other value you want to set for past dates
                   
                }

                const payload = {
                  trainer_id:
                    trainerInfo?.userInfo?._id ||
                    trainerInfo?.userInfo?.trainer_id ||
                    selectedTrainer?.trainer_id ||
                    trainerInfo?.userInfo?.id,
                  booked_date: finalFormattedDate,
                  slotTime: {
                    from:
                      formateStartTime ||
                      timeRange.startTime ||
                      DefaultTimeRange.startTime,
                    to:
                      formateEndTime ||
                      timeRange.endTime ||
                      DefaultTimeRange.endTime,
                  },
                  traineeTimeZone: getLocalTimeZone(),
                };
                // dispatch(checkSlotAsync(payload));
                setStartDate(date);
                date = new Date(date).toISOString().split("T")[0];
                let dateArr = date?.split("-");
                let start_time = new Date(
                  Number(dateArr[0]),
                  Number(dateArr[1]) - 1,
                  Number(dateArr[2]),
                  0,
                  0,
                  0,
                  0
                ).toISOString();
                let end_time = new Date(
                  Number(dateArr[0]),
                  Number(dateArr[1]) - 1,
                  Number(dateArr[2]),
                  23,
                  59,
                  0,
                  0
                ).toISOString();
                // getAvailability({
                //   trainer_id:
                //     trainerInfo?.userInfo?._id ||
                //     trainerInfo?.userInfo?.trainer_id ||
                //     selectedTrainer?.trainer_id ||
                //     trainerInfo?.userInfo?.id,
                //   start_time: start_time,
                //   end_time: end_time,
                // }).then((res) => {
                //   setAvailableSlotsState(res?.data);
                // });
                checkSlot(payload)
                  .then((res) => {
                    dispatch(commonAction.setSlots(res.data.availableSlots));
                  })
                  .catch((err) => {
                    dispatch(commonAction.setSlots(null));
                  });
              }
              const todaySDate = Utils.getDateInFormatIOS(date.toString());
              const { weekDateFormatted, weekDates } =
                Utils.getNext7WorkingDays(todaySDate);
              SetColumns(weekDateFormatted, setBookingColumns);
              // setTableData(getTraineeSlots, weekDates);
              SetColumns(weekDateFormatted, setBookingColumns);
              setShowCommonBookingOption(true);
              setIsInstantLessonModalOpen(false);
            }}
          >
            Schedule Lesson
          </button>
        </div>
      </div>

      {showCommonBookingOption ? renderBookingComponent() : null}

      <InstantLessonTimeLine
        isOpen={isInstantLessonModalOpen}
        onClose={setIsInstantLessonModalOpen}
        trainerInfo={trainerInfo}
        userInfo={userInfo}
        setBookSessionPayload={setBookSessionPayload}
        setAmount={setAmount}
        startDate={startDate}
        isCommonBooking={isCommonBooking}
        setIsCommonBooking={setIsCommonBooking}
        selectedDate={
          startDate
            ? Utils.getDateInFormatIOS(startDate)
            : new Date().toISOString().split("T")[0]
        }
        selectedSlot={selectedSlots}
      />
      <Modal
        isOpen={showTransactionModal}
        allowFullWidth={true}
        element={
          <StripePaymentContent
            transaction={transaction}
            setShowTransactionModal={setShowTransactionModal}
            removePaymentIntent={removePaymentIntent}
            setBookSessionPayload={setBookSessionPayload}
            bookSessionPayload={bookSessionPayload}
            trainerInfo={trainerInfo}
            isCommonBooking={isCommonBooking}
            setIsCommonBooking={setIsCommonBooking}
            selectedSlot={selectedSlots}
          />
        }
      />
      {isAuthModalOpen && <AuthUserModal />}
    </>
  );
};

export default BookingTable;
