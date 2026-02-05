import React, { Fragment, useState, useEffect, useRef } from "react";

// Loading Skeleton Component for Book Expert
const BookExpertLoadingSkeleton = () => {
  return (
    <div style={{ width: "100%" }}>
      {/* Header Skeleton */}
      <div style={{ marginBottom: "20px" }}>
        <div
          style={{
            height: "32px",
            width: "200px",
            backgroundColor: "#e0e0e0",
            borderRadius: "4px",
            marginBottom: "10px",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
        <div
          style={{
            height: "20px",
            width: "300px",
            backgroundColor: "#e0e0e0",
            borderRadius: "4px",
            opacity: 0.7,
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
      </div>

      {/* Search/Filter Skeleton */}
      <div style={{ marginBottom: "30px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <div
          style={{
            height: "40px",
            width: "250px",
            backgroundColor: "#e0e0e0",
            borderRadius: "4px",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
        <div
          style={{
            height: "40px",
            width: "150px",
            backgroundColor: "#e0e0e0",
            borderRadius: "4px",
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        />
      </div>

      {/* Content Grid Skeleton */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "20px",
          marginBottom: "20px",
        }}
      >
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <div
            key={item}
            style={{
              height: "320px",
              backgroundColor: "#f5f5f5",
              borderRadius: "8px",
              padding: "15px",
              border: "1px solid #e0e0e0",
            }}
          >
            {/* Avatar Skeleton */}
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                backgroundColor: "#e0e0e0",
                margin: "0 auto 15px",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
            {/* Name Skeleton */}
            <div
              style={{
                height: "20px",
                width: "70%",
                backgroundColor: "#e0e0e0",
                borderRadius: "4px",
                margin: "0 auto 10px",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
            {/* Category Skeleton */}
            <div
              style={{
                height: "16px",
                width: "50%",
                backgroundColor: "#e0e0e0",
                borderRadius: "4px",
                margin: "0 auto 15px",
                opacity: 0.7,
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
            {/* Button Skeleton */}
            <div
              style={{
                height: "36px",
                width: "100%",
                backgroundColor: "#e0e0e0",
                borderRadius: "4px",
                marginTop: "15px",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
};
import LeftSide from "../../containers/leftSidebar";
import ChitChat from "../../containers/chatBoard";
import RightSide from "../../containers/rightSidebar";
import { useAppDispatch, useAppSelector } from "../../app/store";
import { authAction, authState } from "../../app/components/auth/auth.slice";
import {
  AccountType,
  LOCAL_STORAGE_KEYS,
  leftSideBarOptions,
  topNavbarOptions,
} from "../../app/common/constants";
import TraineeDashboardContainer from "../../app/components/trainee/dashboard";
import TrainerDashboardContainer from "../../app/components/trainer/dashboard";
import ScheduleInventory from "../../app/components/trainer/scheduleInventory";
import Bookings from "../../app/components/bookings";
// Socket is provided at app level via SocketProvider in _app.jsx
import {
  getMasterDataAsync,
  masterState,
} from "../../app/components/master/master.slice";
import Header from "../../app/components/Header";
import NavHomePage from "../../app/components/NavHomePage";
import MyCommunity from "../../app/components/myCommunity";
import AboutUs from "../../app/components/aboutUs";
import ContactUs from "../../app/components/contactUs";
import { useMediaQuery } from "../../app/hook/useMediaQuery";
import StudentRecord from "../../app/components/Header/StudentTab/StudentRecord";
import { meetingRoom } from "../../app/components/bookings/BookingList";
import UpcomingSession from "../../app/components/bookings/UpcomingSession";
import PracticeLiveExperience from "../../app/components/practiceLiveExperience";
import { WebPushRegister } from "../../app/components/notifications-service/Notification";
import { getAllNotifications, notificationAction } from "../../app/components/notifications-service/notification.slice";
import { EVENTS } from "../../helpers/events";
import { useWindowDimensions } from "../../app/hook/useWindowDimensions";
import NotificationPopup from "../../app/components/notification-popup";
import { getMeAsync } from "../../app/components/auth/auth.slice";
import CircleLoader from "../../app/common/CircleLoader";


const Dashboard = () => {
  const dispatch = useAppDispatch();
  const { sidebarActiveTab, topNavbarActiveTab, userInfo } = useAppSelector(authState);
  const { status: masterStatus } = useAppSelector(masterState);
  const [accountType, setAccountType] = useState("");
  const [openCloseToggleSideNav, setOpenCloseToggleSideNav] = useState(true);
  const [isBookExpertLoading, setIsBookExpertLoading] = useState(true);
  
  // Use ref to ensure APIs are called only once on mount
  // STEP 6: Centralize Dashboard data - All dashboard APIs triggered from ONE place
  const hasFetchedRef = useRef(false);
  const bookExpertHasLoadedRef = useRef(false);
  
  // Handle Book Expert loading state - show skeleton only on first load
  useEffect(() => {
    if (topNavbarActiveTab === topNavbarOptions?.BOOK_LESSON && !bookExpertHasLoadedRef.current) {
      // Show skeleton for a brief moment, then load content
      const timer = setTimeout(() => {
        bookExpertHasLoadedRef.current = true;
        setIsBookExpertLoading(false);
      }, 600); // 600ms delay to show skeleton
      
      return () => clearTimeout(timer);
    }
  }, [topNavbarActiveTab, topNavbarOptions]);
  
  useEffect(() => {
    // Guard: Only run once on mount
    if (hasFetchedRef.current) {
      return;
    }
    hasFetchedRef.current = true;
    
    WebPushRegister();
    // Use userInfo.account_type from Redux if available, otherwise fallback to localStorage
    const accountTypeFromUser = userInfo?.account_type || localStorage.getItem(LOCAL_STORAGE_KEYS.ACC_TYPE);
    setAccountType(accountTypeFromUser);
    
    // STEP 6: Centralized Dashboard API calls - called only once on mount
    // These APIs are called from Dashboard only, not from child components
    dispatch(getMasterDataAsync());
    dispatch(getAllNotifications({page : 1, limit : 1000000000}));
    
    // Get user info if not already loaded and user is logged in
    if ((!userInfo || !userInfo._id)) {
      dispatch(getMeAsync());
    }
  }, []); // Empty dependency array - run only once on mount
  
  // Separate effect to update accountType when userInfo changes (without refetching APIs)
  useEffect(() => {
    if (userInfo?.account_type) {
      setAccountType(userInfo.account_type);
    }
  }, [userInfo?.account_type]);





  const getDashboard = () => {
    switch (accountType) {
      case AccountType.TRAINEE:
        return <TraineeDashboardContainer openCloseToggleSideNav={openCloseToggleSideNav}/>;
      case AccountType.TRAINER:
        return <TrainerDashboardContainer accountType={accountType} />;
    }
  };

  const getScheduledInventory = () => {
    return accountType === AccountType.TRAINEE || accountType === AccountType.TRAINER ? (
      <Bookings accountType={accountType} />
    ) : (
      <ScheduleInventory />
    );
  };

  const { height, width } = useWindowDimensions();
  const [isRotatedInitally, setIsRotatedInitally] = useState(false);
  useEffect(() => {
    if (height < width) setIsRotatedInitally(true)
  }, [height, width])

  const getNavbarTabs = () => {
    switch (topNavbarActiveTab) {
      case topNavbarOptions?.HOME: {
        return <NavHomePage />;
      }
      case topNavbarOptions?.MY_COMMUNITY: {
        return <MyCommunity />;
      }
      case topNavbarOptions?.STUDENT: {
        return <StudentRecord />;
      }
      case topNavbarOptions?.Friends: {
        return <StudentRecord friends={true}/>;
      }
      case topNavbarOptions?.UPCOMING_SESSION: {
        return <UpcomingSession />;
      }
      case topNavbarOptions?.ABOUT_US: {
        return <AboutUs />;
      }
      case topNavbarOptions?.CONTACT_US: {
        return <ContactUs />;
      }
      case topNavbarOptions?.PRACTICE_SESSION: {
        return <PracticeLiveExperience />;
      }
      case topNavbarOptions?.BOOK_LESSON: {
        // Show loading skeleton on first load
        if (isBookExpertLoading && !bookExpertHasLoadedRef.current) {
          return (
            <div id="get-dashboard" className="get-dashboard" style={{ padding: "20px" }}>
              <BookExpertLoadingSkeleton />
            </div>
          );
        }
        
        // Show actual content after loading
        return (
          <div id="get-dashboard" className="get-dashboard">
            {getDashboard()}
          </div>
        );
      }
      case topNavbarOptions?.MEETING_ROOM: {
        return meetingRoom( height, width, isRotatedInitally );
      }
      default:
        break;
    }
  };

  const getActiveTabs = () => {
    switch (sidebarActiveTab) {
      case leftSideBarOptions.CHATS:
        return (
          <React.Fragment>
            <ChitChat />
            <RightSide />
          </React.Fragment>
        );

      case leftSideBarOptions.TOPNAVBAR: {
        return (
          <div id="get-navbar-tabs" className="get-navbar-tabs"style={{overflow:"hidden"}}>
            {getNavbarTabs()}
          </div>
        );
      }

      case leftSideBarOptions.SCHEDULE_TRAINING:
        return getScheduledInventory();
      default:
        break;
    }
  };

  useEffect(() => {
    dispatch(authAction?.setTopNavbarActiveTab(topNavbarOptions?.HOME));
  }, []);

  const width1000 = useMediaQuery(1000);

  const isInitialDashboardLoading =
    masterStatus === "pending" || masterStatus === "idle";

  return (
    <Fragment>
      {/* Socket is already provided at app level via SocketProvider in _app.jsx */}
      {/* height-max-content */}
      {!width1000 &&
        topNavbarActiveTab !== topNavbarOptions?.MEETING_ROOM && <Header />}
      <div
        className={`chitchat-container sidebar-toggle ${accountType === AccountType.TRAINEE ? "" : ""
          }`}
        style={{
          marginTop:
            width1000 || topNavbarActiveTab === topNavbarOptions?.MEETING_ROOM
              ? "0px"
              : "80px",
        }}
      >
        <LeftSide setOpenCloseToggleSideNav={setOpenCloseToggleSideNav} openCloseToggleSideNav={openCloseToggleSideNav}/>
        {isInitialDashboardLoading ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CircleLoader size={40} />
          </div>
        ) : (
          getActiveTabs()
        )}
      </div>
      <NotificationPopup/>
    </Fragment>
  );
};

export default Dashboard;
