import { useRouter } from "next/router";
import { authAction, authState } from "../../app/components/auth/auth.slice";
import StartMeeting from "../../app/components/bookings/start";
import "../dashboard/index"
import {
  bookingsAction,
  bookingsState,
  getScheduledMeetingDetailsAsync,
} from "../../app/components/common/common.slice";
import { useAppDispatch, useAppSelector } from "../../app/store";
import { useEffect, useState } from "react";
import { SocketContext } from "../../app/components/socket";
import { LOCAL_STORAGE_KEYS, topNavbarOptions } from "../../app/common/constants";
import { useMediaQuery } from "usehooks-ts";
import { useWindowDimensions } from "../../app/hook/useWindowDimensions";
import OrientationModal from "../../app/components/modalComponent/OrientationModal";
import VideoCallUI from "../../app/components/portrait-calling";
const RenderVideoCall = ({height,width,isRotatedInitally}) => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const id = router?.query?.id;

  // Get the state slices
  const { scheduledMeetingDetails, loading ,startMeeting} = useAppSelector(bookingsState); // Assuming `loading` indicates the fetching state
  const { accountType } = useAppSelector(authState);

  // Find the meeting details using the id
  const meetingDetails = scheduledMeetingDetails?.find(
    (meeting) => meeting._id === id
  );

  // Define the MeetingSetter function
  const MeetingSetter = (payload) => {
    dispatch(bookingsAction.setStartMeeting(payload));
  };

  useEffect(()=>{
    if (meetingDetails && meetingDetails._id) {
      MeetingSetter({
        ...startMeeting,
        id: meetingDetails._id,
        isOpenModal: true,
        traineeInfo: meetingDetails.trainee_info,
        trainerInfo: meetingDetails.trainer_info,
        iceServers: meetingDetails.iceServers,
        // Handle both trainee_clip (singular) and trainee_clips (plural) from API
        trainee_clip: meetingDetails.trainee_clips || meetingDetails.trainee_clip || [],
      });
    }
  },[meetingDetails])

  // Show loading if meeting details not found yet
  if (!meetingDetails) {
    return <div>Loading meeting details...</div>;
  }

  return (
    // height > width && !isRotatedInitally ?
    <VideoCallUI
    id={meetingDetails._id}
      accountType={accountType}
      traineeInfo={meetingDetails.trainee_info}
      trainerInfo={meetingDetails.trainer_info}
      session_end_time={meetingDetails.session_end_time}
      session_start_time={meetingDetails.session_start_time}
      extended_session_end_time={meetingDetails.extended_session_end_time}
      time_zone={meetingDetails.time_zone}
      isClose={() => {
        MeetingSetter({
          id: null,
          isOpenModal: false,
          traineeInfo: null,
          trainerInfo: null,
        });
        dispatch(authAction?.setTopNavbarActiveTab(topNavbarOptions?.HOME));
        router.push("/dashboard")
      }}
      isLandscape={height < width}

    />
    // :
    // <StartMeeting
    //   id={meetingDetails._id}
    //   accountType={accountType}
    //   traineeInfo={meetingDetails.trainee_info}
    //   trainerInfo={meetingDetails.trainer_info}
    //   session_end_time={meetingDetails.session_end_time}
    //   isClose={() => {
    //     MeetingSetter({
    //       id: null,
    //       isOpenModal: false,
    //       traineeInfo: null,
    //       trainerInfo: null,
    //     });
    //     dispatch(authAction?.setTopNavbarActiveTab(topNavbarOptions?.HOME));
    //     router.push("/dashboard")
    //   }}
    // />
  );
};

const MeetingRoom = () => {

  const { height, width } = useWindowDimensions();
  const [isRotatedInitally, setIsRotatedInitally] = useState(false);
  useEffect(() => {
    if (height < width) setIsRotatedInitally(true)
  }, [height, width])

  const mediaQuery = useMediaQuery("(min-width: 992px)");
  const { isLoading, configs, startMeeting } = useAppSelector(bookingsState);

  const dispatch = useAppDispatch();
  const router = useRouter();
  const id = router?.query?.id;

  // Get the state slices
  const { scheduledMeetingDetails, loading } = useAppSelector(bookingsState); // Assuming `loading` indicates the fetching state
  const { accountType } = useAppSelector(authState);

  // Find the meeting details using the id
  const meetingDetails = scheduledMeetingDetails?.find(
    (meeting) => meeting._id === id
  );
  
  // Debug logging to help diagnose issues
  useEffect(() => {
    if (id && !meetingDetails && scheduledMeetingDetails?.length > 0 && !loading) {
      console.warn("[Meeting Page] Booking not found:", {
        bookingId: id,
        totalBookings: scheduledMeetingDetails.length,
        bookingIds: scheduledMeetingDetails.map(b => b._id),
        bookingStatuses: scheduledMeetingDetails.map(b => b.status)
      });
    }
  }, [id, meetingDetails, scheduledMeetingDetails, loading]);
  
  useEffect(() => {
    // Fetch meeting details when component mounts or when id changes
    // Fetch ALL bookings (no status filter) to ensure we find the booking regardless of status
    if (id) {
      // First fetch without status to get all bookings
      dispatch(getScheduledMeetingDetailsAsync());
      // Also fetch with "upcoming" status as backup
      dispatch(getScheduledMeetingDetailsAsync({ status: "upcoming" }));
      dispatch(authAction?.setAccountType(localStorage.getItem(LOCAL_STORAGE_KEYS?.ACC_TYPE)))
    }
  }, [dispatch, id]);
  
  // Refetch if meeting details not found but we have an id
  useEffect(() => {
    if (id && !meetingDetails && !loading) {
      // Meeting not found, try refetching without status filter first (gets all bookings)
      const timer = setTimeout(() => {
        dispatch(getScheduledMeetingDetailsAsync());
        // Also try with "upcoming" status as backup
        setTimeout(() => {
          dispatch(getScheduledMeetingDetailsAsync({ status: "upcoming" }));
        }, 200);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [id, meetingDetails, loading, dispatch]);

  useEffect(() => {
    if (meetingDetails && accountType) {
      // ... existing code ...
    }
  }, [meetingDetails, accountType]);

  return (
    <>
      {!accountType ? (
        <div>Loading...</div>
      ) : loading || (id && !meetingDetails && scheduledMeetingDetails?.length === 0) ? (
        <div>Loading meeting details...</div>
      ) : !meetingDetails && id && !loading && scheduledMeetingDetails?.length > 0 ? (
        <div className="booking-status-message">
          Meeting not found. Please check your bookings and try again.
        </div>
      ) : !meetingDetails ? (
        <div>Loading...</div>
      ) : (
        (() => {
            switch (meetingDetails.status) {
              case "confirmed":
                return (
                  <div id="get-navbar-tabs" className="get-navbar-tabs">
                    <div
                      id="bookings"
                      className={
                        mediaQuery.matches
                          ? "video_call custom-scroll position-relative"
                          : "custom-scroll scoll-content position-relative"
                      }
                      onScroll={() => {
                        if (configs.sidebar.isMobileMode) {
                          dispatch(bookingsAction.isSidebarToggleEnabled(true));
                        }
                      }}
                    >
                      <RenderVideoCall height={height} width={width} isRotatedInitally={isRotatedInitally}/>
                    </div>
                  </div>
                );
    
              case "cancelled":
                return (
                  <div className="booking-status-message">
                    This booking has been cancelled. You cannot access it now.
                  </div>
                );
    
              case "booked":
                return (
                  <div className="booking-status-message">
                    Please wait until the booking is confirmed.
                  </div>
                );
    
              case "completed":
                return (
                  <div className="booking-status-message">
                    This booking is already completed. You cannot access it now.
                  </div>
                );
    
              default:
                return (
                  <div className="booking-status-message">
                    Invalid booking status. Please check again.
                  </div>
                );
            }
          })()
      )}
    </>
  );
};

export default MeetingRoom;
