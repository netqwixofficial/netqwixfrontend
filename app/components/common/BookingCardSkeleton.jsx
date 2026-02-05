import React from 'react';

/**
 * BookingCardSkeleton - Skeleton loader for booking cards
 */
const BookingCardSkeleton = () => {
  return (
    <div
      className="card mb-4 mt-5 trainer-bookings-card"
      style={{
        borderRadius: "8px",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        border: "1px solid #e0e0e0",
        overflow: "hidden"
      }}
    >
      <div className="card-body" style={{ padding: "20px" }}>
        <div className="row">
          <div className="col">
            <div className="d-flex align-items-center" style={{ gap: "8px", marginBottom: "12px" }}>
              <div
                style={{
                  width: "80px",
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
          <div className="col">
            <div className="d-flex align-items-center" style={{ gap: "8px", marginBottom: "12px" }}>
              <div
                style={{
                  width: "60px",
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
          </div>
        </div>
        <div className="row" style={{ marginTop: "12px" }}>
          <div className="col">
            <div className="d-flex align-items-center" style={{ gap: "8px", marginBottom: "12px" }}>
              <div
                style={{
                  width: "90px",
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
          <div className="col">
            <div className="d-flex align-items-center" style={{ gap: "8px" }}>
              <div
                style={{
                  width: "60px",
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

export default BookingCardSkeleton;

