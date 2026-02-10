import React, { useContext, useEffect, useLayoutEffect } from "react";
import FevoriteSection from "./fevoriteSection";
import DocumentSection from "./documentSection";
import ContactListSection from "./contactListSection";
import NotificationSection from "./notificationSection";
import SettingSection from "./settingSection";
import StatusSection from "./statusSection";
import RecentSection from "./recentSection";
import { Fragment, useState } from "react";
import { NavLink, TabContent, TabPane } from "reactstrap";
import { useRouter } from "next/router";
import "./index.scss"

import Link from "next/link";
import { useAppDispatch, useAppSelector } from "../../app/store";
import { authAction, authState } from "../../app/components/auth/auth.slice";
import {
  AccountType,
  LOCAL_STORAGE_KEYS,
  MOBILE_SIZE,
  POSITION_FIXED_SIDEBAR_MENU,
  leftSideBarOptions,
  routingPaths,
  topNavbarOptions,
} from "../../app/common/constants";
import { SocketContext } from "../../app/components/socket";
import TodoSection from "../rightSidebar/todoSection";
import ReminderSection from "../rightSidebar/reminderSection";
import NoteSection from "../rightSidebar/noteSection";
import FileSection from "../rightSidebar/fileSection";
import AppListSection from "../rightSidebar/appList";
import {
  Book,
  Cloud,
  Upload,
  ChevronLeft,
  ChevronRight,
  Lock,
  Calendar as CalendarIcon,
  Clock,
  Bell as BellIcon,
  Settings as SettingsIcon,
  DollarSign,
  Users as UsersIcon,
  MessageCircle as MessageCircleIcon,
  LogOut as LogOutIcon,
} from "react-feather";
import {
  bookingsAction,
  bookingsState,
} from "../../app/components/common/common.slice";
import { useMediaQuery } from "../../app/hook/useMediaQuery";
import Transaction from "../../app/components/transaction";
import { notificationState } from "../../app/components/notifications-service/notification.slice";
import MyCommunity from "../../app/components/myCommunity";
import AboutUs from "../../app/components/aboutUs";
import ContactUs from "../../app/components/contactUs";
import PracticeLiveExperience from "../../app/components/practiceLiveExperience";
import MyCommunitySideBar from "./MyCommunity";
import AboutUsSideBar from "./AboutUs";
import ContactUSSideBar from "./ContactUs";
import PracticeLiveExperienceSideBar from "./PracticeSession";
import SchedulePage from "../../app/components/schedule/SchedulePage";
const { isMobileFriendly, isSidebarToggleEnabled } = bookingsAction;
const steps = [
  {
    selector: ".step1",
    content: "Check Status here",
  },
  {
    selector: ".step2",
    content: "You can change settings by clicking here",
  },
  // {
  //   selector: ".step3",
  //   content: "Change mode",
  // },
  {
    selector: ".step4",
    content: "Start chat",
  },
];

const Index = ({ openCloseToggleSideNav, setOpenCloseToggleSideNav }) => {
  // const width = useWindowSize();

  const socket = useContext(SocketContext);
  const { sidebarActiveTab, sidebarModalActiveTab, topNavbarActiveTab, onlineUsers } = useAppSelector(authState);
  const [width, setWidth] = useState(0);
  const [opentour, setopentour] = useState(true);
  const [activeTab, setActiveTab] = useState(null);
  const [mode, setMode] = useState(false);
  const router = useRouter();
  const [size, setSize] = useState([0, 0]);
  const [accountType, setAccountType] = useState("");
  const dispatch = useAppDispatch();
  const bookingState = useAppSelector(bookingsState);
  const { handleActiveTab } = bookingsAction;
  // const [onlineUsers, setOnlineUsers] = useState(null);

  const { notifications, isLoading } = useAppSelector(notificationState)
  const isMobileScreen = useMediaQuery(600)


  useEffect(() => {
    if (socket) {
      socket.on('userStatus', (data) => {
        //  
        // setOnlineUsers(data);
        dispatch(authAction.updateOnlineUsers(data?.user))
      });

      socket.on('onlineUser', (data) => {
        //  
        // setOnlineUsers(data);
        dispatch(authAction.updateOnlineUsers(data?.user))
      });

      return () => {
        socket?.off('userStatus');
        socket?.off('onlineUser');
      };
    }
  }, [socket]);

  //  /

  useEffect(() => {
    setAccountType(localStorage.getItem(LOCAL_STORAGE_KEYS.ACC_TYPE));
  }, []);

  useEffect(() => {
    if (localStorage.getItem("layout_mode") === "dark") {
      setMode(true);
    }
  }, []);

  useEffect(() => {
    function updateSize() {
      setSize(window.innerWidth);
      setWidth(window.innerWidth);
      if (window.innerWidth < MOBILE_SIZE) {
        // for mobile device
        // dispatch(isMobileFriendly(true));
        dispatch(isMobileFriendly(false));
      } else {
        dispatch(isMobileFriendly(false));
      }
    }
    window.addEventListener("resize", updateSize);
    updateSize();
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  useEffect(() => {
    if (activeTab) {
      if (bookingState.configs?.sidebar?.isMobileMode) {
        document?.querySelector(".main-nav")?.classList?.remove("on");
      }
      dispatch(handleActiveTab(activeTab));
    }
  }, [activeTab]);

  useEffect(() => {
    if (bookingState.sidebarTab) {
      TogglTab(bookingState.sidebarTab);
    }
  }, [bookingState.sidebarTab]);

  const CloseAppSidebar = () => {
    document.querySelector(".chitchat-main").classList.remove("small-sidebar");
    document.querySelector(".app-sidebar").classList.remove("active");
    document.body.className = `main-page ${localStorage.getItem(
      "layout_mode"
    )}`;
  };

  useEffect(() => {
    setActiveTab(topNavbarOptions?.HOME);
  }, [topNavbarOptions])

  const TogglTab = (value) => {
    dispatch(authAction.setActiveTab(value));
    // // document.querySelector(".recent-default").classList.remove("active");
    if (
      width < 800 &&
      document &&
      document.querySelector &&
      document.querySelector(".app-sidebar")
    ) {
      document.querySelector(".app-sidebar").classList.remove("active");
    }
  };

  const ToggleTab = (tab) => {
    setActiveTab(tab)
    dispatch(authAction?.setActiveModalTab(tab));
    if (width > 1640 && document.querySelector(".chitchat-main")) {
      document
        .querySelector(".chitchat-main")
        .classList.remove("small-sidebar");
    }
  };

  const closeTour = () => {
    setopentour(false);
  };

  const toggleLightMode = (modes) => {
    if (modes) {
      setMode(!modes);
      document.body.className += "sidebar-active main-page";
      localStorage.setItem("layout_mode", "");
    } else {
      setMode(!modes);
      document.body.className += "sidebar-active main-page dark";
      localStorage.setItem("layout_mode", "dark");
    }
  };

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const Logout = () => {
    if (isLoggingOut) return; // Prevent multiple clicks
    
    setIsLoggingOut(true);
    
    try {
      // Disconnect socket if it exists
      if (socket && typeof socket.disconnect === 'function') {
        socket.disconnect();
      }
      
      // Update Redux state first
      dispatch(authAction.updateIsUserLoggedIn());
      dispatch(authAction.userLogout());
      
      // Clear all local storage
      localStorage.clear();
      
      // Use window.location for immediate redirect and full page reload
      // This ensures all state is cleared and socket provider will detect token removal
      window.location.href = "/auth/signIn";
    } catch (error) {
      console.error("Logout error:", error);
      // Even if there's an error, try to clear and redirect
      localStorage.clear();
      window.location.href = "/auth/signIn";
    }
  };

  const smallSideBarToggle = () => {
    if (document && document.querySelector(".chitchat-main")) {
      document.querySelector(".chitchat-main").classList.add("small-sidebar");
    }
    setActiveTab("");
  };

  let isMobile = useMediaQuery(452)


  useEffect(() => {
    const updateIsMobile = (event) => {
      const isMobile = window.matchMedia(`(max-width: 452px)`).matches;
    };

    // Add the event listener
    window.addEventListener('orientationchange', updateIsMobile);

    // Cleanup the event listener on unmount
    return () => {
      window.removeEventListener('orientationchange', updateIsMobile);
    };
  }, []);

  useEffect(() => {
    // let getDashboard = document.querySelector("#get-dashboard");
    let getNavbarTabs = document.querySelector("#get-navbar-tabs");
    let getBookings = document.querySelector("#bookingsTab");
    let getBookingLesson = document.querySelector(".booking-container");
    let gettrainer = document.querySelector(".custom-trainer-scroll");
    let getvideoCall = document.querySelector(".video_call_reponsive")



    let customSidebarContentBooking = document.querySelector(".custom-sidebar-content-booking");
    let lockerDrawer = document.querySelector(".custom-mobile-menu.active")
    let isNotification = document.querySelector(".custom-mobile-notification-css")
    let isContact = document.querySelector(".custom-mobile-contact-css")
    let isAbout = document.querySelector(".custom-mobile-about-css")
    let isCommunity = document.querySelector(".custom-mobile-community-css")
    let isSetting = document.querySelector(".custom-mobile-setting-css")
    let istransaction = document.querySelector(".custom-mobile-transaction-css")
    let isfile = document.querySelector(".custom-mobile-file-css")

    if (getBookingLesson) {
      if (isMobile) {
        getBookingLesson.style.marginLeft = openCloseToggleSideNav ? '75px' : "0px";
      }
      getBookingLesson.style.marginLeft = openCloseToggleSideNav ? '65px' : "0px";

    }

    if (getvideoCall) {
      if (isMobile) {
        getvideoCall?.style?.setProperty('left', openCloseToggleSideNav ? '56px' : '0px', 'important');
        getvideoCall.style?.setProperty('max-width', 'calc(100vw - 0px)', '');
      } else {
        getvideoCall.style?.setProperty('width', 'calc(95vw)', '');
      }
    }

    if (gettrainer) {
      if (isMobile) {
        gettrainer?.style?.setProperty('margin', '0px', 'important');
        gettrainer?.style?.setProperty('margin-top', '20px', 'important');

        gettrainer?.style?.setProperty('padding', '0px', 'important');

        gettrainer?.style?.setProperty('left', openCloseToggleSideNav ? '52px' : '0px', 'important');
        gettrainer.style?.setProperty('max-width', openCloseToggleSideNav ? 'calc(100vw - 60px)' : 'calc(100vw - 0px)'); // Set max-width to calc(100vw - 105px)
      }
    }

    if (lockerDrawer) {
      lockerDrawer.style?.setProperty('margin-left', '105px', ''); // Set margin-left to 105px
      lockerDrawer.style?.setProperty('max-width', 'calc(100vw - 105px)', ''); // Set max-width to calc(100vw - 105px)
    }
    if (getBookings) {
      if (!isMobile) {

        getBookings.style.marginLeft = openCloseToggleSideNav ? '115px' : "0px";
      } else {
        getBookings.style.marginLeft = openCloseToggleSideNav ? '75px' : "0px";

        if (openCloseToggleSideNav) {
          isNotification?.style?.setProperty('margin-left', '55px', '');
          isNotification?.style?.setProperty('max-width', 'calc(100vw - 20px)', '');

          isSetting?.style?.setProperty('margin-left', '55px', '');
          isSetting?.style?.setProperty('max-width', 'calc(100vw - 20px)', '');

          istransaction?.style?.setProperty('margin-left', '55px', '');
          istransaction?.style?.setProperty('max-width', 'calc(100vw - 55px)', '');

          isfile?.style?.setProperty('margin-left', '55px', '');
          isfile?.style?.setProperty('max-width', 'calc(100vw - 55px)', '');
        } else {
          isNotification?.style?.setProperty('margin-left', '10px', '');
          isNotification?.style?.setProperty('max-width', 'calc(100vw - 10px)', '');

          isSetting?.style?.setProperty('margin-left', '10px', '');
          isSetting?.style?.setProperty('max-width', 'calc(100vw - 10px)', '');

          istransaction?.style?.setProperty('margin-left', '10px', '');
          istransaction?.style?.setProperty('max-width', 'calc(100vw - 10px)', '');

          isfile?.style?.setProperty('margin-left', '10px', '');
          isfile?.style?.setProperty('max-width', 'calc(100vw - 10px)', '');
        }

      }
    }
    // if (getDashboard) {
    //   getDashboard.style.marginLeft = openCloseToggleSideNav ? '105px' : "0px";
    // }
    if (getNavbarTabs) {
      if (isMobile) {
        getNavbarTabs.style.marginLeft = openCloseToggleSideNav ? '65px' : '0px';
        getNavbarTabs?.style?.setProperty('width', openCloseToggleSideNav ? 'calc(100vw - 55px)' : '100vw', 'important');
        if (openCloseToggleSideNav) {
          isNotification?.style?.setProperty('margin-left', '55px', '');
          isNotification?.style?.setProperty('max-width', 'calc(100vw - 20px)', '');

          isContact?.style?.setProperty('margin-left', '40px', '');
          isContact?.style?.setProperty('max-width', 'calc(100vw - 20px)', '');

          isAbout?.style?.setProperty('margin-left', '40px', '');
          isAbout?.style?.setProperty('max-width', 'calc(100vw - 20px)', '');

          isCommunity?.style?.setProperty('margin-left', '40px', '');
          isCommunity?.style?.setProperty('max-width', 'calc(100vw - 20px)', '');

          isSetting?.style?.setProperty('margin-left', '55px', '');
          isSetting?.style?.setProperty('max-width', 'calc(100vw - 20px)', '');

          istransaction?.style?.setProperty('margin-left', '55px', '');
          istransaction?.style?.setProperty('max-width', 'calc(100vw - 55px)', '');

          isfile?.style?.setProperty('margin-left', '55px', '');
          isfile?.style?.setProperty('max-width', 'calc(100vw - 55px)', '');
        } else {
          isNotification?.style?.setProperty('margin-left', '10px', '');
          isNotification?.style?.setProperty('max-width', 'calc(100vw - 10px)', '');

          isContact?.style?.setProperty('margin-left', '10px', '');
          isContact?.style?.setProperty('max-width', 'calc(100vw - 10px)', '');

          isAbout?.style?.setProperty('margin-left', '10px', '');
          isAbout?.style?.setProperty('max-width', 'calc(100vw - 10px)', '');

          isCommunity?.style?.setProperty('margin-left', '10px', '');
          isCommunity?.style?.setProperty('max-width', 'calc(100vw - 10px)', '');

          isSetting?.style?.setProperty('margin-left', '10px', '');
          isSetting?.style?.setProperty('max-width', 'calc(100vw - 10px)', '');

          istransaction?.style?.setProperty('margin-left', '10px', '');
          istransaction?.style?.setProperty('max-width', 'calc(100vw - 10px)', '');

          isfile?.style?.setProperty('margin-left', '10px', '');
          isfile?.style?.setProperty('max-width', 'calc(100vw - 10px)', '');
        }

      } else {
        getNavbarTabs.style.marginLeft = openCloseToggleSideNav && !document.getElementById("drawing-canvas") ? '105px' : '25px';
        getNavbarTabs?.style?.setProperty('width', openCloseToggleSideNav ? 'calc(100vw - 55px)' : 'calc(100vw - 25px)');

      }
    }
    if (customSidebarContentBooking) {
      customSidebarContentBooking?.style?.setProperty('width', openCloseToggleSideNav ? '85vw' : '100vw', 'important');
    }
    if (getvideoCall) {
      if (!isMobile) {
        getvideoCall?.style?.setProperty('width', openCloseToggleSideNav ? '85vw' : '95vw', 'important');
        getvideoCall?.style?.setProperty('left', openCloseToggleSideNav ? '5px' : '10px', 'important');
        getvideoCall?.style?.setProperty('margin-left', openCloseToggleSideNav ? '85px' : '0px', 'important');

      } else {
        getvideoCall?.style?.setProperty('width', openCloseToggleSideNav ? '85vw' : '95vw', 'important');
        getvideoCall?.style?.setProperty('left', openCloseToggleSideNav ? '5px' : '0px', 'important');
        getvideoCall?.style?.setProperty('margin-left', openCloseToggleSideNav ? '66px' : '20px', 'important');


      }


    }
  }, [openCloseToggleSideNav, sidebarModalActiveTab, sidebarActiveTab, activeTab, size, isMobile])

  useEffect(() => {
    if (isMobile) {
      setOpenCloseToggleSideNav(true)
    } else {
      setOpenCloseToggleSideNav(true)
    }
  }, [isMobile])

  const width1000 = useMediaQuery(1000)

  return (
    <Fragment>
      {/* <AppListSection
          activeTab={activeTab}
          CloseAppSidebar={CloseAppSidebar}
          ToggleTab={ToggleTab}
        /> */}
      <div id="left-nav-wrapper" className="left-nav-wrapper">
        <aside
          className={`main-nav on custom-scroll ${openCloseToggleSideNav ? "open" : "closed"} ${accountType === AccountType.TRAINEE &&
            POSITION_FIXED_SIDEBAR_MENU.includes(activeTab) &&
            "custom-sidebar"
            }`}
          style={(width1000 || topNavbarActiveTab === topNavbarOptions?.MEETING_ROOM) ? {} : { paddingTop: "0px" }}
        >
            {/* logo section */}
            {(width1000 || topNavbarActiveTab === topNavbarOptions?.MEETING_ROOM) && <div className="logo-warpper">
              <button
                id="Net"
                onClick={() => {
                  router.push(routingPaths.dashboard);
                  dispatch(authAction?.setTopNavbarActiveTab(topNavbarOptions?.HOME));
                }}
                aria-label="Go to dashboard"
                style={{
                  cursor: "pointer",
                  border: "none",
                  background: "none",
                  padding: 0,
                  margin: 0
                }}
              >
                <img
                  src="/assets/images/logo/netquix-logo.png"
                  alt="logo"
                  className="custom-image"
                  style={{ display: "block" }}
                />
              </button>
            </div>}


            <div className="app-list sidebar-main">
              {/* <ul className="sidebar-top  custom-scroll">
            <li>
              <Tooltip title="Home" position="top" trigger="mouseenter">
                <NavLink
                  className={`icon-btn btn-light button-effect ${activeTab === "home" ? "active" : ""
                    }`}
                  onClick={() => TogglTab("home")}
                >
                  <i className="fa fa-home"></i>
                </NavLink>
              </Tooltip>
            </li>
            <li>
              <Tooltip
                title={
                  accountType === AccountType.TRAINEE
                    ? "Booking"
                    : "Schedule Slots"
                }
                position="right-end"
                trigger="mouseenter"
              >
                <NavLink
                  className={`icon-btn btn-light button-effect ${activeTab === leftSideBarOptions.SCHEDULE_TRAINING
                    ? "active"
                    : ""
                    }`}
                  onClick={() => ToggleTab(leftSideBarOptions.SCHEDULE_TRAINING)}
                >
                  <i className="fa fa-calendar"></i>
                </NavLink>
              </Tooltip>
            </li>
            <li><Link className={`icon-btn btn-outline-primary btn-sm button-effect ${activeTab === "todo" ? "active" : ""}`} href="#" onClick={() => ToggleTab("todo")}><Book /></Link>
            </li>

          </ul> */}
              <ul className="sidebar-top">
                {/* Locker / Home */}
                <li
                  onClick={() => {
                    setActiveTab(topNavbarOptions?.HOME);
                    dispatch(
                      authAction?.setTopNavbarActiveTab(topNavbarOptions?.HOME)
                    );
                  }}
                >
                  <NavLink
                    id="sidebar-item-home"
                    className={`icon-btn btn-light button-effect ${
                      activeTab === topNavbarOptions?.HOME ? "active" : ""
                    }`}
                    aria-label="My Locker"
                  >
                    <Lock size={22} />
                  </NavLink>
                  <p className="menu-name px-2">My Locker</p>
                </li>

                {/* Trainee: Upcoming Sessions */}
                {accountType === AccountType.TRAINEE && (
                  <li
                    onClick={() => {
                      setActiveTab(topNavbarOptions?.UPCOMING_SESSION);
                      dispatch(
                        authAction?.setTopNavbarActiveTab(
                          topNavbarOptions?.UPCOMING_SESSION
                        )
                      );
                    }}
                  >
                    <NavLink
                      id="sidebar-item-booking"
                      className={`icon-btn btn-light button-effect ${
                        activeTab === topNavbarOptions?.UPCOMING_SESSION
                          ? "active"
                          : ""
                      }`}
                      aria-label="Upcoming Sessions"
                      style={{ position: "relative" }}
                    >
                      <CalendarIcon size={22} />
                      <Clock 
                        size={10} 
                        style={{ 
                          position: "absolute", 
                          top: "2px", 
                          right: "2px",
                          background: "white",
                          borderRadius: "50%",
                          padding: "1px"
                        }} 
                      />
                    </NavLink>
                    <p className="menu-name px-2">Upcoming Sessions</p>
                  </li>
                )}

                {/* Trainee: Book Expert */}
                {accountType === AccountType?.TRAINEE && (
                  <li
                    onClick={() => {
                      setActiveTab(topNavbarOptions?.BOOK_LESSON);
                      dispatch(
                        authAction?.setTopNavbarActiveTab(
                          topNavbarOptions?.BOOK_LESSON
                        )
                      );
                    }}
                  >
                    <NavLink
                      id="sidebar-item-locker"
                      className={`icon-btn btn-light button-effect step2 ${
                        activeTab === topNavbarOptions?.BOOK_LESSON
                          ? "active"
                          : ""
                      }`}
                      data-intro=""
                      aria-label="Book Expert"
                    >
                      <Book size={22} />
                    </NavLink>
                    <p className="menu-name px-2">Book Expert</p>
                  </li>
                )}

                {/* Shared: File / Locker */}
                <li onClick={() => ToggleTab("file")}>
                  <NavLink
                    id="sidebar-item-locker"
                    className={`icon-btn btn-light button-effect step2 ${
                      activeTab === "file" ? "active" : ""
                    }`}
                    data-intro=""
                    aria-label="My Uploads"
                    style={{ position: "relative" }}
                  >
                    <Cloud size={22} />
                    <Upload 
                      size={10} 
                      style={{ 
                        position: "absolute", 
                        top: "2px", 
                        right: "2px",
                        background: "white",
                        borderRadius: "50%",
                        padding: "1px"
                      }} 
                    />
                  </NavLink>
                  <p className="menu-name px-2">My Uploads</p>
                </li>
                {/* <li>
              <Tooltip title="Chats" position="top" trigger="mouseenter">
                <NavLink
                  className={`icon-btn btn-light button-effect ${
                    activeTab === "chats" ? "active" : ""
                  }`}
                  onClick={() => TogglTab("chats")}
                >
                  <i className="fa fa-comment"></i>
                </NavLink>
              </Tooltip>
            </li> */}

                {/* some menu hide feedback changes */}
                {/* <li>
              <Tooltip title="Todo" position="top" trigger="mouseenter">
                <NavLink
                  className={`icon-btn btn-light button-effect ${
                    activeTab === "todo" ? "active" : ""
                  }`}
                  onClick={() => ToggleTab("todo")}
                >
                  <i className="fa fa-list" />
                </NavLink>
              </Tooltip>
            </li>
            <li>
              <Tooltip title="Notes" position="top" trigger="mouseenter">
                <NavLink
                  className={`icon-btn btn-light button-effect ${
                    activeTab === "notes" ? "active" : ""
                  }`}
                  onClick={() => ToggleTab("notes")}
                >
                  <i className="fa fa-book" />
                </NavLink>
              </Tooltip>
            </li>
            <li>
              <Tooltip title="Reminder" position="top" trigger="mouseenter">
                <NavLink
                  className={`icon-btn btn-light button-effect ${
                    activeTab === "reminder" ? "active" : ""
                  }`}
                  onClick={() => ToggleTab("reminder")}
                >
                  <i className="fa fa-clock-o" />
                </NavLink>
              </Tooltip>
            </li>
            <li>
              <Tooltip title="Favourite" position="top" trigger="mouseenter">
                <NavLink
                  className={`icon-btn btn-light button-effect ${
                    activeTab === "fevorite" ? "active" : ""
                  }`}
                  onClick={() => ToggleTab("fevorite")}
                >
                  <i className="fa fa-star" />
                </NavLink>
              </Tooltip>
            </li> */}

                {/* <li>
              <Tooltip title="Document" position="top" trigger="mouseenter">
                <NavLink
                  className={`icon-btn btn-light button-effect ${
                    activeTab === "document" ? "active" : ""
                  }`}
                  onClick={() => TogglTab("document")}
                >
                  {" "}
                  <i className="fa fa-file-text"></i>
                </NavLink>
              </Tooltip>
            </li> */}
                {/* <li>
              <Tooltip title="Contact" position="top" trigger="mouseenter">
                <NavLink
                  className={`icon-btn btn-light button-effect ${
                    activeTab === "contact" ? "active" : ""
                  }`}
                  onClick={() => TogglTab("contact")}
                >
                  {" "}
                  <i className="fa fa-users"></i>
                </NavLink>
              </Tooltip>
            </li> */}

                {/* Trainer: Schedule */}
                {accountType === AccountType?.TRAINER && (
                  <li
                    onClick={() => {
                      ToggleTab(leftSideBarOptions.SCHEDULE_TRAINING);
                    }}
                  >
                    <NavLink
                      id="sidebar-item-schedule"
                      className={`icon-btn btn-light button-effect step2 ${
                        activeTab === leftSideBarOptions.SCHEDULE_TRAINING ? "active" : ""
                      }`}
                      data-intro=""
                      aria-label="Schedule"
                    >
                      <CalendarIcon size={22} />
                    </NavLink>
                    <p className="menu-name px-2">Schedule</p>
                  </li>
                )}

                {/* Trainer: Upcoming Sessions */}
                {accountType === AccountType?.TRAINER && (
                  <li
                    onClick={() => {
                      setActiveTab(topNavbarOptions?.UPCOMING_SESSION);
                      dispatch(
                        authAction?.setTopNavbarActiveTab(
                          topNavbarOptions?.UPCOMING_SESSION
                        )
                      );
                    }}
                  >
                    <NavLink
                      id="sidebar-item-upcoming"
                      className={`icon-btn btn-light button-effect step2 ${
                        activeTab === topNavbarOptions?.UPCOMING_SESSION
                          ? "active"
                          : ""
                      }`}
                      data-intro=""
                      aria-label="Upcoming Sessions"
                      style={{ position: "relative" }}
                    >
                      <CalendarIcon size={22} />
                      <Clock 
                        size={10} 
                        style={{ 
                          position: "absolute", 
                          top: "2px", 
                          right: "2px",
                          background: "white",
                          borderRadius: "50%",
                          padding: "1px"
                        }} 
                      />
                    </NavLink>
                    <p className="menu-name px-2">Upcoming Sessions</p>
                  </li>
                )}

                <li onClick={() => {

                  ToggleTab("notification")
                }}>
                  <div >

                    <NavLink id="sidebar-item-notification"
                      className={`icon-btn btn-light button-effect ${
                        activeTab === "notification" ? "active" : ""
                      }`}
                      aria-label="Notifications"
                    >
                      <BellIcon size={22} />
                    </NavLink>

                  </div>
                  <p className="menu-name px-2">Notifications</p>
                </li>

                <li onClick={() => { ToggleTab("setting") }}
                >

                  <NavLink id="sidebar-item-setting"
                    className={`icon-btn btn-light button-effect step2 ${
                      activeTab === "setting" ? "active" : ""
                    }`}
                    data-intro="You can change settings by clicking here"
                    aria-label="Settings"
                  >
                    <SettingsIcon size={22} />
                  </NavLink>

                  <p className="menu-name px-2">Settings</p>
                </li>

                {/* Commented */}
                {/* <li>
                  <Tooltip
                    title="Change Mode"
                    size="small"
                    position="top-end"
                    trigger="mouseenter"
                  >
                    <NavLink
                      id="sidebar-item-mode"
                      className="icon-btn btn-light button-effect mode step3"
                      data-intro="Change mode"
                      onClick={() => toggleLightMode(mode)}
                    >
                      <i className={mode ? "fa fa-lightbulb-o" : "fa fa-moon-o"} />
                    </NavLink>
                  </Tooltip>
                  <p className="menu-name px-2" style={{ color: "black", fontWeight: "500" }}>Change Mode</p>
                </li> */}
                {/* {accountType === AccountType?.TRAINER && */}
                <li onClick={() => ToggleTab("transaction")}
                >
                  {/* <div className="dot-btn dot-danger grow"> */}

                  <NavLink
                    id="sidebar-item-setting"
                    className={`icon-btn btn-light button-effect step2 ${
                      activeTab === "transaction" ? "active" : ""
                    }`}
                    aria-label="Transactions"
                  >
                    <DollarSign size={22} />
                  </NavLink>

                  {/* </div> */}
                  <p className="menu-name px-2">Transactions</p>
                </li>

                {width < 800 && <>
                  {/* My Community */}

                  <li onClick={() => ToggleTab("my_community")}>
                    <NavLink
                      id="sidebar-item-setting"
                      className={`icon-btn btn-light button-effect step2 ${
                        activeTab === "my_community" ? "active" : ""
                      }`}
                      aria-label="My Community"
                    >
                      <UsersIcon size={22} />
                    </NavLink>

                    {/* </div> */}
                    <p className="menu-name px-2">My Community</p>
                  </li>

                  {/* About Us */}

                  {/* <li>

                    <NavLink id="sidebar-item-setting"
                      className={`icon-btn btn-light button-effect step2 ${activeTab === "about_us" ? "active" : ""
                        }`}
                      onClick={() => ToggleTab("about_us")}
                    >
                      <i class="fa fa-address-card" aria-hidden="true" />
                    </NavLink>

                    {/* </div> 
                    <p className="menu-name px-2">About Us</p>
                  </li> */}

                  {/* Contact Us */}

                  <li onClick={() => ToggleTab("contact_us")}>
                    <NavLink
                      id="sidebar-item-setting"
                      className={`icon-btn btn-light button-effect step2 ${
                        activeTab === "contact_us" ? "active" : ""
                      }`}
                      aria-label="Contact Us"
                    >
                      <MessageCircleIcon size={22} />
                    </NavLink>

                    {/* </div> */}
                    <p className="menu-name px-2">Contact Us</p>
                  </li>

                  {/* Practice Session 

                  <li>

                  <NavLink id="sidebar-item-setting"
                      className={`icon-btn btn-light button-effect step2 ${activeTab === "practice_session" ? "active" : ""
                        }`}
                      onClick={() => ToggleTab("practice_session")}
                    >
                      <i class="fa fa-commenting-o" aria-hidden="true" />
                    </NavLink>

                  
                    <p className="menu-name px-2">Practice Session</p>
                    
                  </li>*/}
                </>}

                <li onClick={() => Logout()}>
                  <NavLink
                    id="sidebar-item-logout"
                    className="icon-btn btn-light"
                    aria-label="Logout"
                    style={{ position: "relative" }}
                  >
                    {isLoggingOut ? (
                      <div style={{
                        width: "22px",
                        height: "22px",
                        border: "2px solid #000080",
                        borderTop: "2px solid transparent",
                        borderRadius: "50%",
                        animation: "spin 0.8s linear infinite"
                      }} />
                    ) : (
                    <LogOutIcon size={22} />
                    )}
                  </NavLink>

                  <p className="menu-name px-2" style={{ color: "black", fontWeight: "500" }}>
                    {isLoggingOut ? "Logging out..." : "Logout"}
                  </p>
                </li>

                <li>
                  <p className="menu-name px-2" style={{ color: "black", fontWeight: "500" }}></p>
                </li>
                <li>
                  <p className="menu-name px-2" style={{ color: "black", fontWeight: "500" }}></p>
                </li>
              </ul>
              {/* <ul className="sidebar-bottom">
                <li>
                  <Tooltip
                    title="Change Mode"
                    size="small"
                    position="top-end"
                    trigger="mouseenter"
                  >
                    <NavLink
                      id="sidebar-item-mode"
                      className="icon-btn btn-light button-effect mode step3"
                      data-intro="Change mode"
                      onClick={() => toggleLightMode(mode)}
                    >
                      <i className={mode ? "fa fa-lightbulb-o" : "fa fa-moon-o"} />
                    </NavLink>
                  </Tooltip>
                  <p className="menu-name px-2" style={{ color: "black", fontWeight: "500" }}>Change Mode</p>
                </li>
                <li>
                  <Tooltip title="Logout" position="top" trigger="mouseenter">
                    <NavLink
                      id="sidebar-item-logout"
                      className="icon-btn btn-light"
                      onClick={() => Logout()}
                    >
                      {" "}
                      <i className="fa fa-power-off"> </i>
                    </NavLink>
                  </Tooltip>
                  <p className="menu-name px-2" style={{ color: "black", fontWeight: "500" }}>Logout</p>
                </li>
              </ul> */}
            </div>
            <ChevronLeft 
              id="ChevronLeft" 
              style={{ right: "-12px" }} 
              className={`collapse-left-drawer-icon collapse-icon ${openCloseToggleSideNav ? "visible" : "hidden"}`}
              onClick={() => setOpenCloseToggleSideNav(false)} 
            />
          </aside>
        <ChevronRight 
          id="ChevronRight" 
          style={{ left: "0px" }} 
          className={`collapse-left-drawer-icon collapse-icon ${!openCloseToggleSideNav ? "visible" : "hidden"}`}
          onClick={() => setOpenCloseToggleSideNav(true)} 
        />




      </div>
      {activeTab !== leftSideBarOptions.HOME &&
        activeTab !== leftSideBarOptions.SCHEDULE_TRAINING && (
          <aside className="app-sidebar active">
            <div className="apps">
              <div className="apps-ul">
                <TabContent activeTab={activeTab}>
                  <TabPane
                    tabId="todo"
                    className={`${activeTab === "todo" ? "left-90" : ""}`}
                  >
                    <TodoSection
                      smallSideBarToggle={smallSideBarToggle}
                      tab={activeTab}
                      ActiveTab={setActiveTab}
                    />
                  </TabPane>
                  <TabPane
                    tabId="reminder"
                    className={`${activeTab === "reminder" ? "left-90" : ""}`}
                  >
                    <ReminderSection
                      smallSideBarToggle={smallSideBarToggle}
                      tab={activeTab}
                      ActiveTab={setActiveTab}
                    />
                  </TabPane>
                  <TabPane
                    tabId="notes"
                    className={`${activeTab === "notes" ? "left-90" : ""}`}
                  >
                    <NoteSection
                      smallSideBarToggle={smallSideBarToggle}
                      tab={activeTab}
                      ActiveTab={setActiveTab}
                    />
                  </TabPane>
                  <TabPane
                    tabId="document"
                    className={`${activeTab === "document" ? "left-90" : ""}`}
                  >
                    <DocumentSection
                      smallSideBarToggle={smallSideBarToggle}
                      tab={activeTab}
                      ActiveTab={setActiveTab}
                    />
                  </TabPane>
                  <TabPane
                    tabId="fevorite"
                    className={`${activeTab === "fevorite" ? "left-90" : ""}`}
                  >
                    <FevoriteSection
                      smallSideBarToggle={smallSideBarToggle}
                      tab={activeTab}
                      ActiveTab={setActiveTab}
                    />
                  </TabPane>
                  <TabPane
                    tabId="file"
                    className={`${activeTab === "file" ? "custom-mobile-menu" : ""
                      } custom-mobile-file-css`}
                  >
                    <FileSection smallSideBarToggle={smallSideBarToggle} activeTabParent={activeTab} />
                  </TabPane>

                  <TabPane
                    tabId="contact"
                    className={`${activeTab === "contact" ? "left-90" : ""}`}
                  >
                    <ContactListSection
                      smallSideBarToggle={smallSideBarToggle}
                      tab={activeTab}
                      ActiveTab={setActiveTab}
                    />
                  </TabPane>
                  <TabPane
                    tabId="notification"
                    className={`${activeTab === "notification"
                      ? "custom-mobile-menu"
                      : ""
                      } custom-mobile-notification-css`}
                  >
                    <NotificationSection
                      smallSideBarToggle={smallSideBarToggle}
                      tab={activeTab}
                      ActiveTab={setActiveTab}
                    />
                  </TabPane>
                  <TabPane
                    tabId="setting"
                    className={`${activeTab === "setting"
                      ? "custom-mobile-menu"
                      : ""
                      } ${accountType === AccountType.TRAINER
                        ? "sidebar-full-width"
                        : ""
                      } custom-mobile-setting-css`}
                  >
                    <SettingSection
                      smallSideBarToggle={smallSideBarToggle}
                      tab={activeTab}
                      ActiveTab={setActiveTab}
                    />
                  </TabPane>

                  <TabPane
                    tabId="transaction"
                    className={`${activeTab === "transaction"
                      ? "custom-mobile-menu"
                      : ""
                      } sidebar-full-width custom-mobile-transaction-css`}
                  >
                    <Transaction
                      smallSideBarToggle={smallSideBarToggle}
                      tab={activeTab}
                      ActiveTab={setActiveTab}
                    />
                  </TabPane>

                  {/* Schedule - Trainer Only */}
                  <TabPane
                    tabId={leftSideBarOptions.SCHEDULE_TRAINING}
                    className={`${activeTab === leftSideBarOptions.SCHEDULE_TRAINING
                      ? "custom-mobile-menu"
                      : ""
                      } sidebar-full-width custom-mobile-schedule-css`}
                  >
                    <SchedulePage />
                  </TabPane>

                  {/* My Community */}

                  <TabPane
                    tabId="my_community"
                    className={`${activeTab === "my_community"
                      ? "custom-mobile-menu"
                      : ""
                      } sidebar-full-width custom-mobile-community-css`}
                  >
                    <MyCommunitySideBar
                      smallSideBarToggle={smallSideBarToggle}
                      tab={activeTab}
                      ActiveTab={setActiveTab} />

                  </TabPane>

                  {/* About Us */}

                  <TabPane
                    tabId="about_us"
                    className={`${activeTab === "about_us"
                      ? "custom-mobile-menu"
                      : ""
                      } sidebar-full-width custom-mobile-about-css`}
                  >
                    <AboutUsSideBar
                      smallSideBarToggle={smallSideBarToggle}
                      tab={activeTab}
                      ActiveTab={setActiveTab} />
                  </TabPane>

                  {/* Contact Us */}

                  <TabPane
                    tabId="contact_us"
                    className={`${activeTab === "contact_us"
                      ? "custom-mobile-menu"
                      : ""
                      } custom-mobile-contact-css`}
                  >
                    <ContactUSSideBar
                      smallSideBarToggle={smallSideBarToggle}
                      tab={activeTab}
                      ActiveTab={setActiveTab} />
                  </TabPane>

                  {/* Practice Session */}

                  <TabPane
                    tabId="practice_session"
                    className={`${activeTab === "practice_session"
                      ? "custom-mobile-menu"
                      : ""
                      } sidebar-full-width custom-mobile-transaction-css`}
                  >
                    <PracticeLiveExperienceSideBar
                      smallSideBarToggle={smallSideBarToggle}
                      tab={activeTab}
                      ActiveTab={setActiveTab} />
                  </TabPane>

                  <TabPane
                    tabId="status"
                    className={`${activeTab === "status" ? "left-90" : ""}`}
                  >
                    <StatusSection
                      smallSideBarToggle={smallSideBarToggle}
                      tab={activeTab}
                      ActiveTab={setActiveTab}
                    />
                  </TabPane>
                </TabContent>
              </div>
            </div>
          </aside>
        )}
      {bookingState.configs?.sidebar?.isMobileMode && <RecentSection openCloseToggleSideNav={openCloseToggleSideNav} setOpenCloseToggleSideNav={setOpenCloseToggleSideNav} />}
    </Fragment>
  );
};

export default Index;
