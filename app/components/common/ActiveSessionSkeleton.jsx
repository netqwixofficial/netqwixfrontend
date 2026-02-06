import React from 'react';

/**
 * ActiveSessionSkeleton - Skeleton loader for active session cards
 */
const ActiveSessionSkeleton = ({ width600 = false }) => {
  return (
    <div
      className="card mt-2 trainer-bookings-card upcoming_session_content"
      style={{
        borderRadius: "8px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        border: "1px solid #e0e0e0",
        overflow: "hidden",
        width: "100%",
        boxSizing: "border-box"
      }}
    >
      <div className="card-body" style={{ padding: width600 ? "12px" : "15px" }}>
        <div className={`d-flex ${width600 ? "flex-column" : "justify-content-center"}`} style={{ gap: width600 ? "12px" : "30px", alignItems: width600 ? "center" : "flex-start" }}>
          {/* Avatar Skeleton */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div
              style={{
                width: width600 ? "70px" : "80px",
                height: width600 ? "70px" : "80px",
                border: "2px solid rgb(0, 0, 128)",
                borderRadius: "5px",
                padding: "5px",
                marginBottom: "10px",
                boxSizing: "border-box"
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
                width: width600 ? "90px" : "100px",
                height: width600 ? "14px" : "16px",
                background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
                backgroundSize: "200% 100%",
                animation: "skeleton-loading 1.5s ease-in-out infinite",
                borderRadius: "4px"
              }}
            />
          </div>

          {/* Details Skeleton */}
          <div className={`d-flex flex-column ${width600 ? "" : "justify-content-center"}`} style={{ gap: width600 ? "8px" : "12px", width: width600 ? "100%" : "auto" }}>
            <div className={`d-flex ${width600 ? "flex-column" : ""}`} style={{ gap: "8px" }}>
              <div
                style={{
                  width: width600 ? "60px" : "50px",
                  height: width600 ? "14px" : "16px",
                  background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
                  backgroundSize: "200% 100%",
                  animation: "skeleton-loading 1.5s ease-in-out infinite",
                  borderRadius: "4px"
                }}
              />
              <div
                style={{
                  width: width600 ? "120px" : "100px",
                  height: width600 ? "14px" : "16px",
                  background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
                  backgroundSize: "200% 100%",
                  animation: "skeleton-loading 1.5s ease-in-out infinite",
                  borderRadius: "4px"
                }}
              />
            </div>
            <div className={`d-flex ${width600 ? "flex-column" : ""}`} style={{ gap: "8px" }}>
              <div
                style={{
                  width: width600 ? "140px" : "150px",
                  height: width600 ? "14px" : "16px",
                  background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
                  backgroundSize: "200% 100%",
                  animation: "skeleton-loading 1.5s ease-in-out infinite",
                  borderRadius: "4px"
                }}
              />
              <div
                style={{
                  width: width600 ? "100px" : "120px",
                  height: width600 ? "14px" : "16px",
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

