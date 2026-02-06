import React from 'react';
import { useMediaQuery } from '../../hook/useMediaQuery';

/**
 * ClipsSkeleton - Skeleton loader for clips grid
 */
const ClipsSkeleton = () => {
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
            key={`clip-skeleton-${index}`}
            style={{
              aspectRatio: "16/9",
              borderRadius: "8px",
              background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
              backgroundSize: "200% 100%",
              animation: "skeleton-loading 1.5s ease-in-out infinite",
              border: "1px solid #e0e0e0",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              overflow: "hidden",
              position: "relative"
            }}
          >
            {/* Play button skeleton */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "50px",
                height: "50px",
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.8)",
                border: "2px solid #000080"
              }}
            />
          </div>
        ))}
      </div>
    </>
  );
};

export default ClipsSkeleton;

