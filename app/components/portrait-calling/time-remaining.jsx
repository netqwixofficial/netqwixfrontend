import { useEffect, useRef, useState } from "react";

const FIVE_MINUTES_IN_SECONDS = 5 * 60;
const FIFTEEN_SECONDS_IN_SECONDS = 30;

const formatSecondsToMMSS = (seconds) => {
  if (typeof seconds !== "number" || Number.isNaN(seconds) || seconds < 0) {
    return "--:--";
  }
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const mm = String(mins).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");
  return `${mm}:${ss}`;
};

const TimeRemaining = ({ timeRemaining, bothUsersJoined = false }) => {
  const [timerColor, setTimerColor] = useState("#28a745"); // default green
  const [showFiveMinPopup, setShowFiveMinPopup] = useState(false);
  const [showThirtySecPopup, setShowThirtySecPopup] = useState(false);
  const [displayTime, setDisplayTime] = useState("--:--");

  const lastRemainingSecondsRef = useRef(null);
  const fiveMinTimeoutRef = useRef(null);
  const thirtySecTimeoutRef = useRef(null);

  // Derive remaining seconds from the provided timeRemaining
  useEffect(() => {
    // Clear any active timeouts when dependencies change
    if (fiveMinTimeoutRef.current) {
      clearTimeout(fiveMinTimeoutRef.current);
      fiveMinTimeoutRef.current = null;
    }
    if (thirtySecTimeoutRef.current) {
      clearTimeout(thirtySecTimeoutRef.current);
      thirtySecTimeoutRef.current = null;
    }

    // Reset popups when we get a fresh time or users are not joined
    setShowFiveMinPopup(false);
    setShowThirtySecPopup(false);
    lastRemainingSecondsRef.current = null;

    if (!bothUsersJoined) {
      setTimerColor("#6c757d"); // muted grey while waiting
      setDisplayTime("Waiting for both users...");
      return;
    }

    // Case 1: timeRemaining is a string "HH:MM" → treat as end time
    if (typeof timeRemaining === "string" && timeRemaining.includes(":")) {
      const [endHours, endMinutes] = timeRemaining.split(":").map(Number);
      if (
        Number.isNaN(endHours) ||
        Number.isNaN(endMinutes) ||
        endHours < 0 ||
        endHours > 23 ||
        endMinutes < 0 ||
        endMinutes > 59
      ) {
        setDisplayTime("--:--");
        return;
      }

      const now = new Date();
      const endTime = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        endHours,
        endMinutes
      );

      const updateFromNow = () => {
        const current = new Date();
        const diffMs = endTime - current;
        const remainingSeconds = Math.max(
          0,
          Math.floor(diffMs / 1000)
        );

        // Update display string
        setDisplayTime(formatSecondsToMMSS(remainingSeconds));

        // Dynamic color based on remaining time
        if (remainingSeconds > FIVE_MINUTES_IN_SECONDS) {
          setTimerColor("#28a745"); // green
        } else if (remainingSeconds > 60) {
          setTimerColor("#ff9800"); // orange
        } else {
          setTimerColor("#f44336"); // red
        }

        const previous = lastRemainingSecondsRef.current;
        lastRemainingSecondsRef.current = remainingSeconds;

        // Trigger "5 minutes left" popup once when crossing 5 minutes
        if (
          previous != null &&
          previous > FIVE_MINUTES_IN_SECONDS &&
          remainingSeconds <= FIVE_MINUTES_IN_SECONDS &&
          remainingSeconds > 0
        ) {
          setShowFiveMinPopup(true);
          if (fiveMinTimeoutRef.current) {
            clearTimeout(fiveMinTimeoutRef.current);
          }
          fiveMinTimeoutRef.current = setTimeout(() => {
            setShowFiveMinPopup(false);
            fiveMinTimeoutRef.current = null;
          }, 5000);
        }

        // Trigger "15 seconds left" popup once when crossing 15 seconds
        if (
          previous != null &&
          previous > FIFTEEN_SECONDS_IN_SECONDS &&
          remainingSeconds <= FIFTEEN_SECONDS_IN_SECONDS &&
          remainingSeconds > 0
        ) {
          setShowThirtySecPopup(true);
          if (thirtySecTimeoutRef.current) {
            clearTimeout(thirtySecTimeoutRef.current);
          }
          thirtySecTimeoutRef.current = setTimeout(() => {
            setShowThirtySecPopup(false);
            thirtySecTimeoutRef.current = null;
          }, 3000);
        }
      };

      updateFromNow();
      const intervalId = setInterval(updateFromNow, 1000);

      return () => {
        clearInterval(intervalId);
        if (fiveMinTimeoutRef.current) {
          clearTimeout(fiveMinTimeoutRef.current);
          fiveMinTimeoutRef.current = null;
        }
        if (thirtySecTimeoutRef.current) {
          clearTimeout(thirtySecTimeoutRef.current);
          thirtySecTimeoutRef.current = null;
        }
      };
    }

    // Case 2: timeRemaining is already a number of seconds
    if (typeof timeRemaining === "number") {
      const remainingSeconds = Math.max(0, Math.floor(timeRemaining));

      // Update display string
      setDisplayTime(formatSecondsToMMSS(remainingSeconds));

      // Dynamic color based on remaining time
      if (remainingSeconds > FIVE_MINUTES_IN_SECONDS) {
        setTimerColor("#28a745"); // green
      } else if (remainingSeconds > 60) {
        setTimerColor("#ff9800"); // orange
      } else {
        setTimerColor("#f44336"); // red
      }

      const previous = lastRemainingSecondsRef.current;
      lastRemainingSecondsRef.current = remainingSeconds;

      // Trigger "5 minutes left" popup once when crossing 5 minutes
      if (
        previous != null &&
        previous > FIVE_MINUTES_IN_SECONDS &&
        remainingSeconds <= FIVE_MINUTES_IN_SECONDS &&
        remainingSeconds > 0
      ) {
        setShowFiveMinPopup(true);
        if (fiveMinTimeoutRef.current) {
          clearTimeout(fiveMinTimeoutRef.current);
        }
        fiveMinTimeoutRef.current = setTimeout(() => {
          setShowFiveMinPopup(false);
          fiveMinTimeoutRef.current = null;
        }, 5000);
      }

      // Trigger "15 seconds left" popup once when crossing 15 seconds
      if (
        previous != null &&
        previous > FIFTEEN_SECONDS_IN_SECONDS &&
        remainingSeconds <= FIFTEEN_SECONDS_IN_SECONDS &&
        remainingSeconds > 0
      ) {
        setShowThirtySecPopup(true);
        if (thirtySecTimeoutRef.current) {
          clearTimeout(thirtySecTimeoutRef.current);
        }
        thirtySecTimeoutRef.current = setTimeout(() => {
          setShowThirtySecPopup(false);
          thirtySecTimeoutRef.current = null;
        }, 3000);
      }

      return;
    }

    // Fallback for unexpected type
    setDisplayTime("--:--");
    setTimerColor("#28a745");
  }, [timeRemaining, bothUsersJoined]);

  return (
    <>
      <div 
        className="time-container"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "8px 16px",
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(10px)",
          borderRadius: "25px",
          boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
          border: "1px solid rgba(0, 0, 0, 0.05)",
        }}
      >
        <h3 
          className="label" 
          style={{ 
            margin: 0, 
            fontSize: "14px", 
            fontWeight: "500",
            color: "#666",
          }}
        >
          Time remaining:
        </h3>
        <h3 
          className="value" 
          style={{ 
            margin: 0,
            color: timerColor,
            fontSize: "16px",
            fontWeight: "600",
            fontFamily: "monospace",
            letterSpacing: "1px",
          }}
        >
          {displayTime}
        </h3>
      </div>

      {showFiveMinPopup && (
        <div
          style={{
            position: "fixed",
            bottom: typeof window !== 'undefined' && window.innerWidth <= 768 ? "90px" : "20px", // Higher on mobile for browser UI
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#1e88e5",
            color: "#ffffff",
            padding: "10px 18px",
            borderRadius: "6px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            zIndex: 2000,
            fontSize: "14px",
            maxWidth: "90%",
          }}
        >
          <span>Only 5 minutes left in this session.</span>
          <button
            type="button"
            onClick={() => setShowFiveMinPopup(false)}
            style={{
              background: "transparent",
              border: "none",
              color: "#ffffff",
              cursor: "pointer",
              fontSize: "16px",
              lineHeight: 1,
            }}
            aria-label="Close 5-minute warning"
          >
            ×
          </button>
        </div>
      )}

      {showThirtySecPopup && (
        <div
          style={{
            position: "fixed",
            bottom: typeof window !== 'undefined' && window.innerWidth <= 768 ? "130px" : "60px", // Higher on mobile for browser UI
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#f44336",
            color: "#ffffff",
            padding: "10px 18px",
            borderRadius: "6px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            zIndex: 2000,
            fontSize: "14px",
            maxWidth: "90%",
          }}
        >
          <span>Session ending in about 30 seconds.</span>
          <button
            type="button"
            onClick={() => setShowThirtySecPopup(false)}
            style={{
              background: "transparent",
              border: "none",
              color: "#ffffff",
              cursor: "pointer",
              fontSize: "16px",
              lineHeight: 1,
            }}
            aria-label="Close 30-second warning"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
};

export default TimeRemaining;
