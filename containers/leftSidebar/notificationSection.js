import Link from "next/link";
import {X} from "react-feather"
import { useAppDispatch, useAppSelector } from "../../app/store";
import { getAllNotifications, notificationState ,  updateNotificationsStatus } from "../../app/components/notifications-service/notification.slice";
import {  useEffect, useState, useRef } from "react";
import { Utils } from "../../utils/utils";
import { authState } from "../../app/components/auth/auth.slice";
import { debounce } from "lodash";
import ImageSkeleton from "../../app/components/common/ImageSkeleton";

const NOTIFICATION_LIMIT = 1000000000; // Load all notifications at once

const NotificationSection = (props) => {
    const dispatch = useAppDispatch();
    const {sidebarModalActiveTab} = useAppSelector(authState);
    const [page , setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const {notifications , isLoading, hasMoreNotifications} = useAppSelector(notificationState);
    const scrollContainerRef = useRef(null);
    const isInitialLoadRef = useRef(false);
    
    // Debounced scroll handler to prevent multiple API calls
    const handleScrollRef = useRef(null);
    
    useEffect(() => {
      // Create debounced function that has access to latest state
      handleScrollRef.current = debounce(() => {
        const ulElement = scrollContainerRef.current || document.querySelector('.notification-tab .chat-main') || document.querySelector('.notification-tab');
        if (!ulElement) return;
        
        // Get current state values
        const currentIsLoading = isLoading;
        const currentHasMore = hasMoreNotifications !== undefined ? hasMoreNotifications : hasMore;
        const currentPage = page;
        
        if (currentIsLoading || !currentHasMore) return;
        
        // Check if user scrolled near bottom (within 100px)
        const scrollTop = ulElement.scrollTop;
        const scrollHeight = ulElement.scrollHeight;
        const clientHeight = ulElement.clientHeight;
        const threshold = 100; // Load more when 100px from bottom
        
        if (scrollTop + clientHeight >= scrollHeight - threshold) {
          const nextPage = currentPage + 1;
          setPage(nextPage);
          dispatch(getAllNotifications({ page: nextPage, limit: NOTIFICATION_LIMIT, append: true }));
        }
      }, 300); // 300ms debounce
      
      return () => {
        if (handleScrollRef.current) {
          handleScrollRef.current.cancel();
        }
      };
    }, [isLoading, hasMoreNotifications, hasMore, page, dispatch]);

    useEffect(() => {
      // Wait for the element to be available in DOM
      const findScrollElement = () => {
        return scrollContainerRef.current || 
               document.querySelector('.notification-tab.active .chat-main') ||
               document.querySelector('.notification-tab .chat-main') ||
               document.querySelector('.notification-tab.active');
      };
      
      const ulElement = findScrollElement();
      if (!ulElement || !handleScrollRef.current) {
        // Retry after a short delay if element not found
        const timeoutId = setTimeout(() => {
          const retryElement = findScrollElement();
          if (retryElement && handleScrollRef.current) {
            retryElement.addEventListener('scroll', () => {
              if (handleScrollRef.current) handleScrollRef.current();
            }, { passive: true });
          }
        }, 100);
        return () => clearTimeout(timeoutId);
      }
      
      const scrollHandler = () => {
        if (handleScrollRef.current) {
          handleScrollRef.current();
        }
      };
      
      ulElement.addEventListener('scroll', scrollHandler, { passive: true });
      
      return () => {
        ulElement.removeEventListener('scroll', scrollHandler);
        if (handleScrollRef.current) {
          handleScrollRef.current.cancel();
        }
      };
    }, [isLoading, hasMoreNotifications, hasMore, page, sidebarModalActiveTab]);

    const closeLeftSide = () => {
      document.querySelector(".notification-tab").classList.remove("active")
      document.querySelector(".recent-default").classList.add("active");
      props.ActiveTab("")
    }
    
    // Initial load when notification tab is opened
    useEffect(() => {
      if(sidebarModalActiveTab === "notification" && !isInitialLoadRef.current){
        isInitialLoadRef.current = true;
        setPage(1);
        setHasMore(true);
        // Reset scroll position when opening
        setTimeout(() => {
          const scrollElement = scrollContainerRef.current || document.querySelector('.notification-tab.active .chat-main');
          if (scrollElement) {
            scrollElement.scrollTop = 0;
          }
        }, 100);
        dispatch(getAllNotifications({page: 1, limit: NOTIFICATION_LIMIT, append: false}));
        dispatch(updateNotificationsStatus({page: 1}));
      } else if(sidebarModalActiveTab !== "notification") {
        isInitialLoadRef.current = false;
        // Reset page when tab is closed
        setPage(1);
      }
    }, [sidebarModalActiveTab, dispatch]);
    
    // Update hasMore based on Redux state
    useEffect(() => {
      if (hasMoreNotifications !== undefined) {
        setHasMore(hasMoreNotifications);
      }
    }, [hasMoreNotifications]);

    
  
    return (
        <div className={`notification-tab dynemic-sidebar ${props.tab === "notification" ? "active" : ""} notificationClass`} id="notification">
            <div className="theme-title">
              <div className="media">
                <div> 
                  <h2>Notifications</h2>
                  {/* <h4>List of notification</h4> */}
                </div>
                <div className="media-body text-right">   <Link className="icon-btn btn-outline-light btn-sm close-panel" href="#" onClick={() => props.smallSideBarToggle()}><X/></Link></div>
              </div>
            </div>
            <ul className="chat-main custom-scroll" ref={scrollContainerRef}>
            {notifications && notifications.length > 0 ? (
              notifications.map((notification) => {
                return (
                  <li key={notification?._id}>
                    <div
                      className="chat-box notification"
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "flex-start",
                        gap: "10px",
                        padding: "8px 12px",
                        position: "relative",
                        width: "100%",
                        boxSizing: "border-box",
                        borderBottom: "1px solid #f0f0f0",
                        cursor: "default",
                        transition: "background-color 0.2s ease, transform 0.1s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#f9fafb";
                        e.currentTarget.style.transform = "translateY(-1px)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                        e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      <div className="profile" style={{ 
                        position: "relative",
                        width: "42px",
                        height: "42px",
                        borderRadius: "50%",
                        overflow: "hidden",
                        flexShrink: 0,
                      }}>
                        <ImageSkeleton
                          src={Utils?.getImageUrlOfS3(notification?.sender?.profile_picture) || '/assets/images/contact/1.jpg'}
                          alt={notification?.sender?.name || 'Avatar'}
                          fallbackSrc="/assets/images/contact/1.jpg"
                          lazy={true}
                          skeletonType="circular"
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      </div>
                      <div
                        className="details"
                        style={{
                          flex: 1,
                          minWidth: 0,
                          display: "flex",
                          flexDirection: "column",
                          gap: "3px",
                          paddingRight: "60px",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "13px",
                            fontWeight: 600,
                            color: "#333",
                            marginBottom: "1px",
                          }}
                        >
                          {notification?.sender?.name}
                        </span>
                        <h5
                          style={{
                            margin: 0,
                            fontSize: "14px",
                            fontWeight: 600,
                            color: "#1a1a1a",
                            lineHeight: "1.3",
                            marginBottom: "2px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {notification?.title}
                        </h5>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "12px",
                            color: "#666",
                            lineHeight: "1.4",
                            wordWrap: "break-word",
                            overflowWrap: "break-word",
                            overflow: "hidden",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                          }}
                        >
                          {notification?.description}
                        </p>
                      </div>
                      <div
                        className="date-status"
                        style={{
                          position: "absolute",
                          top: "8px",
                          right: "12px",
                          flexShrink: 0,
                          textAlign: "right",
                        }}
                      >
                        <h6
                          style={{
                            margin: 0,
                            fontSize: "11px",
                            fontWeight: 500,
                            color: "#999",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {Utils.formatTimeAgo(notification?.createdAt)}
                        </h6>
                      </div>
                    </div>
                  </li>
                );
              })
            ) : (
              !isLoading && (
                <li style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                  No notifications found
                </li>
              )
            )}
            {isLoading && (
              <li style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                Loading more notifications...
              </li>
            )}
            {!hasMore && notifications && notifications.length > 0 && (
              <li style={{ textAlign: 'center', padding: '20px', color: '#666', fontSize: '12px' }}>
                No more notifications to load
              </li>
            )}
            </ul>
        </div>
    );
}

export default NotificationSection;