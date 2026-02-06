import React from 'react';
import { useMediaQuery } from '../../hook/useMediaQuery';

/**
 * RecentUsersSkeleton - Skeleton loader for recent users component
 */
const RecentUsersSkeleton = () => {
  const width600 = useMediaQuery(600);
  const width900 = useMediaQuery(900);

  const getImageSize = () => {
    if (width600) return { width: "65px", height: "65px" };
    if (width900) return { width: "75px", height: "75px" };
    return { width: "80px", height: "80px" };
  };

  const imageSize = getImageSize();

  const getGridColumns = () => {
    if (width600) return "repeat(2, 1fr)";
    if (width900) return "repeat(3, 1fr)";
    return "repeat(4, 1fr)";
  };

  return (
    <>
      <style>{`
        @keyframes skeleton-loading {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
      <div className="card rounded trainer-profile-card" style={{ 
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "visible"
      }}>
        <div
          style={{ 
            textAlign: "center", 
            fontSize: width600 ? "18px" : "20px",
            fontWeight: "600",
            color: "#333",
            marginBottom: width600 ? "10px" : "15px",
            paddingTop: width600 ? "12px" : "15px",
            paddingLeft: width600 ? "8px" : "0",
            paddingRight: width600 ? "8px" : "0",
            display: "block",
            width: "100%",
            boxSizing: "border-box"
          }}
        >
          <div
            style={{
              width: "150px",
              height: width600 ? "18px" : "20px",
              background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
              backgroundSize: "200% 100%",
              animation: "skeleton-loading 1.5s ease-in-out infinite",
              borderRadius: "4px",
              margin: "0 auto"
            }}
          />
        </div>
        <div
          className="card-body Recent"
          style={{
            width: "100%",
            marginTop: "0px",
            padding: width600 ? "8px 6px" : "15px 12px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            flex: "1"
          }}
        >
          <div className="recent-users-container">
            <div className="recent-users-box">
              <div 
                className="recent-users-grid"
                style={{
                  gridTemplateColumns: getGridColumns(),
                }}
              >
                {Array(8).fill(0).map((_, index) => (
                  <div
                    key={`skeleton-${index}`}
                    className="recent-users-item"
                    style={{
                      minHeight: width600 ? "120px" : "130px",
                      cursor: "default"
                    }}
                  >
                    <div
                      className="recent-users-avatar"
                      style={{
                        width: imageSize.width,
                        height: imageSize.height,
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          borderRadius: "50%",
                          background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
                          backgroundSize: "200% 100%",
                          animation: "skeleton-loading 1.5s ease-in-out infinite",
                          border: "3px solid rgb(0, 0, 128)",
                          padding: "2px",
                          boxSizing: "border-box"
                        }}
                      />
                    </div>
                    <div
                      style={{
                        width: "80%",
                        height: width600 ? "12px" : "13px",
                        background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
                        backgroundSize: "200% 100%",
                        animation: "skeleton-loading 1.5s ease-in-out infinite",
                        borderRadius: "4px",
                        marginTop: "8px"
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default RecentUsersSkeleton;

