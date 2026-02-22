import React, { useEffect, useState, useRef, useContext } from "react";
import NavHomePageCenterContainer from "./NavHomePageCenterContainer";
import "./home.scss";
import ShareClipsCard from "../share-clips";
import UploadClipCard from "../videoupload/UploadClipCard";
import InviteFriendsCard from "../invite-friends";
import RecentUsers from "../recent-users";
import { useMediaQuery } from "../../hook/useMediaQuery";
import {
  AccountType,
  bookingButton,
  LIST_OF_ACCOUNT_TYPE,
} from "../../common/constants";
import { useAppDispatch, useAppSelector } from "../../store";
import { authState } from "../auth/auth.slice";
import "./index.scss";
import Slider from "react-slick"; 
import OnlineUserCard from "./banner";
import {
  addTraineeClipInBookedSessionAsync,
  bookingsAction,
  bookingsState,
  getScheduledMeetingDetailsAsync,
} from "../common/common.slice";

import { convertTimesForDataArray, CovertTimeAccordingToTimeZone, formatTimeInLocalZone, Utils } from "../../../utils/utils";
import { Button } from "reactstrap";
import { DateTime } from "luxon";
import { traineeAction } from "../trainee/trainee.slice";
import { addRating } from "../common/common.api";
import TrainerRenderBooking from "../bookings/TrainerRenderBooking";
import TraineeRenderBooking from "../bookings/TraineeRenderBooking";
import { fetchAllLatestOnlineUsers } from "../auth/auth.api";
import { acceptFriendRequest, getFriendRequests, rejectFriendRequest } from "../../common/common.api";
import { toast } from "react-toastify";
import { EVENTS } from "../../../helpers/events";
import { SocketContext } from "../socket";
import { Star } from "react-feather";
import ImageSkeleton from "../common/ImageSkeleton";
import { notificiationTitles } from "../../../utils/constant";
import TrainerCardSkeleton from "../common/TrainerCardSkeleton";
import ActiveSessionSkeleton from "../common/ActiveSessionSkeleton";
import UserInfoCard from "../cards/user-card";
const NavHomePage = () => {
  const [progress, setProgress] = useState(0);
  const width2000 = useMediaQuery(2000);
  const width1200 = useMediaQuery(1200);
  const width1000 = useMediaQuery(1000);
  const width900 = useMediaQuery(900);

  const width600 = useMediaQuery(700);
  const [isOpen, setIsOpen] = useState(false);
  const [isOpenID, setIsOpenID] = useState("");
  const [selectedClips, setSelectedClips] = useState([]);
  const [bookedSession, setBookedSession] = useState({
    id: "",
    booked_status: "",
  });
  const [bIndex, setBIndex] = useState(0);
  const [tabBook, setTabBook] = useState(bookingButton[0]);
  const { removeNewBookingData } = traineeAction;
  const { isLoading, configs, startMeeting, isMeetingLoading } = useAppSelector(bookingsState);
  const { accountType, onlineUsers } = useAppSelector(authState);
  const [activeTrainer, setActiveTrainer] = useState([]);
  const [isLoadingTrainers, setIsLoadingTrainers] = useState(true);
  const [friendRequests, setFriendRequests] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [activeCenterTab, setActiveCenterTab] = useState("myClips");
  const [selectedTraineeId, setSelectedTraineeId] = useState(null);
  const socket = useContext(SocketContext);
  
  // Use refs to prevent duplicate API calls when switching tabs
  const hasFetchedFriendRequestsRef = useRef(false);
  const hasFetchedActiveTrainerRef = useRef(false);
  const hasFetchedScheduledMeetingsRef = useRef(false);
  // Track if we've completed the first load of scheduled meetings (so we don't show active-session skeleton when there are none)
  const hasScheduledMeetingsLoadedOnceRef = useRef(false);
  
  
  const getFriendRequestsApi = async () => {
    try {
      let res = await getFriendRequests();
      setFriendRequests(res?.friendRequests);
       
    } catch (error) {
       
    }
  };

  useEffect(() => {
    // Only fetch if not already fetched
    if (!hasFetchedFriendRequestsRef.current) {
      hasFetchedFriendRequestsRef.current = true;
      getFriendRequestsApi();
    }
  }, []);

  const handleAcceptFriendRequest = async (requestId) => {
    try {
      await acceptFriendRequest({ requestId });
      toast.success("Friend request accepted");
      getFriendRequestsApi();
    } catch (error) {
      toast.error(error);
    }
  };

  const handleRejectFriendRequest = async (requestId) => {
    try {
      await rejectFriendRequest({ requestId });
      toast.success("Friend request rejected");
      getFriendRequestsApi();
    } catch (error) {
      toast.error(error);
    }
  };

  const getAllLatestActiveTrainer = async () => {
    try {
      setIsLoadingTrainers(true);
      const response = await fetchAllLatestOnlineUsers();

      if (response.code === 200) {
        setActiveTrainer(response.result);
      }
    } catch (error) {
      console.error("Error fetching active trainers:", error);
    } finally {
      setIsLoadingTrainers(false);
    }
  };

  //comment added

  const [userTimeZone, setUserTimeZone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const dispatch = useAppDispatch();
  const { scheduledMeetingDetails } = useAppSelector(bookingsState);
  const shouldShowCoachesSection =
    accountType === AccountType.TRAINEE &&
    (isLoadingTrainers || (activeTrainer && activeTrainer.length > 0));
  
  // Always fetch scheduled meetings on mount so Active Sessions show correctly
  // when sessions are booked (matches behavior at 9ebdf7b – active sessions on trainer/trainee).
  useEffect(() => {
    if (!hasFetchedScheduledMeetingsRef.current) {
      hasFetchedScheduledMeetingsRef.current = true;
      dispatch(getScheduledMeetingDetailsAsync());
    }
  }, [dispatch]);

  /**
   * Keep scheduled meetings (and therefore Active Sessions) in sync in real-time.
   * When a booking is created or its status changes, we silently refetch the
   * full scheduledMeetingDetails list so ActiveSessionsSection and related
   * components always reflect the latest state for both trainee and trainer.
   */
  useEffect(() => {
    if (!socket) return;

    const handleBookingUpdate = () => {
      dispatch(getScheduledMeetingDetailsAsync({ forceRefresh: true }));
      dispatch(getScheduledMeetingDetailsAsync({ status: "upcoming", forceRefresh: true }));
    };

    // Listen for push notifications that indicate booking updates
    const handleNotification = (notification) => {
      // Only refresh if it's a booking-related notification
      if (
        notification.title === notificiationTitles.newBookingRequest ||
        notification.title === notificiationTitles.sessionStrated ||
        notification.title === notificiationTitles.sessionConfirmation
      ) {
        // Small delay to ensure backend has processed the booking
        setTimeout(() => {
          handleBookingUpdate();
        }, 500);
      }
    };

    socket.on(EVENTS.PUSH_NOTIFICATIONS.ON_RECEIVE, handleNotification);
    socket.on(EVENTS.INSTANT_LESSON.ACCEPT, handleBookingUpdate);
    socket.on(EVENTS.BOOKING.CREATED, handleBookingUpdate);

    return () => {
      if (socket) {
        socket.off(EVENTS.PUSH_NOTIFICATIONS.ON_RECEIVE, handleNotification);
        socket.off(EVENTS.INSTANT_LESSON.ACCEPT, handleBookingUpdate);
        socket.off(EVENTS.BOOKING.CREATED, handleBookingUpdate);
      }
    };
  }, [socket, dispatch]);
  
  useEffect(() => {
    // Only fetch active trainers if not already fetched
    if (!hasFetchedActiveTrainerRef.current) {
      hasFetchedActiveTrainerRef.current = true;
      getAllLatestActiveTrainer();
    }
  }, []);

  var settings = {
    autoplay: false,
    infinite: false,
    speed: 400,
    slidesToShow: width600 ? 2.5 : width900 ? 3 : 4,
    slidesToScroll: 1,
    dots: false,
    arrows: activeTrainer?.length > (width600 ? 2.5 : width900 ? 3 : 4),
    swipe: true,
    swipeToSlide: true,
    touchMove: true,
    touchThreshold: 5,
    draggable: true,
    variableWidth: false,
    adaptiveHeight: true,
    lazyLoad: 'ondemand', // Enable lazy loading for slides
    cssEase: 'ease-in-out',
    responsive: [
      {
        breakpoint: 1200,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 1,
          swipe: true,
          swipeToSlide: true,
          touchMove: true,
          draggable: true,
          arrows: activeTrainer?.length > 3,
        },
      },
      {
        breakpoint: 900,
        settings: {
          slidesToShow: 2.5,
          slidesToScroll: 1,
          swipe: true,
          swipeToSlide: true,
          touchMove: true,
          draggable: true,
          arrows: activeTrainer?.length > 2.5,
        },
      },
      {
        breakpoint: 600,
        settings: {
          slidesToShow: 2.5,
          slidesToScroll: 1,
          swipe: true,
          swipeToSlide: true,
          touchMove: true,
          draggable: true,
          arrows: activeTrainer?.length > 2.5,
        },
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
          swipe: true,
          swipeToSlide: true,
          touchMove: true,
          draggable: true,
          arrows: activeTrainer?.length > 2,
        },
      },
    ],
  };
   

  // Mark that we've completed at least one load of scheduled meetings (so we hide active-session skeleton when there are none)
  useEffect(() => {
    if (!isMeetingLoading) {
      hasScheduledMeetingsLoadedOnceRef.current = true;
    }
  }, [isMeetingLoading]);

  // Filter sessions that are confirmed and within the current time range (active sessions)
  // Matches behavior at ffb2ea8 – sessions where current time is within start–end and not yet rated
  useEffect(() => {
    if (!scheduledMeetingDetails?.length) {
      setFilteredSessions([]);
      return;
    }
    const filtered = scheduledMeetingDetails.filter((session) => {
      const { start_time, end_time, ratings } = session;
      if (!start_time || !end_time) return false;
      const startTimeUpdated = CovertTimeAccordingToTimeZone(start_time, session.time_zone);
      const endTimeUpdated = CovertTimeAccordingToTimeZone(end_time, session.time_zone);
      const currentTime = DateTime.utc();
      const startTime = DateTime.fromISO(startTimeUpdated, { zone: "utc" });
      const endTime = DateTime.fromISO(endTimeUpdated, { zone: "utc" });
      const currentDate = currentTime.toFormat("yyyy-MM-dd");
      const currentTimeOnly = currentTime.toFormat("HH:mm");
      const startDate = startTime.toFormat("yyyy-MM-dd");
      const startTimeOnly = startTime.toFormat("HH:mm");
      const endDate = endTime.toFormat("yyyy-MM-dd");
      const endTimeOnly = endTime.toFormat("HH:mm");
      const isDateSame = currentDate === startDate && currentDate === endDate;
      const isWithinTimeFrame =
        isDateSame &&
        currentTimeOnly >= startTimeOnly &&
        currentTimeOnly <= endTimeOnly;
      return isWithinTimeFrame && !ratings;
    });
    setFilteredSessions(filtered);
  }, [scheduledMeetingDetails]);

  const addTraineeClipInBookedSession = async (selectedClips) => {
    const payload = {
      id: isOpenID,
      trainee_clip: selectedClips?.map((val) => val?._id),
    };
    dispatch(addTraineeClipInBookedSessionAsync(payload));
    dispatch(removeNewBookingData());
    setIsOpen(false);
    // setIsModalOpen(false);
  };

  const MeetingSetter = (payload) => {
    dispatch(bookingsAction.setStartMeeting(payload));
  };

  const handleAddRatingModelState = (data) => {
    dispatch(addRating(data));
  };

  const showRatingLabel = (ratingInfo) => {
    // for trainee we're showing recommends
    return ratingInfo &&
      ratingInfo[accountType.toLowerCase()] &&
      (ratingInfo[accountType.toLowerCase()].sessionRating ||
        ratingInfo[accountType.toLowerCase()].sessionRating) ? (
      <div className="d-flex items-center">
        {" "}
        {/* You rated{" "} */}
        You rated this session{" "}
        <b className="pl-2">
          {ratingInfo[accountType.toLowerCase()].sessionRating ||
            ratingInfo[accountType.toLowerCase()].sessionRating}
        </b>
        <Star color="#FFC436" size={28} className="star-container star-svg" />{" "}
        stars
        {/* to this {accountType?.toLowerCase()}. */}
      </div>
    ) : null;
  };

  const renderBooking = (
    bookingInfo,
    status,
    booking_index,
    booked_date,
    session_start_time,
    session_end_time,
    _id,
    trainee_info,
    trainer_info,
    ratings,
    trainee_clips,
    report,
    start_time,
    end_time
  ) => {
    const availabilityInfo = Utils.meetingAvailability(
      booked_date,
      session_start_time,
      session_end_time,
      userTimeZone,
      start_time,
      end_time
    );
    const {
      isStartButtonEnabled,
      has24HoursPassedSinceBooking,
      isCurrentDateBefore,
      isUpcomingSession,
    } = availabilityInfo;

    switch (accountType) {
      case AccountType.TRAINER:
        return (
          <TrainerRenderBooking
            _id={_id}
            status={status}
            trainee_info={trainee_info}
            trainer_info={trainer_info}
            isCurrentDateBefore={isCurrentDateBefore}
            isStartButtonEnabled={isStartButtonEnabled}
            isMeetingDone={false}
            isUpcomingSession={isUpcomingSession}
            ratings={ratings}
            booking_index={booking_index}
            has24HoursPassedSinceBooking={has24HoursPassedSinceBooking}
            isOpen={isOpen}
            setIsOpen={setIsOpen}
            selectedClips={selectedClips}
            setSelectedClips={setSelectedClips}
            setIsOpenID={setIsOpenID}
            addTraineeClipInBookedSession={addTraineeClipInBookedSession}
            trainee_clips={trainee_clips}
            report={report}
            bookedSession={bookedSession}
            setBookedSession={setBookedSession}
            tabBook={tabBook}
            setStartMeeting={MeetingSetter}
            startMeeting={startMeeting}
            handleAddRatingModelState={handleAddRatingModelState}
            updateParentState={(value) => {
              setBIndex(value);
            }}
            activeTabs={bookingButton[0]}
            start_time={start_time}
            bookingInfo={bookingInfo}
          />
        );
      case AccountType.TRAINEE:
        return (
          <TraineeRenderBooking
            _id={_id}
            status={status}
            trainee_info={trainee_info}
            trainer_info={trainer_info}
            isCurrentDateBefore={isCurrentDateBefore}
            isStartButtonEnabled={isStartButtonEnabled}
            isMeetingDone={false}
            isUpcomingSession={isUpcomingSession}
            ratings={ratings}
            booking_index={booking_index}
            has24HoursPassedSinceBooking={has24HoursPassedSinceBooking}
            isOpen={isOpen}
            setIsOpen={setIsOpen}
            selectedClips={selectedClips}
            setSelectedClips={setSelectedClips}
            setIsOpenID={setIsOpenID}
            isOpenID={isOpenID}
            addTraineeClipInBookedSession={addTraineeClipInBookedSession}
            trainee_clips={trainee_clips}
            report={report}
            bookedSession={bookedSession}
            setBookedSession={setBookedSession}
            tabBook={tabBook}
            setStartMeeting={MeetingSetter}
            startMeeting={startMeeting}
            handleAddRatingModelState={handleAddRatingModelState}
            updateParentState={(value) => {
              setBIndex(value);
            }}
            accountType={AccountType.TRAINEE}
            activeTabs={bookingButton[0]}
            start_time={start_time}
            bookingInfo={bookingInfo}
          />
        );
      default:
        break;
    }
  };
  return (
    <div className="container-fluid">
      {/* Coaches Online Now - only show for trainees and when data is loading or available */}
      {shouldShowCoachesSection && (
        <div
          className="upcoming_session"
          style={{
            marginTop: width600 ? "15px" : "20px",
            marginBottom: width600 ? "15px" : "20px",
          }}
          >
          <h2
            className="text-center"
            style={{ 
              marginBottom: width600 ? "15px" : "20px",
              fontSize: width600 ? "24px" : "28px",
              fontWeight: 600,
              color: "#000080",
              letterSpacing: "0.5px",
            }}
          >
            Coaches Online Now
          </h2>
          <div
            className="card trainer-bookings-card"
            style={{
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              border: "none",
              padding: width600 ? "10px 6px" : "12px 16px 8px 16px",
              width: "100%",
              maxWidth: "100%",
              margin: "0",
              minHeight: width600 ? "280px" : "300px",
              height: "auto",
              maxHeight: width600 ? "320px" : "340px",
              boxSizing: "border-box",
              overflow: "visible",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div className="banner_Slider" style={{
              width: "100%",
              maxWidth: "100%",
              boxSizing: "border-box",
              position: "relative",
              flex: "1"
            }}>
          <style>{`
                .banner_Slider {
                  position: relative;
                  -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
                }
                .banner_Slider .slick-list {
                  margin: 0 -10px;
                  touch-action: pan-y pinch-zoom; /* Enable touch gestures */
                  overflow: visible; /* Allow full card (image + text + button) to be visible */
                }
                .banner_Slider .slick-slide {
                  height: auto;
                  min-height: 0;
                }
                .banner_Slider .slick-slide > div {
                  height: 100%;
                  display: flex;
                  min-height: 0;
                }
                .banner_Slider .slick-track {
                  touch-action: pan-y pinch-zoom;
                  display: flex;
                  align-items: stretch;
                }
                .banner_Slider .slick-slide {
                  padding: 0 10px;
                  touch-action: pan-y pinch-zoom;
                  display: flex;
                }
                .banner_Slider .slick-slide[aria-hidden="true"] {
                  opacity: 0.5;
                }
                .banner_Slider .slick-slide[aria-hidden="false"] {
                  opacity: 1;
                  transition: opacity 0.3s ease;
                }
                .banner_Slider .slick-prev,
                .banner_Slider .slick-next {
                  z-index: 10;
                  width: 35px;
                  height: 35px;
                  background: #fff !important;
                  border-radius: 50%;
                  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
                  transition: all 0.3s ease;
                  display: flex !important;
                  align-items: center;
                  justify-content: center;
                }
                .banner_Slider .slick-prev:hover,
                .banner_Slider .slick-next:hover {
                  background: #000080 !important;
                  box-shadow: 0 4px 12px rgba(0, 0, 128, 0.3);
                }
                .banner_Slider .slick-prev:before,
                .banner_Slider .slick-next:before {
                  color: #000080;
                  font-size: 20px;
                  opacity: 1;
                }
                .banner_Slider .slick-prev:hover:before,
                .banner_Slider .slick-next:hover:before {
                  color: #fff;
                }
                .banner_Slider .slick-prev {
                  left: -10px;
                }
                .banner_Slider .slick-next {
                  right: -10px;
                }
                .banner_Slider .slick-prev.slick-disabled,
                .banner_Slider .slick-next.slick-disabled {
                  opacity: 0.3;
                  cursor: not-allowed;
                }
                @media (max-width: 600px) {
                  .banner_Slider .slick-list {
                    margin: 0 -5px;
                  }
                  .banner_Slider .slick-slide {
                    padding: 0 5px;
                  }
                  .banner_Slider .slick-prev {
                    left: -5px;
                  }
                  .banner_Slider .slick-next {
                    right: -5px;
                  }
                  .banner_Slider .slick-prev,
                  .banner_Slider .slick-next {
                    width: 32px;
                    height: 32px;
                    background: rgba(255, 255, 255, 0.95) !important;
                    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
                  }
                  .banner_Slider .slick-prev:before,
                  .banner_Slider .slick-next:before {
                    font-size: 18px;
                    color: #000080;
                  }
                  .banner_Slider .slick-prev:active,
                  .banner_Slider .slick-next:active {
                    transform: scale(0.95);
                    background: #000080 !important;
                  }
                  .banner_Slider .slick-prev:active:before,
                  .banner_Slider .slick-next:active:before {
                    color: #fff;
                  }
                }
                @media (max-width: 480px) {
                  .banner_Slider .slick-prev {
                    left: -3px;
                  }
                  .banner_Slider .slick-next {
                    right: -3px;
                  }
                  .banner_Slider .slick-prev,
                  .banner_Slider .slick-next {
                    width: 28px;
                    height: 28px;
                  }
                  .banner_Slider .slick-prev:before,
                  .banner_Slider .slick-next:before {
                    font-size: 16px;
                  }
                }
              `}              </style>
              {isLoadingTrainers ? (
                <Slider {...settings}>
                  {Array(4).fill(0).map((_, index) => (
                    <div 
                      key={`skeleton-${index}`}
                      style={{
                        padding: width600 ? "0 4px" : "0 10px",
                        boxSizing: "border-box",
                        height: "auto",
                        minHeight: "0",
                        display: "flex",
                        alignItems: "stretch"
                      }}
                    >
                      <div style={{
                        width: "100%",
                        height: "auto",
                        display: "flex",
                        alignItems: "stretch",
                        minHeight: "0"
                      }}>
                        <TrainerCardSkeleton width600={width600} />
                      </div>
                    </div>
                  ))}
                </Slider>
              ) : activeTrainer && activeTrainer?.length > 0 ? (
                <Slider {...settings}>
                  {activeTrainer.map((info, index) => {
                    return (
                      <div 
                        key={`slider-${info.trainer_info?._id}-${index}`}
                        style={{
                          padding: width600 ? "0 4px" : "0 10px",
                          boxSizing: "border-box",
                          height: "auto",
                          minHeight: "0",
                          display: "flex",
                          alignItems: "stretch"
                        }}
                      >
                        <div style={{
                          width: "100%",
                          height: "auto",
                          display: "flex",
                          alignItems: "stretch",
                          minHeight: "0"
                        }}>
                          <OnlineUserCard trainer={info.trainer_info} />
                        </div>
                      </div>
                    );
                  })}
                </Slider>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {filteredSessions && filteredSessions?.length > 0 ? (
        <div className="upcoming_session">
          <h2 className="text-center">Active Sessions</h2>
          {filteredSessions.map((session, booking_index) => (
            <div
              className="card mt-2 trainer-bookings-card upcoming_session_content"
              key={`booking-schedule-training`}
            >
              <div className="card-body" style={{ padding: "5px" }}>
                <div className="d-flex justify-content-center " style={{ gap: width600 ? "10px" : "30px" }}>
                  <div className="">
                    <div className="">
                      <div className="">
                        <div className="">
                          <div
                            style={{
                              width: "80px",
                              height: "80px",
                              border: "2px solid rgb(0, 0, 128)",
                              borderRadius: "5px",
                              padding: "5px",
                            }}
                          >
                            <ImageSkeleton
                              src={
                                session.trainer_info.profile_picture ||
                                  session.trainee_info.profile_picture
                                  ? Utils.getImageUrlOfS3(
                                    accountType === AccountType.TRAINER
                                      ? session.trainee_info.profile_picture
                                      : session.trainer_info.profile_picture
                                  )
                                  : "/assets/images/demoUser.png"
                              }
                              alt="trainer_image"
                              fallbackSrc="/assets/images/demoUser.png"
                              lazy={true}
                              skeletonType="circular"
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "contain",
                                borderRadius: "50%",
                                transition: "all 0.6s linear",
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="">
                      <div className="d-flex">

                        <dt className="ml-1">
                          {accountType === AccountType.TRAINER
                            ? session.trainee_info.fullname
                            : session.trainer_info.fullname}
                        </dt>
                      </div>
                    </div>
                  </div>

                  <div className="d-flex flex-column justify-content-center">
                    <div className="">
                      <div
                        className={`d-flex ${width600 ? "flex-column" : "flex-row"
                          }`}
                      >
                        <div>Date :</div>
                        <dt className="ml-1">
                          {Utils.getDateInFormat(session.booked_date)}
                        </dt>
                      </div>
                    </div>

                    <div className="">
                      <div
                        className={`d-flex ${width600 ? "flex-column" : "flex-row"
                          }`}
                      >
                        <div className="">Session Requested Time :</div>
                        <dt className="ml-1">{`${formatTimeInLocalZone(
                          session.start_time
                        )} - ${formatTimeInLocalZone(session.end_time)}`}</dt>
                      </div>
                    </div>

                    {session.createdAt && (
                      <div className="" style={{ marginTop: width600 ? "8px" : "0" }}>
                        <div
                          className={`d-flex ${width600 ? "flex-column" : "flex-row"
                            }`}
                        >
                          <div className="">Booked At :</div>
                          <dt className="ml-1">
                            {Utils.getDateInFormat(session.createdAt)} {formatTimeInLocalZone(session.createdAt)}
                          </dt>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div
                className="card-footer"
                style={{ padding: width600 ? "5px" : "5px", display: 'flex', justifyContent: "center" }}
              >
                <div className="">
                  <div className="">
                    <div className="">{showRatingLabel(session.ratings)}</div>
                    <div className="">
                      {renderBooking(
                        session,
                        session.status,
                        booking_index,
                        session.booked_date,
                        session.session_start_time,
                        session.session_end_time,
                        session._id,
                        session.trainee_info,
                        session.trainer_info,
                        session.ratings,
                        session.trainee_clips,
                        session.report,
                        session.start_time,
                        session.end_time
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : isMeetingLoading && !hasScheduledMeetingsLoadedOnceRef.current ? (
        <div className="upcoming_session">
          <h2 className="text-center">Active Sessions</h2>
          {Array(2).fill(0).map((_, index) => (
            <ActiveSessionSkeleton key={`active-session-skeleton-${index}`} width600={width600} />
          ))}
        </div>
      ) : null}

      <div
        className="row"
        style={{
          marginLeft: "0px",
          marginRight: "0px",
        }}
      >
        {/* Right side */}
        <div
          className={`${width600
            ? "row"
            : width1200
              ? "col-sm-12"
              : width2000
                ? "col-sm-3"
                : ""
            } my-3`}
          style={{
            width: "auto !important",
            padding: "0px",
            height: "100%",
            display: width1200 || width600 ? "flex" : "block",
            gap: width600 ? "20px" : width1200 ? "15px" : "0px",
          }}
        >

          {(width1000 && friendRequests && friendRequests.length > 0) ? (
            <div
              className={`${width600
                ? "col-sm-12"
                : width1200
                  ? "col-sm-6"
                : width2000
                  ? "col-sm-12"
                  : ""
                }  ${!width1200 ? "my-3" : ""}`}
              style={{
                height: width1200 ? "100%" : "calc(100% - 400px)",
              }}
            >
            <div
              className={`card trainer-profile-card Home-main-Cont`}
              style={{ 
                width: "100%", 
                color: "black", 
                height: "100%",
                borderRadius: "8px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                border: "none"
              }}
            >
              <div
                className="card-body"
                style={{
                  height: "100%",
                  padding: "15px"
                }}
              >
                <h3 style={{
                  textAlign: "center",
                  marginBottom: "20px",
                  fontSize: width600 ? "18px" : "20px",
                  fontWeight: "600",
                  color: "#333"
                }}>Recent Friend Requests</h3>
                  <div style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "10px",
                    justifyContent: "center",
                    alignItems: 'center',
                  }}>
                    {
                      friendRequests?.map((request, index) => (
                        <div
                          style={{
                            cursor: "pointer",
                            border: "2px solid rgb(0, 0, 128)",
                            borderRadius: "5px",
                            display: "flex",
                            gap: "5px",
                            // maxWidth: 300,
                            flexDirection: "column",
                            justifyContent: "center",
                            alignItems: 'center',
                            // width:  "100%" ,
                            padding: 5,

                            width: "fit-content",
                          }}
                          key={index}
                        >
                          <div style={{ width: '100px', height: '100px', borderRadius: '8px', overflow: 'hidden' }}>
                            <ImageSkeleton
                              src={
                                Utils?.getImageUrlOfS3(
                                  request.senderId?.profile_picture
                                ) || "/assets/images/userdemo.png"
                              }
                              alt={request.senderId?.fullname || "User"}
                              fallbackSrc="/assets/images/demoUser.png"
                              lazy={true}
                              skeletonType="rounded"
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover"
                              }}
                            />
                          </div>

                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 5,
                              marginTop: 10,
                              justifyContent: "center",
                              alignItems: 'center',
                            }}
                          >
                            <h5 >
                              <b>{request.senderId?.fullname}</b>
                            </h5>


                            <div className="d-flex" style={{ gap: 5 }}>
                              <button
                                style={{
                                  padding: 5,

                                  marginTop: 5,
                                  fontSize: "revert-layer",
                                }}
                                className="btn btn-success btn-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAcceptFriendRequest(request?._id);
                                }}
                              >
                                Accept
                              </button>
                              <button
                                style={{
                                  padding: 5,

                                  marginTop: 5,
                                  fontSize: "revert-layer",
                                }}
                                className="btn btn-danger btn-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRejectFriendRequest(request?._id);
                                }}
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          <div
            className={`${width600
              ? "col-sm-12"
              : width1200
                ? "col-sm-6"
                : width2000
                  ? "col-sm-12"
                  : ""
              }  ${!width1200 ? "my-3" : ""}`}
            style={{
              height: width1200 ? "100%" : "calc(100% - 400px)",
            }}
          >
            {/* Trainer Profile Card - Above Recent Students */}
            {accountType === AccountType?.TRAINER && (
              <div
                className="card trainer-profile-card Home-main-Cont"
                style={{
                  width: "100%",
                  marginBottom: "20px",
                  borderRadius: "8px",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  border: "none"
                }}
              >
                <div
                  className="card-body"
                  style={{
                    padding: 0,
                    margin: 0
                  }}
                >
                  <UserInfoCard />
                </div>
              </div>
            )}
            
            {/* Recent Students Card */}
            <div
              className={`card trainer-profile-card Home-main-Cont`}
              style={{ 
                width: "100%", 
                color: "black", 
                height: accountType === AccountType?.TRAINER ? "calc(100% - 200px)" : "100%",
                borderRadius: "8px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                border: "none"
              }}
            >
              <div
                className="card-body"
                style={{
                  height: "100%",
                  padding: "10px"
                }}
              >
                <RecentUsers 
                  onTraineeSelect={(traineeId) => {
                    setSelectedTraineeId(traineeId);
                    setActiveCenterTab("myClips");
                  }}
                />
              </div>
            </div>
          </div>
        </div>
        {/* Middle */}
        <div
          className={`${width600
            ? "col-sm-12"
            : width1200
              ? "col-sm-12"
              : width2000
                ? "col-sm-6"
                : ""
            } my-3`}
          style={{ width: "auto !important", padding: "0px" }}
        >
          <div
            className="card trainer-profile-card Home-main-Cont"
            style={{
              height: "100%",
              width: "100%",
              overflow: "auto",
              minWidth: "97%",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              border: "none"
            }}
          >
            <div
              className="card-body"
              style={{ padding: width600 ? "10px" : "15px" }}
            >
              <NavHomePageCenterContainer 
                onTabChange={setActiveCenterTab} 
                selectedTraineeId={selectedTraineeId}
                onClearTrainee={() => setSelectedTraineeId(null)}
              />
            </div>
          </div>
        </div>

        {/* Left side */}
        <div
          className={`${width600
            ? "col-sm-12"
            : width1200
              ? "row"
              : width2000
                ? "col-sm-3"
                : ""
            }`}
          style={{ width: "auto !important", padding: "0px", marginTop: "5px" }}
        >
          <div
            className={`${width600
              ? "col-sm-12"
              : width1200
                ? "col-sm-6"
                : width2000
                  ? "col-sm-12"
                  : ""
              } my-3`}
            style={{
              padding: width600 ? "0px" : "0px 15px",
            }}
          >
            <div
              className="card trainer-profile-card Home-main-Cont"
              style={{ 
                height: "100%", 
                width: "100%",
                borderRadius: "8px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                border: "none"
              }}
            >
              <div className="card-body" style={{ padding: "15px" }}>
                <UploadClipCard progress={progress} setProgress={setProgress} />
              </div>
            </div>
          </div>

          <div
            className={`${width600
              ? "col-sm-12"
              : width1200
                ? "col-sm-6"
                : width2000
                  ? "col-sm-12"
                  : ""
              } my-3`}
            style={{
              padding: width600 ? "0px" : "0px 15px",
            }}
          >
            <div
              className="card trainer-profile-card Home-main-Cont"
              style={{
                height: "auto",
                minWidth: "200px",
                width: "100%",
                minHeight: "10rem",
                borderRadius: "8px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                border: "none",
                overflow: "hidden"
              }}
            >
              <div className="card-body" style={{ padding: "0px" }}>
                <div>
                  {/* <ShareClipsCard /> */}
                  <img
                    src={"/assets/images/dashboard-card.webp"}
                    alt="dashboard card"
                    className="rounded"
                    style={{
                      height: "150px",
                      width: "100%",
                      marginInline: "auto",
                      display: "block",
                      objectFit: "cover"
                    }}
                    onError={(e) => {
                      e.target.src = "/assets/images/dashboard-card.webp";
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
          <div
            className={`${width600
              ? "col-sm-12"
              : width1200
                ? "col-sm-6"
                : width2000
                  ? "col-sm-12"
                  : ""
              } my-3`}
            style={{
              padding: width600 ? "0px" : "0px 15px",
            }}
          >
            <div
              className="card trainer-profile-card Home-main-Cont"
              style={{ 
                height: "100%", 
                width: "100%",
                borderRadius: "8px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                border: "none"
              }}
            >
              <div className="card-body" style={{ padding: "15px" }}>
                <InviteFriendsCard />
              </div>
            </div>
          </div>

          <div
            className={`${width600
              ? "col-sm-12"
              : width1200
                ? "col-sm-6"
                : width2000
                  ? "col-sm-12"
                  : ""
              } my-3`}
            style={{
              padding: width600 ? "0px" : "0px 15px",
            }}
          >
            <div
              className="card trainer-profile-card Home-main-Cont"
              style={{ 
                height: "auto", 
                width: "100%", 
                minHeight: "10rem",
                borderRadius: "8px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                border: "none",
                overflow: "hidden"
              }}
            >
              <div className="card-body" style={{ padding: "0px" }}>
                <div>
                  {/* <ShareClipsCard /> */}
                  <img
                    src={"/assets/images/callaway.jpg"}
                    alt="callaway card"
                    className="rounded"
                    style={{
                      height: "150px",
                      marginInline: "auto",
                      display: "block",
                      width: "100%",
                      objectFit: "cover"
                    }}
                    onError={(e) => {
                      e.target.src = "/assets/images/callaway.jpg";
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NavHomePage;
