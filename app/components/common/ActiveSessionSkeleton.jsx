import React from 'react';

/**
 * ActiveSessionSkeleton - Skeleton loader for active session cards
 */
const ActiveSessionSkeleton = () => {
  return (
    <div
      className="card mt-2 trainer-bookings-card upcoming_session_content"
      style={{
        borderRadius: "8px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        border: "1px solid #e0e0e0",
        overflow: "hidden"
      }}
    >
      <div className="card-body" style={{ padding: "15px" }}>
        <div className="d-flex justify-content-center" style={{ gap: "30px" }}>
          {/* Avatar Skeleton */}
          <div>
            <div
              style={{
                width: "80px",
                height: "80px",
                border: "2px solid rgb(0, 0, 128)",
                borderRadius: "5px",
                padding: "5px",
                marginBottom: "10px"
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
                  backgroundSize: "200% 100%",
                  animation: "skeleton-loading 1.5s ease-in-out infinite"
                }}
              />
            </div>
            <div
              style={{
                width: "100px",
                height: "16px",
                background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
                backgroundSize: "200% 100%",
                animation: "skeleton-loading 1.5s ease-in-out infinite",
                borderRadius: "4px",
                margin: "0 auto"
              }}
            />
          </div>

          {/* Details Skeleton */}
          <div className="d-flex flex-column justify-content-center" style={{ gap: "12px" }}>
            <div className="d-flex" style={{ gap: "8px" }}>
              <div
                style={{
                  width: "50px",
                  height: "16px",
                  background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
                  backgroundSize: "200% 100%",
                  animation: "skeleton-loading 1.5s ease-in-out infinite",
                  borderRadius: "4px"
                }}
              />
              <div
                style={{
                  width: "100px",
                  height: "16px",
                  background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
                  backgroundSize: "200% 100%",
                  animation: "skeleton-loading 1.5s ease-in-out infinite",
                  borderRadius: "4px"
                }}
              />
            </div>
            <div className="d-flex" style={{ gap: "8px" }}>
              <div
                style={{
                  width: "150px",
                  height: "16px",
                  background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
                  backgroundSize: "200% 100%",
                  animation: "skeleton-loading 1.5s ease-in-out infinite",
                  borderRadius: "4px"
                }}
              />
              <div
                style={{
                  width: "120px",
                  height: "16px",
                  background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
                  backgroundSize: "200% 100%",
                  animation: "skeleton-loading 1.5s ease-in-out infinite",
                  borderRadius: "4px"
                }}
              />
            </div>
          </div>
        </div>
      </div>
      <div className="card-footer" style={{ padding: "15px", display: "flex", justifyContent: "center" }}>
        <div
          style={{
            width: "120px",
            height: "40px",
            background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
            backgroundSize: "200% 100%",
            animation: "skeleton-loading 1.5s ease-in-out infinite",
            borderRadius: "6px"
          }}
        />
      </div>
      <style jsx>{`
        @keyframes skeleton-loading {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </div>
  );
};

export default ActiveSessionSkeleton;

