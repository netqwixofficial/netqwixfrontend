import React from 'react';

/**
 * TrainerCardSkeleton - Skeleton loader for trainer cards in banner slider
 */
const TrainerCardSkeleton = ({ width600 = false }) => {
  return (
    <div
      className="trainer-card"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: width600 ? "10px" : "12px",
        justifyContent: "flex-start",
        alignItems: "center",
        padding: width600 ? "14px 10px" : "18px 16px",
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
        height: "auto",
        minHeight: width600 ? "240px" : "260px",
        maxHeight: width600 ? "280px" : "300px",
        backgroundColor: "#fff",
        borderRadius: "8px",
        border: "1px solid #e0e0e0",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
        touchAction: "manipulation"
      }}
    >
      {/* Avatar Skeleton */}
      <div
        style={{
          width: width600 ? "90px" : "110px",
          height: width600 ? "90px" : "110px",
          border: width600 ? "3px solid rgb(0, 0, 128)" : "4px solid rgb(0, 0, 128)",
          borderRadius: "50%",
          padding: "0",
          flexShrink: 0,
          boxSizing: "border-box",
          backgroundColor: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          marginBottom: width600 ? "6px" : "8px",
          position: "relative"
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

      {/* Card Info Skeleton */}
      <div
        className="card-info"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: width600 ? "6px" : "8px",
          width: "100%",
          alignItems: "center",
          textAlign: "center",
          padding: "0",
          flex: "1",
          justifyContent: "flex-start"
        }}
      >
        {/* Name Skeleton */}
        <div
          style={{
            width: "80%",
            height: width600 ? "16px" : "18px",
            background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
            backgroundSize: "200% 100%",
            animation: "skeleton-loading 1.5s ease-in-out infinite",
            borderRadius: "4px"
          }}
        />

        {/* Price Skeleton */}
        <div
          style={{
            width: "60%",
            height: width600 ? "14px" : "16px",
            background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
            backgroundSize: "200% 100%",
            animation: "skeleton-loading 1.5s ease-in-out infinite",
            borderRadius: "4px"
          }}
        />

        {/* Button Skeleton */}
        <div
          style={{
            marginTop: width600 ? "8px" : "10px",
            width: "100%",
            height: width600 ? "40px" : "44px",
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

export default TrainerCardSkeleton;

