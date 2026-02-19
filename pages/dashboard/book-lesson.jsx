import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAppDispatch, useAppSelector } from '../../app/store';
import { authAction, authState } from '../../app/components/auth/auth.slice';
import { topNavbarOptions, AccountType } from '../../app/common/constants';
import TraineeDashboardContainer from '../../app/components/trainee/dashboard';
import TrainerDashboardContainer from '../../app/components/trainer/dashboard';
import CircleLoader from '../../app/common/CircleLoader';
import { masterState } from '../../app/components/master/master.slice';
import DashboardLayout from '../../app/components/dashboard/DashboardLayout';

// Loading Skeleton Component for Book Expert
const BookExpertLoadingSkeleton = () => {
  return (
    <div style={{ width: '100%', padding: '20px' }}>
      {/* Header Skeleton */}
      <div style={{ marginBottom: '20px' }}>
        <div
          style={{
            height: '32px',
            width: '200px',
            backgroundColor: '#e0e0e0',
            borderRadius: '4px',
            marginBottom: '10px',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
        <div
          style={{
            height: '20px',
            width: '300px',
            backgroundColor: '#e0e0e0',
            borderRadius: '4px',
            opacity: 0.7,
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
      </div>

      {/* Search/Filter Skeleton */}
      <div
        style={{
          marginBottom: '30px',
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            height: '40px',
            width: '250px',
            backgroundColor: '#e0e0e0',
            borderRadius: '4px',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
        <div
          style={{
            height: '40px',
            width: '150px',
            backgroundColor: '#e0e0e0',
            borderRadius: '4px',
            animation: 'pulse 1.5s ease-in-out infinite',
          }}
        />
      </div>

      {/* Content Grid Skeleton */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '20px',
          marginBottom: '20px',
        }}
      >
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <div
            key={item}
            style={{
              height: '320px',
              backgroundColor: '#f5f5f5',
              borderRadius: '8px',
              padding: '15px',
              border: '1px solid #e0e0e0',
            }}
          >
            {/* Avatar Skeleton */}
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                backgroundColor: '#e0e0e0',
                margin: '0 auto 15px',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
            {/* Name Skeleton */}
            <div
              style={{
                height: '20px',
                width: '70%',
                backgroundColor: '#e0e0e0',
                borderRadius: '4px',
                margin: '0 auto 10px',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
            {/* Category Skeleton */}
            <div
              style={{
                height: '16px',
                width: '50%',
                backgroundColor: '#e0e0e0',
                borderRadius: '4px',
                margin: '0 auto 15px',
                opacity: 0.7,
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
            {/* Button Skeleton */}
            <div
              style={{
                height: '36px',
                width: '100%',
                backgroundColor: '#e0e0e0',
                borderRadius: '4px',
                marginTop: '15px',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}
            />
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%,
          100% {
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

const DashboardBookLessonPage = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { topNavbarActiveTab, userInfo } = useAppSelector(authState);
  const { status: masterStatus } = useAppSelector(masterState);
  const [isLoading, setIsLoading] = useState(true);
  const [accountType, setAccountType] = useState('');
  const bookExpertHasLoadedRef = useRef(false);

  useEffect(() => {
    // Set the active tab to BOOK_LESSON
    dispatch(authAction.setTopNavbarActiveTab(topNavbarOptions.BOOK_LESSON));
    
    // Get account type
    const accType = userInfo?.account_type || localStorage.getItem('acc_type');
    setAccountType(accType);
    
    // Show skeleton for a brief moment, then load content
    if (!bookExpertHasLoadedRef.current) {
      const timer = setTimeout(() => {
        bookExpertHasLoadedRef.current = true;
        setIsLoading(false);
      }, 600); // 600ms delay to show skeleton

      return () => clearTimeout(timer);
    } else {
      setIsLoading(false);
    }
  }, [dispatch, userInfo]);

  const isInitialLoading = masterStatus === 'pending' || masterStatus === 'idle';

  if (isInitialLoading) {
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

  // Show loading skeleton on first load
  if (isLoading && !bookExpertHasLoadedRef.current) {
    return (
      <DashboardLayout>
        <div id="get-dashboard" className="get-dashboard" style={{ padding: '20px' }}>
          <BookExpertLoadingSkeleton />
        </div>
      </DashboardLayout>
    );
  }

  // Show actual content after loading
  const getDashboard = () => {
    switch (accountType) {
      case AccountType.TRAINEE:
        return <TraineeDashboardContainer openCloseToggleSideNav={true} />;
      case AccountType.TRAINER:
        return <TrainerDashboardContainer accountType={accountType} />;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div id="get-dashboard" className="get-dashboard">
        {getDashboard()}
      </div>
    </DashboardLayout>
  );
};

export default DashboardBookLessonPage;
