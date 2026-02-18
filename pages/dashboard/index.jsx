import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { routingPaths } from '../../app/common/constants';
import CircleLoader from '../../app/common/CircleLoader';

const DashboardIndex = () => {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard home
    router.replace(routingPaths.dashboardHome);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - redirect only once on mount

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
      }}
    >
      <CircleLoader size={40} />
    </div>
  );
};

export default DashboardIndex;