import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAppDispatch, useAppSelector } from '../../app/store';
import { authAction, authState } from '../../app/components/auth/auth.slice';
import { topNavbarOptions } from '../../app/common/constants';
import { UpcomingSession } from '../../app/features/bookings';
import CircleLoader from '../../app/common/CircleLoader';
import DashboardLayout from '../../app/components/dashboard/DashboardLayout';

const DashboardUpcomingSessionsPage = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { topNavbarActiveTab } = useAppSelector(authState);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set the active tab to UPCOMING_SESSION
    dispatch(authAction.setTopNavbarActiveTab(topNavbarOptions.UPCOMING_SESSION));
    
    // Simulate loading state
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [dispatch]);

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
        <UpcomingSession />
      </div>
    </DashboardLayout>
  );
};

export default DashboardUpcomingSessionsPage;
