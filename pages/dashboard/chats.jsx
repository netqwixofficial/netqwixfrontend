import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAppDispatch, useAppSelector } from '../../app/store';
import { authAction, authState } from '../../app/components/auth/auth.slice';
import { leftSideBarOptions } from '../../app/common/constants';
import ChitChat from '../../containers/chatBoard';
import RightSide from '../../containers/rightSidebar';
import CircleLoader from '../../app/common/CircleLoader';
import DashboardLayout from '../../app/components/dashboard/DashboardLayout';

const DashboardChatsPage = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { sidebarActiveTab } = useAppSelector(authState);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set the active tab to CHATS
    dispatch(authAction.setActiveTab(leftSideBarOptions.CHATS));
    
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
      <React.Fragment>
        <ChitChat />
        <RightSide />
      </React.Fragment>
    </DashboardLayout>
  );
};

export default DashboardChatsPage;
