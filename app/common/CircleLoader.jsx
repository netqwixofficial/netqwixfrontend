import React from "react";

/**
 * Reusable circular loader.
 *
 * - Use fullScreen={true} for a full-viewport overlay (like a page loader).
 * - Use inline (default) inside buttons, cards, sections, etc.
 *
 * Example:
 *   <CircleLoader size={40} />
 *   <CircleLoader fullScreen size={60} message="Loading dashboard..." />
 */
const CircleLoader = ({ size = 50, fullScreen = false, message }) => {
  const loader = (
    <div
      className="nq-circle-loader"
      style={{ width: size, height: size }}
    />
  );

  if (!fullScreen) {
    return loader;
  }

  return (
    <div className="nq-circle-loader-overlay">
      {loader}
      {message && (
        <p className="nq-circle-loader-message">
          {message}
        </p>
      )}
    </div>
  );
};

export default CircleLoader;


