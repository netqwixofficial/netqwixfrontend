import React from 'react';
import { useMediaQuery } from '../../hook/useMediaQuery';

/**
 * ReportsSkeleton - Skeleton loader for reports/saved lessons
 */
const ReportsSkeleton = () => {
  const width500 = useMediaQuery(500);
  const width768 = useMediaQuery(768);

  const getGridColumns = () => {
    if (width500) return "repeat(1, 1fr)";
    if (width768) return "repeat(2, 1fr)";
    return "repeat(3, 1fr)";
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
      <div style={{
        display: "grid",
        gridTemplateColumns: getGridColumns(),
        gap: width500 ? "12px" : "16px",
        padding: width500 ? "12px" : "20px",
        width: "100%",
        boxSizing: "border-box"
      }}>
        {Array(6).fill(0).map((_, index) => (
          <div
            key={`report-skeleton-${index}`}
            style={{
              borderRadius: "8px",
              background: "#fff",
              border: "1px solid #e0e0e0",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              padding: width500 ? "12px" : "16px",
              minHeight: "200px",
              display: "flex",
              flexDirection: "column",
              gap: "12px"
            }}
          >
            {/* Title skeleton */}
            <div
              style={{
                width: "70%",
                height: "20px",
                background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
                backgroundSize: "200% 100%",
                animation: "skeleton-loading 1.5s ease-in-out infinite",
                borderRadius: "4px"
              }}
            />
            {/* Description skeleton */}
            <div
              style={{
                width: "100%",
                height: "16px",
                background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
                backgroundSize: "200% 100%",
                animation: "skeleton-loading 1.5s ease-in-out infinite",
                borderRadius: "4px"
              }}
            />
            <div
              style={{
                width: "85%",
                height: "16px",
                background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
                backgroundSize: "200% 100%",
                animation: "skeleton-loading 1.5s ease-in-out infinite",
                borderRadius: "4px"
              }}
            />
            {/* Date skeleton */}
            <div
              style={{
                width: "50%",
                height: "14px",
                background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
                backgroundSize: "200% 100%",
                animation: "skeleton-loading 1.5s ease-in-out infinite",
                borderRadius: "4px",
                marginTop: "auto"
              }}
            />
          </div>
        ))}
      </div>
    </>
  );
};

export default ReportsSkeleton;

