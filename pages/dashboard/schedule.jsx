import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAppDispatch, useAppSelector } from '../../app/store';
import { authAction, authState } from '../../app/components/auth/auth.slice';
import { leftSideBarOptions, AccountType } from '../../app/common/constants';
import { Bookings } from '../../app/features/bookings';
import ScheduleInventory from '../../app/components/trainer/scheduleInventory';
import CircleLoader from '../../app/common/CircleLoader';
import DashboardLayout from '../../app/components/dashboard/DashboardLayout';

const DashboardSchedulePage = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { sidebarActiveTab, userInfo } = useAppSelector(authState);
  const [isLoading, setIsLoading] = useState(true);
  const [accountType, setAccountType] = useState('');

  useEffect(() => {
    // Set the active tab to SCHEDULE_TRAINING
    dispatch(authAction.setActiveTab(leftSideBarOptions.SCHEDULE_TRAINING));
    
    // Get account type
    const accType = userInfo?.account_type || localStorage.getItem('acc_type');
    setAccountType(accType);
    
    // Simulate loading state
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [dispatch, userInfo]);

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

  // Render based on account type
  const renderContent = () => {
    if (accountType === AccountType.TRAINEE || accountType === AccountType.TRAINER) {
      return <Bookings accountType={accountType} />;
    }
    return <ScheduleInventory />;
  };

  return <DashboardLayout>{renderContent()}</DashboardLayout>;
};

export default DashboardSchedulePage;
