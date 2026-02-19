import React, { Fragment, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import LeftSide from "../../../containers/leftSidebar";
import { useAppDispatch, useAppSelector } from "../../store";
import { authAction, authState } from "../auth/auth.slice";
import {
  AccountType,
  LOCAL_STORAGE_KEYS,
  topNavbarOptions,
} from "../../common/constants";
import {
  getMasterDataAsync,
  masterState,
} from "../master/master.slice";
import Header from "../Header";
import { useMediaQuery } from "../../hook/useMediaQuery";
import { WebPushRegister } from "../notifications-service/Notification";
import {
  getAllNotifications,
} from "../notifications-service/notification.slice";
import { getMeAsync } from "../auth/auth.slice";
import CircleLoader from "../../common/CircleLoader";
import NotificationPopup from "../notification-popup";

/**
 * DashboardLayout - Wrapper component for all dashboard routes
 * Provides consistent layout, sidebar, and data loading
 */
const DashboardLayout = ({ children }) => {
  const dispatch = useAppDispatch();
  const { userInfo } = useAppSelector(authState);
  const { status: masterStatus } = useAppSelector(masterState);
  const [openCloseToggleSideNav, setOpenCloseToggleSideNav] = React.useState(true);
  const router = useRouter();

  // Use ref to ensure APIs are called only once on mount
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    // Guard: Only run once on mount
    if (hasFetchedRef.current) {
      return;
    }
    hasFetchedRef.current = true;

    WebPushRegister();
    // Centralized Dashboard API calls - called only once on mount
    dispatch(getMasterDataAsync());
    dispatch(getAllNotifications({ page: 1, limit: 1000000000 }));

    // Get user info if not already loaded and user is logged in
    if (!userInfo || !userInfo._id) {
      dispatch(getMeAsync());
    }
  }, []); // Empty dependency array - run only once on mount

  const width1000 = useMediaQuery(1000);
  const isInitialDashboardLoading =
    masterStatus === "pending" || masterStatus === "idle";

  // Check if current route is meeting room (should not show header)
  const isMeetingRoom = router.pathname.includes('/meeting-room') || 
                        router.pathname.includes('/meeting');

  return (
    <Fragment>
      {/* Socket is already provided at app level via SocketProvider in _app.jsx */}
      {!width1000 && !isMeetingRoom && <Header />}
      <div
        className={`chitchat-container sidebar-toggle ${
          userInfo?.account_type === AccountType.TRAINEE ? "" : ""
        }`}
        style={{
          marginTop:
            width1000 || isMeetingRoom
              ? "0px"
              : "80px",
        }}
      >
        <LeftSide
          setOpenCloseToggleSideNav={setOpenCloseToggleSideNav}
          openCloseToggleSideNav={openCloseToggleSideNav}
        />
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
          children
        )}
      </div>
      <NotificationPopup />
    </Fragment>
  );
};

export default DashboardLayout;
