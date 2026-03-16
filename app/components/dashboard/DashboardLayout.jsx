import React, { Fragment, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import LeftSide from "../../../containers/leftSidebar";
import { useAppDispatch, useAppSelector } from "../../store";
import { authState } from "../auth/auth.slice";
import {
  AccountType,
  LOCAL_STORAGE_KEYS,
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

// Shared hook to centralize dashboard data fetching and loading state
const useDashboardData = (dispatch, userInfo, masterStatus) => {
  const hasFetchedRef = useRef(false);
  const width1000 = useMediaQuery(1000);

  useEffect(() => {
    if (hasFetchedRef.current) {
      return;
    }
    hasFetchedRef.current = true;

    WebPushRegister();
    dispatch(getMasterDataAsync());
    dispatch(getAllNotifications({ page: 1, limit: 1000000000 }));

    if (!userInfo || !userInfo._id) {
      dispatch(getMeAsync());
    }
  }, [dispatch, userInfo]);

  const hasToken =
    typeof window !== "undefined" &&
    !!localStorage.getItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN);
  const isUserInfoReady = !hasToken || (userInfo && userInfo._id);
  const isInitialDashboardLoading =
    masterStatus === "pending" ||
    masterStatus === "idle" ||
    !isUserInfoReady;

  return {
    width1000,
    isInitialDashboardLoading,
  };
};

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

  const { width1000, isInitialDashboardLoading } = useDashboardData(
    dispatch,
    userInfo,
    masterStatus
  );

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
