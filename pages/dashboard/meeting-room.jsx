import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../app/components/dashboard/DashboardLayout';
import { useRouter } from 'next/router';
import { useAppDispatch, useAppSelector } from '../../app/store';
import { authAction, authState } from '../../app/components/auth/auth.slice';
import { topNavbarOptions } from '../../app/common/constants';
import { meetingRoom } from '../../app/features/bookings';
import { useWindowDimensions } from '../../app/hook/useWindowDimensions';
import CircleLoader from '../../app/common/CircleLoader';

const DashboardMeetingRoomPage = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { topNavbarActiveTab } = useAppSelector(authState);
  const [isLoading, setIsLoading] = useState(true);
  const [isRotatedInitally, setIsRotatedInitally] = useState(false);
  const { height, width } = useWindowDimensions();

  useEffect(() => {
    // Set the active tab to MEETING_ROOM
    dispatch(authAction.setTopNavbarActiveTab(topNavbarOptions.MEETING_ROOM));
    
    // Check rotation
    if (height < width) setIsRotatedInitally(true);
    
    // Simulate loading state
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [dispatch, height, width]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
          }}
        >
          <CircleLoader size={40} />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div
        id="get-navbar-tabs"
        className="get-navbar-tabs"
        style={{ overflow: 'hidden', height: '100%' }}
      >
        {meetingRoom(height, width, isRotatedInitally)}
      </div>
    </DashboardLayout>
  );
};

export default DashboardMeetingRoomPage;
