import React, { useContext, useLayoutEffect } from "react";
import { useState, useEffect } from "react";
import { Nav, NavItem, NavLink, TabContent, TabPane } from "reactstrap";
import { bookingButton, not_data_for_booking } from "../../common/constants";
import classnames from "classnames";
import { useAppSelector, useAppDispatch } from "../../store";
import {
  addTraineeClipInBookedSessionAsync,
  bookingsState,
  getScheduledMeetingDetailsAsync,
} from "../common/common.slice";
import { AccountType } from "../../common/constants";
import { traineeAction, traineeState } from "../trainee/trainee.slice";
import BookingList from "./BookingList";
import { useMediaQuery } from "../../hook/useMediaQuery";
import { myClips } from "../../../containers/rightSidebar/fileSection.api";
import AddClip from "./start/AddClip";
import { authState } from "../auth/auth.slice";
import { isMobile } from "react-device-detect";
import OrientationModal from "../modalComponent/OrientationModal";
import { notificiationTitles } from "../../../utils/constant";
import { EVENTS } from "../../../helpers/events";
import { SocketContext } from "../socket";
import { DateTime } from "luxon";

const UpcomingSession = ({ accountType = null }) => {
  const dispatch = useAppDispatch();
  const [activeTabs, setActiveTab] = useState(bookingButton[0]);
  const { scheduledMeetingDetails } = useAppSelector(bookingsState);
  const { userInfo } = useAppSelector(authState);
  const { newBookingData } = useAppSelector(traineeState);
  const { removeNewBookingData } = traineeAction;
  const [clips, setClips] = useState([]);
  const [selectedClips, setSelectedClips] = useState([]);
  const [isOpenID, setIsOpenID] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const socket = useContext(SocketContext);

  const width768 = useMediaQuery(768);

  useEffect(() => {
    if (userInfo?.account_type === AccountType.TRAINEE) {
      getMyClips();
    }
  }, []);

  const getMyClips = async () => {
    var res = await myClips({});
    setClips(res?.data);
  };

  useEffect(() => {
    if (newBookingData?._id) {
      setIsOpenID(newBookingData?._id);
      setIsOpen(true);
    }
  }, [newBookingData]);

  const handleChangeBookingTab = async (tab) => {
    if (activeTabs !== tab) {
      setActiveTab(tab);
      dispatch(getScheduledMeetingDetailsAsync({ status: tab }));
    }
  };

  useEffect(() => {
    dispatch(
      getScheduledMeetingDetailsAsync({
        status: "upcoming",
      })
    );
  }, [newBookingData]);

  /**
   * Keep upcoming sessions in sync in real-time.
   * Whenever a booking is created or its status is updated via socket events,
   * we silently refetch the scheduled meetings for the currently active tab.
   * This avoids the need for a manual page refresh while preserving existing behaviour.
   */
  useEffect(() => {
    if (!socket) return;

    const handleBookingUpdate = () => {
      // Refetch data for the currently selected tab (upcoming / completed / cancelled, etc.)
      dispatch(
        getScheduledMeetingDetailsAsync({
          status: activeTabs,
        })
      );
    };

    // Removed BOOKING_CREATED listener - reverted timezone changes
    // socket.on(EVENTS.BOOKING.CREATED, handleBookingUpdate);
    // socket.on(EVENTS.BOOKING.STATUS_UPDATED, handleBookingUpdate);

    return () => {
      // Cleanup removed
    };
  }, [socket, dispatch, activeTabs]);

  const trainer = scheduledMeetingDetails?.filter((booking) => {
    return (
      booking.trainer_info?._id === newBookingData?.trainer_id &&
      booking?._id === newBookingData?._id
    );
  });

  const addTraineeClipInBookedSession = async (selectedClips) => {
    const payload = {
      id: isOpenID,
      trainee_clip: selectedClips?.map((val) => val?._id),
    };
    dispatch(addTraineeClipInBookedSessionAsync(payload));
    dispatch(removeNewBookingData());
    setIsOpen(false);
  };

  const [modal, setModal] = useState(false);

  useLayoutEffect(() => {
    const updateOrientation = () => {
      let width = window.innerWidth;
      let height = window.innerHeight;
      if (width > height == false) {
        //  
        setModal(true)
      } else {
        //  
        setModal(false)
      }
    };

    const handleOrientationChange = () => {
      updateOrientation();
    };

    // Add event listener for orientation change
    window.addEventListener('resize', handleOrientationChange);

    // Call updateOrientation once initially
    updateOrientation();

    // Clean up the event listener when the component unmounts
    return () => {
      window.removeEventListener('resize', handleOrientationChange);
    };
  }, [isMobile]);

  
  if (userInfo?.status === "pending") {
    return <p style={{ textAlign: "center", color: "orange" }}>Please wait while the admin approves your request.</p>;
  }

  if (userInfo?.status === "rejected") {
    return <p style={{ textAlign: "center", color: "darkred" }}>Your account has been rejected by the admin. Please contact customer support.</p>;
  }

    return (
      <>
        <div>
          <h2 className="d-flex justify-content-center p-3">Sessions</h2>
          <div
            className="card rounded"
            style={{
              maxWidth: width768 ? "100%" : "50%",
              width: "auto",
              margin: "auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div className="card-body">
              <Nav tabs>
                {bookingButton.map((tabName, index) => (
                  <NavItem key={`bookings_tabs${index}`}>
                    <NavLink
                      className={`${classnames({
                        active: activeTabs === tabName,
                      })} ${
                        activeTabs === tabName ? "text-primary" : "text-dark"
                      } text-capitalize`}
                      onClick={() => handleChangeBookingTab(tabName)}
                      style={{ fontSize: "13px",padding:width768?"8px":"8px 16px" }}
                    >
                      {tabName}
                    </NavLink>
                  </NavItem>
                ))}
              </Nav>
              <TabContent activeTab={activeTabs}>
                {
                  Array(bookingButton.length).fill().map((_, index) => <TabPane key={`tab-pane-${bookingButton[index]}`} tabId={bookingButton[index]}>
                    <BookingList key={`${bookingButton[index]}`} activeCenterContainerTab="upcomingLesson" bookings={scheduledMeetingDetails} activeTabs={bookingButton[index]}/>
                  </TabPane>)
                }
              </TabContent>
            </div>
          </div>
        </div>
  
        <AddClip
          isOpen={isOpen}
          onClose={() => {
            setIsOpen(false);
            dispatch(removeNewBookingData());
          }}
          trainer={trainer[0]?.trainer_info?.fullname}
          selectedClips={selectedClips}
          setSelectedClips={setSelectedClips}
          clips={clips}
          shareFunc={addTraineeClipInBookedSession}
        />
      </>
    );
 
 
};
export default UpcomingSession;
