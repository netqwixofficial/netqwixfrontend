import { AnimatePresence, motion } from "framer-motion";
import { useState, useEffect } from "react";
import {
  FaPlay,
  FaPause,
  FaVolumeUp,
  FaVolumeMute,
  FaExpand,
  FaCompress,
  FaVolumeDown,
  FaChevronDown,
  FaChevronUp,
  FaChevronRight,
  FaChevronLeft,
} from "react-icons/fa";
import { useAppSelector } from "../../store";
import { authState } from "../auth/auth.slice";
import { AccountType } from "../../common/constants";

const CustomVideoControls = ({
  isPlaying,
  togglePlayPause,
  volume,
  changeVolume,
  videoRef,
  videoRef2,
  handleSeek,
  handleSeekMouseDown,
  handleSeekMouseUp,
  isFullscreen,
  toggleFullscreen,
  setIsPlaying,
  isLock,
  currentTime,
  setCurrentTime,
  lockPoint,
  // When provided, this controls visibility from the parent (per-video)
  controlsVisible = true,
}) => {
  const { accountType } = useAppSelector(authState);
  const [showVolume, setShowVolume] = useState(false);

  useEffect(() => {
    const handleEnded = () => setIsPlaying(false);
    const handleUpdate = () => setCurrentTime(videoRef?.current?.currentTime);
    if (videoRef?.current) {
      videoRef.current.addEventListener("ended", handleEnded);
      videoRef.current.addEventListener("timeupdate", handleUpdate);
    }
    return () => {
      if (videoRef.current) {
        videoRef.current.removeEventListener("ended", handleEnded);
        videoRef.current.removeEventListener("timeupdate", handleUpdate);
      }
    };
  }, [videoRef, setIsPlaying, setCurrentTime]);

  //   const GetVolumeIcon = () => {
  //     if (volume === 0) return <FaVolumeMute />;
  //     if (volume < 0.6) return <FaVolumeDown />;
  //     return <FaVolumeUp />;
  //   };

   
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "6px",
        width: "100%",
        padding: "4px 8px",
        pointerEvents: "auto",
        boxSizing: "border-box",
      }}
      className="hide-in-screenshot clip-video-controls-inline"
    >
      {/* Toggle Controls Button */}

      <AnimatePresence>
        {controlsVisible && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="custom-controls"
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "rgba(0, 0, 0, 0.6)",
              padding: "6px 12px",
              width: "100%",
              gap: "10px",
              borderRadius: "8px",
              border: "1px solid rgba(255, 255, 255, 0.15)",
            }}
          >
            {/* Play/Pause Button */}
            <button
              onClick={togglePlayPause}
              style={{
                background: "rgba(255, 255, 255, 0.1)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "50%",
                color: "white",
                fontSize: "14px",
                cursor: accountType === AccountType.TRAINEE ? "not-allowed" : "pointer",
                width: "32px",
                height: "32px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.3s ease",
                opacity: accountType === AccountType.TRAINEE ? 0.5 : 1,
                flexShrink: 0,
              }}
              disabled={accountType === AccountType.TRAINEE}
              onMouseEnter={(e) => {
                if (accountType !== AccountType.TRAINEE) {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
                  e.currentTarget.style.transform = "scale(1.1)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              {isPlaying ? <FaPause size={14} /> : <FaPlay size={14} />}
            </button>

            {/* Volume Control */}
            {/* <div style={{ position: "relative" }}>
                  <button
                    onClick={() => setShowVolume(!showVolume)}
                    style={{ background: "none", border: "none", color: "white", fontSize: "22px", cursor: "pointer" }}
                  >
                    {<GetVolumeIcon />}
                  </button>
                  {showVolume && (
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.01"
                      value={volume}
                      onChange={changeVolume}
                      style={{
                        position: "absolute",
                        left: "50%",
                        transform: "translateX(-50%)",
                        bottom: "40px",
                        width: "100px",
                        cursor: "pointer",
                      }}
                    />
                  )}
                </div> */}

            {/* Progress Bar */}
            {(() => {
              const formatSecondsToLabel = (seconds) => {
                if (typeof seconds !== "number" || Number.isNaN(seconds) || seconds < 0) {
                  return "--:--";
                }
                const mins = Math.floor(seconds / 60);
                const secs = Math.floor(seconds % 60);
                const mm = String(mins).padStart(2, "0");
                const ss = String(secs).padStart(2, "0");
                return `${mm}:${ss}`;
              };

              const currentValue = isLock
                ? Math.max(
                    (videoRef.current?.duration || 0) >
                    (videoRef2?.current?.duration || 0)
                  ? videoRef.current?.currentTime || 0
                      : videoRef2?.current?.currentTime || 0,
                    lockPoint
                  )
                : videoRef.current?.currentTime || 0;
              
              const maxValue = isLock
                ? Math.max(
                    videoRef.current?.duration || 0,
                    videoRef2?.current?.duration || 0
                  )
                : videoRef.current?.duration || 0 || 100;
              
              // Calculate the relative progress for background styling
              let relativeProgress = 0;
              if (maxValue > 0) {
                if (isLock) {
                  const denom = Math.max(0.0001, maxValue - lockPoint);
                  relativeProgress = ((currentValue - lockPoint) / denom) * 100;
                } else {
                  relativeProgress = (currentValue / maxValue) * 100;
                }
              }
               
              return (
                <>
                {/* Time labels */}
                <span
                  style={{
                    fontSize: 11,
                    color: "#e0e0e0",
                    minWidth: 48,
                    textAlign: "right",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {formatSecondsToLabel(currentValue)}
                </span>
                <input
                  type="range"
                  min={isLock ? lockPoint : 0}
                  step="0.01"
                  disabled={accountType === AccountType.TRAINEE}
                  value={currentValue}
                  max={maxValue}
                  onChange={handleSeek}
                  style={{
                    flex: 1,
                    cursor: accountType === AccountType.TRAINEE ? "not-allowed" : "pointer",
                    height: "6px",
                    appearance: "none",
                    background: `linear-gradient(to right, #4a90e2 ${relativeProgress}%, rgba(255, 255, 255, 0.3) ${relativeProgress}%)`,
                    borderRadius: "10px",
                    outline: "none",
                    transition: "background 0.3s ease",
                    opacity: accountType === AccountType.TRAINEE ? 0.5 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (accountType !== AccountType.TRAINEE) {
                      e.currentTarget.style.height = "8px";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.height = "6px";
                  }}
                />
                  <span
                    style={{
                      fontSize: 11,
                      color: "#b0b0b0",
                      minWidth: 48,
                      textAlign: "left",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatSecondsToLabel(maxValue || 0)}
                  </span>
                  {isLock && (
                    <span
                      style={{
                        marginLeft: 12,
                        fontSize: 11,
                        color: "#b0b0b0",
                        whiteSpace: "nowrap",
                        padding: "4px 8px",
                        background: "rgba(255, 255, 255, 0.1)",
                        borderRadius: "12px",
                        border: "1px solid rgba(255, 255, 255, 0.2)",
                      }}
                    >
                      🔒 {formatSecondsToLabel(lockPoint)}
                    </span>
                  )}
                </>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomVideoControls;
