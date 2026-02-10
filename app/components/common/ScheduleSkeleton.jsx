import React from 'react';
import { useMediaQuery } from '../../hook/useMediaQuery';

/**
 * ScheduleSkeleton - Skeleton loader for schedule page
 */
const ScheduleSkeleton = () => {
  const width600 = useMediaQuery(600);
  const width900 = useMediaQuery(900);

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
        .skeleton-item {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 200% 100%;
          animation: skeleton-loading 1.5s ease-in-out infinite;
          border-radius: 8px;
        }
      `}</style>
      <div style={{
        padding: width600 ? "16px" : width900 ? "20px" : "24px",
        maxWidth: "1400px",
        margin: "0 auto",
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%)"
      }}>
        {/* Header Skeleton */}
        <div style={{
          marginBottom: width600 ? "24px" : width900 ? "28px" : "32px",
          padding: width600 ? "16px" : "20px",
          backgroundColor: "#fff",
          borderRadius: "16px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
          border: "1px solid #e8ecf0"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: width600 ? "12px" : "16px" }}>
            <div className="skeleton-item" style={{
              width: width600 ? "48px" : "56px",
              height: width600 ? "48px" : "56px",
              borderRadius: "14px",
              flexShrink: 0
            }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton-item" style={{
                height: width600 ? "22px" : width900 ? "26px" : "30px",
                width: width600 ? "180px" : width900 ? "220px" : "260px",
                marginBottom: "8px"
              }} />
              <div className="skeleton-item" style={{
                height: "14px",
                width: width600 ? "200px" : width900 ? "280px" : "340px",
                opacity: 0.7
              }} />
            </div>
          </div>
        </div>

        {/* Settings Section Skeleton */}
        <div style={{
          backgroundColor: "#fff",
          borderRadius: "16px",
          padding: width600 ? "20px" : width900 ? "24px" : "28px",
          marginBottom: width600 ? "24px" : width900 ? "28px" : "32px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
          border: "1px solid #e8ecf0"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: width600 ? "20px" : "24px", paddingBottom: width600 ? "16px" : "20px", borderBottom: "2px solid #f0f4ff" }}>
            <div className="skeleton-item" style={{
              width: width600 ? "40px" : "44px",
              height: width600 ? "40px" : "44px",
              borderRadius: "12px",
              flexShrink: 0
            }} />
            <div className="skeleton-item" style={{
              height: width600 ? "18px" : width900 ? "20px" : "22px",
              width: "120px"
            }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: width600 ? "1fr" : width900 ? "1fr 1fr" : "1fr 1fr", gap: width600 ? "20px" : "24px" }}>
            <div>
              <div className="skeleton-item" style={{
                height: "14px",
                width: "90px",
                marginBottom: "12px"
              }} />
              <div className="skeleton-item" style={{
                height: width600 ? "44px" : "48px",
                width: "100%",
                borderRadius: "12px"
              }} />
            </div>
            <div>
              <div className="skeleton-item" style={{
                height: "14px",
                width: "140px",
                marginBottom: "12px"
              }} />
              <div className="skeleton-item" style={{
                height: width600 ? "44px" : "48px",
                width: "100%",
                borderRadius: "12px"
              }} />
            </div>
          </div>
        </div>

        {/* Days Section Skeleton */}
        <div style={{
          backgroundColor: "#fff",
          borderRadius: "16px",
          padding: width600 ? "20px" : width900 ? "24px" : "28px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
          border: "1px solid #e8ecf0"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: width600 ? "24px" : "28px", paddingBottom: width600 ? "18px" : "22px", borderBottom: "2px solid #f0f4ff" }}>
            <div className="skeleton-item" style={{
              width: width600 ? "40px" : "44px",
              height: width600 ? "40px" : "44px",
              borderRadius: "12px",
              flexShrink: 0
            }} />
            <div className="skeleton-item" style={{
              height: width600 ? "18px" : width900 ? "20px" : "22px",
              width: "180px"
            }} />
          </div>
          
          {/* Day items skeleton */}
          {Array(7).fill(0).map((_, index) => (
            <div
              key={`day-skeleton-${index}`}
              style={{
                display: "flex",
                flexDirection: width600 ? "column" : "row",
                alignItems: width600 ? "flex-start" : "center",
                justifyContent: "space-between",
                padding: width600 ? "18px 0" : width900 ? "20px 0" : "22px 0",
                borderBottom: index < 6 ? "1px solid #e8eaf0" : "none",
                gap: width600 ? "16px" : width900 ? "18px" : "24px"
              }}
            >
              {/* Day name */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: width600 ? "100%" : width900 ? "90px" : "110px", flexShrink: 0 }}>
                <div className="skeleton-item" style={{
                  width: width600 ? "40px" : "48px",
                  height: width600 ? "40px" : "48px",
                  borderRadius: "10px",
                  flexShrink: 0
                }} />
                <div className="skeleton-item" style={{
                  height: "18px",
                  width: width600 ? "80px" : "100px"
                }} />
              </div>
              
              {/* Time slots skeleton */}
              <div style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                flex: 1,
                minWidth: 0
              }}>
                <div style={{
                  display: "flex",
                  gap: width600 ? "10px" : "12px",
                  alignItems: "center",
                  padding: width600 ? "10px" : "12px",
                  backgroundColor: "#f8f9fa",
                  borderRadius: "10px",
                  border: "1px solid #e9ecef"
                }}>
                  <div className="skeleton-item" style={{
                    height: width600 ? "42px" : "48px",
                    flex: width600 ? "1 1 calc(50% - 6px)" : "0 1 auto",
                    minWidth: width600 ? "calc(50% - 6px)" : "150px",
                    borderRadius: "8px"
                  }} />
                  <span style={{ color: "#999", flexShrink: 0 }}>-</span>
                  <div className="skeleton-item" style={{
                    height: width600 ? "42px" : "48px",
                    flex: width600 ? "1 1 calc(50% - 6px)" : "0 1 auto",
                    minWidth: width600 ? "calc(50% - 6px)" : "150px",
                    borderRadius: "8px"
                  }} />
                  <div className="skeleton-item" style={{
                    height: width600 ? "38px" : "42px",
                    width: width600 ? "38px" : "42px",
                    borderRadius: "10px",
                    flexShrink: 0
                  }} />
                </div>
              </div>

              {/* Action buttons skeleton */}
              <div style={{ display: "flex", gap: width600 ? "10px" : "12px", flexShrink: 0, flexDirection: width600 ? "row" : "column" }}>
                <div className="skeleton-item" style={{
                  height: width600 ? "44px" : "48px",
                  width: width600 ? "44px" : "48px",
                  borderRadius: "12px"
                }} />
                <div className="skeleton-item" style={{
                  height: width600 ? "44px" : "48px",
                  width: width600 ? "44px" : "48px",
                  borderRadius: "12px"
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* Save Button Skeleton */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          marginTop: width600 ? "24px" : width900 ? "28px" : "32px",
          padding: width600 ? "0" : "0 20px"
        }}>
          <div className="skeleton-item" style={{
            height: width600 ? "48px" : width900 ? "52px" : "56px",
            width: width600 ? "160px" : width900 ? "180px" : "200px",
            borderRadius: "14px"
          }} />
        </div>
      </div>
    </>
  );
};

export default ScheduleSkeleton;

