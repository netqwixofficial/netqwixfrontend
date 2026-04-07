import React, { useEffect, useState, useLayoutEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../../store";
import {
  addTraineeClipInBookedSessionAsync,
  bookingsAction,
  bookingsState,
  getScheduledMeetingDetailsAsync,
} from "../common/common.slice";
import {
  formatTimeInLocalZone,
  formatToAMPM,
  Utils,
} from "../../../utils/utils";
import {
  AccountType,
  BookedSession,
  bookingButton,
  not_data_for_booking,
  topNavbarOptions,
} from "../../common/constants";
import { authAction, authState } from "../auth/auth.slice";
import TraineeRenderBooking from "./TraineeRenderBooking";
import TrainerRenderBooking from "./TrainerRenderBooking";
import StartMeeting from "./start";
import Modal from "../../common/modal";
import { Star, X } from "react-feather";
import { myClips } from "../../../containers/rightSidebar/fileSection.api";
import moment from "moment-timezone";
import axios from "axios";
import Ratings from "./ratings";
import ReactStrapModal from "../../common/modal";
import { commonState } from "../../common/common.slice";
import { traineeAction, traineeState } from "../trainee/trainee.slice";
import OrientationModal from "../modalComponent/OrientationModal";
import { useMediaQuery } from "usehooks-ts";
import TraineeRatings from "./ratings/trainee";
import { DateTime } from "luxon";
import { Spinner } from "reactstrap";
import BookingCardSkeleton from "../common/BookingCardSkeleton";

export var meetingRoom = () => <></>;

const BookingList = ({ activeCenterContainerTab, activeTabs, bookings: bookingsProp }) => {
  const [selectedClips, setSelectedClips] = useState([]);
  const [isOpenID, setIsOpenID] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const dispatch = useAppDispatch();
  const { newBookingData } = useAppSelector(traineeState);
  const { scheduledMeetingDetails, addRatingModel } =
    useAppSelector(bookingsState);
  const { removeNewBookingData } = traineeAction;
  const { accountType } = useAppSelector(authState);
  const [bookedSession, setBookedSession] = useState({
    id: "",
    booked_status: "",
  });
  const { isLoading, configs, startMeeting, isMeetingLoading } =
    useAppSelector(bookingsState);
  const { userInfo } = useAppSelector(authState);
  const mediaQuery = window.matchMedia("(min-width: 992px)");
  const [userTimeZone, setUserTimeZone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const { addRating } = bookingsAction;
  const [bIndex, setBIndex] = useState(0);
  const MeetingSetter = (payload) => {
    dispatch(bookingsAction.setStartMeeting(payload));
  };

  useEffect(() => {
    if (userInfo?.extraInfo?.working_hours?.time_zone) {
      getIANATimeZone(userInfo?.extraInfo?.working_hours?.time_zone);
    }
  }, [userInfo?.extraInfo?.working_hours?.time_zone]);

  const getIANATimeZone = async (timezoneString) => {
    const matches = timezoneString.match(/\(UTC ([\+\-]\d+:\d+)\)/);
    const utcOffset = matches ? matches[1] : null;

    if (utcOffset === "-5:00") {
      return setUserTimeZone("America/New_York");
    }
    if (utcOffset === "-6:00") {
      return setUserTimeZone("America/Chicago");
    }
    if (utcOffset === "-7:00") {
      return setUserTimeZone("America/Denver");
    }
    if (utcOffset === "-8:00") {
      return setUserTimeZone("America/Los_Angeles");
    }
    if (utcOffset === "+5:30") {
      return setUserTimeZone("Asia/Calcutta");
    }
    const response = await axios.get(
      "https://fullcalendar.io/api/demo-feeds/timezones.json"
    );
    var timeZones = response.data;
    const ianaTimeZone = utcOffset
      ? timeZones.find(
          (tz) =>
            moment.tz(tz).utcOffset() === moment.duration(utcOffset).asMinutes()
        )
      : "";
    //
    setUserTimeZone(
      ianaTimeZone
        ? ianaTimeZone
        : Intl.DateTimeFormat().resolvedOptions().timeZone
    );
  };
  // const [startMeeting, setStartMeeting] = useState({
  //   trainerInfo: null,
  //   traineeInfo: null,
  //   id: null,
  //   isOpenModal: false,
  // });

  // Track if we've fetched for this tab to prevent duplicate calls
  const lastFetchedTabRef = useRef(null);

  useEffect(() => {
    if (activeCenterContainerTab === "upcomingLesson" && activeTabs) {
      // Only fetch if tab changed or first time
      if (lastFetchedTabRef.current !== activeTabs) {
        lastFetchedTabRef.current = activeTabs;
        const payload = {
          status: activeTabs,
          forceRefresh: true, // Force refresh to ensure fresh data
        };
        dispatch(getScheduledMeetingDetailsAsync(payload));
      }
    }
  }, [activeTabs, activeCenterContainerTab, dispatch]);

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

  const isMeetingCompleted = (detail) => {
    return (
      detail.status === BookedSession.completed ||
      (detail &&
        detail.ratings &&
        detail.ratings[accountType.toLowerCase()] &&
        detail.ratings[accountType.toLowerCase()].sessionRating)
    );
  };

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
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const handleAddRatingModelState = (data, trainer_info) => {
    dispatch(addRating(data));
    if (trainer_info) {
      setSelectedTrainer(trainer_info);
    }
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

    const isMeetingDone =
      isMeetingCompleted(bookingInfo) ||
      has24HoursPassedSinceBooking;

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
            isMeetingDone={isMeetingDone}
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
            tabBook={activeTabs}
            setStartMeeting={MeetingSetter}
            startMeeting={startMeeting}
            handleAddRatingModelState={handleAddRatingModelState}
            updateParentState={(value) => {
              setBIndex(value);
            }}
            activeTabs={activeTabs}
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
            isMeetingDone={isMeetingDone}
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
            tabBook={activeTabs}
            setStartMeeting={MeetingSetter}
            startMeeting={startMeeting}
            handleAddRatingModelState={handleAddRatingModelState}
            updateParentState={(value) => {
              setBIndex(value);
            }}
            accountType={AccountType.TRAINEE}
            activeTabs={activeTabs}
            start_time={start_time}
            bookingInfo={bookingInfo}
          />
        );
      default:
        break;
    }
  };

  const BookingCard = ({ bookingInfo, booking_index }) => {
    const {
      _id,
      trainee_info,
      trainer_info,
      booked_date,
      session_start_time,
      session_end_time,
      status,
      ratings,
      trainee_clips,
      report,
      start_time,
      end_time,
      time_zone, // Assuming 'time_zone' is coming from API
    } = bookingInfo;

    // Show times in viewer's timezone so trainer and trainee each see times in their own zone.
    // For older records without start_time/end_time Date objects, fall back to constructing
    // a proper DateTime from booked_date + session_start/end_time in the session's time_zone.
    const computeFallbackTime = (hhmm) => {
      if (!hhmm || !booked_date) return Utils.formatTime(hhmm || "");
      try {
        const dateStr = typeof booked_date === "string"
          ? booked_date.split("T")[0]
          : new Date(booked_date).toISOString().split("T")[0];
        const isoStr = `${dateStr}T${hhmm}:00`;
        const dt = DateTime.fromISO(isoStr, { zone: time_zone || "UTC" });
        return dt.setZone(userTimeZone).toFormat("h:mm a").toUpperCase();
      } catch {
        return Utils.formatTime(hhmm);
      }
    };
    const localStartTime = start_time
      ? formatTimeInLocalZone(start_time, userTimeZone)
      : computeFallbackTime(session_start_time);
    const localEndTime = end_time
      ? formatTimeInLocalZone(end_time, userTimeZone)
      : computeFallbackTime(session_end_time);

    const isMobileScreen = useMediaQuery("(max-width:600px)");
    return (
      <div
        className="card mt-2 trainer-bookings-card upcoming_session_content"
        key={`booking-schedule-training`}
      >
        <div className="card-body" style={{ padding: "5px" }}>
          <div
            className="d-flex justify-content-center "
            style={{ gap: isMobileScreen ? "5px" : "30px" }}
          >
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
                      <img
                        src={
                          trainer_info.profile_picture ||
                          trainee_info.profile_picture
                            ? Utils.getImageUrlOfS3(
                                accountType === AccountType.TRAINER
                                  ? trainee_info.profile_picture
                                  : trainer_info.profile_picture
                              )
                            : "/assets/images/demoUser.png"
                        }
                        alt="trainer_image"
                        loading="eager"
                        decoding="async"
                        className="rounded"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                          borderRadius: "50%",
                          transition: "all 0.6s linear",
                        }}
                        onError={(e) => {
                          e.target.src = "/assets/images/demoUser.png";
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
                      ? trainee_info.fullname
                      : trainer_info.fullname}
                  </dt>
                </div>
              </div>
            </div>

            <div className="d-flex flex-column justify-content-center">
              <div className="">
                <div
                  className={`d-flex ${
                    isMobileScreen ? "flex-column" : "flex-row"
                  }`}
                >
                  <div>Date :</div>
                  <dt className="ml-1">{Utils.getDateInFormat(booked_date)}</dt>
                </div>
              </div>

              <div className="">
                <div
                  className={`d-flex ${
                    isMobileScreen ? "flex-column" : "flex-row"
                  }`}
                >
                  <div className="">Time :</div>
                  <dt className="ml-1">
                    {(start_time || session_start_time) && (end_time || session_end_time)
                      ? `${localStartTime} - ${localEndTime}`
                      : "Instant"}
                  </dt>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div
          className="card-footer"
          style={{
            padding: isMobileScreen ? "5px" : "5px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div className="">
            <div className="">
              <div className="">{showRatingLabel(ratings)}</div>
              <div className="">
                {renderBooking(
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
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderVideoCall = (height, width, isRotatedInitally) => (
    <StartMeeting
      id={startMeeting.id}
      accountType={accountType}
      traineeInfo={startMeeting.traineeInfo}
      trainerInfo={startMeeting.trainerInfo}
      session_end_time={filteredMeetings[bIndex]?.session_end_time}
      isClose={() => {
        MeetingSetter({
          ...startMeeting,
          id: null,
          isOpenModal: false,
          traineeInfo: null,
          trainerInfo: null,
        });
        dispatch(authAction?.setTopNavbarActiveTab(topNavbarOptions?.HOME));
      }}
    />
  );

  meetingRoom = (height, width, isRotatedInitally) => {
    return (
      <div>
        {" "}
        <div
          id="bookings"
          className={
            mediaQuery.matches
              ? "video_call custom-scroll position-relative"
              : "custom-scroll scoll-content position-relative"
          }
          onScroll={() => {
            if (configs.sidebar.isMobileMode) {
              dispatch(isSidebarToggleEnabled(true));
            }
            return;
          }}
        >
          {renderVideoCall(height, width, isRotatedInitally)}
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (startMeeting?.isOpenModal) {
      dispatch(
        authAction?.setTopNavbarActiveTab(topNavbarOptions?.MEETING_ROOM)
      );
    }
  }, [startMeeting?.isOpenModal]);

  const renderRating = () => {
    //
    return (
      <ReactStrapModal
        allowFullWidth={true}
        scrollableBody={true}
        element={
          accountType === AccountType.TRAINEE ? (
            <TraineeRatings
              accountType={accountType}
              booking_id={addRatingModel._id}
              key={addRatingModel._id}
              trainer={selectedTrainer}
              onClose={() => {
                const payload = {
                  _id: null,
                  isOpen: false,
                };
                handleAddRatingModelState(payload);
              }}
              tabBook={tabBook}
            />
          ) : (
            <Ratings
              accountType={accountType}
              booking_id={addRatingModel._id}
              key={addRatingModel._id}
              onClose={() => {
                const payload = {
                  _id: null,
                  isOpen: false,
                };
                handleAddRatingModelState(payload);
              }}
              tabBook={activeTabs}
            />
          )
        }
        isOpen={addRatingModel.isOpen}
        id={addRatingModel._id}
        // width={"50%"}
      />
    );
  };

  // When parent passes tab-specific bookings (e.g. scheduledMeetingDetailsByStatus[tab]), use them directly.
  // Otherwise filter from merged scheduledMeetingDetails (backward compatibility).
  const filteredMeetings = Array.isArray(bookingsProp)
      ? bookingsProp
      : (scheduledMeetingDetails?.filter((booking) => {
          const isCompleted = isMeetingCompleted(booking);
          const isCancelled = booking?.status === BookedSession.canceled;

          switch (activeTabs) {
            case "upcoming":
              return (
                booking?.status === BookedSession.confirmed ||
                booking?.status === BookedSession.booked
              );

            case "canceled":
              return isCancelled;

            case "completed":
              return isCompleted || booking?.status === BookedSession.completed;

            default:
              return (
                booking?.status === activeTabs &&
                booking?.status !== BookedSession.canceled
              );
          }
        }) || []);

  const emptyLabel =
    not_data_for_booking?.[activeTabs] || "No sessions found for this filter";

  return (
    <div>
      {isMeetingLoading ? (
        <>
          {Array(3).fill(0).map((_, index) => (
            <BookingCardSkeleton key={`booking-list-skeleton-${index}`} />
          ))}
        </>
      ) : !filteredMeetings.length ? (
        // Show a message when there are no sessions for current filter
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "40px",
          }}
        >
          <h5 className="block-title">{emptyLabel}</h5>
        </div>
      ) : (
        // Render filtered scheduled meetings
        filteredMeetings.map((bookingInfo, filteredIndex) => {
          const originalIndex =
            filteredMeetings?.findIndex(
              (booking) => booking?._id === bookingInfo?._id
            ) ?? -1;

          const bookingIndex =
            originalIndex !== -1 ? originalIndex : filteredIndex;

          return (
            <BookingCard
              bookingInfo={bookingInfo}
              key={bookingInfo?._id || bookingIndex}
              booking_index={bookingIndex}
            />
          );
        })
      )}
      {addRatingModel.isOpen ? renderRating(startMeeting.trainerInfo) : null}
    </div>
  );
};

export default BookingList;
