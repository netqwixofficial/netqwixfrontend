import Draggable from "react-draggable";
import { Point, Utils } from "../../../utils/utils";
import React, { useEffect, useState, useRef } from "react";
import { useCallback } from "react";
import { AccountType } from "../../common/constants";
import { ChevronRight } from "react-feather";

export const UserBox = ({
  onClick,
  selected,
  id,
  notSelected,
  videoRef,
  user,
  stream,
  isStreamOff,
  selectedUser,
  isLandscape,
  muted,
  onHide,
  onRestore,
  isHidden,
  videoType
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  const setVideoRef = useCallback(
    (node) => {
      if (node) {
        videoRef.current = node;
        if (stream) {
          videoRef.current.srcObject = stream;
        }
      }
    },
    [stream]
  );
  useEffect(() => {
     
    if (videoRef?.current) {
      videoRef.current.srcObject = stream;
    }
  }, [videoRef, stream, isStreamOff, selectedUser]);

  const handleDrag = (e, data) => {
    setIsDragging(true);
    setPosition({ x: data.x, y: data.y });
  };

  const handleStop = (e, data) => {
    setIsDragging(false);
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Check if dragged to extreme edges
    const edgeThreshold = 30;
    const isAtLeftEdge = data.x < -rect.width + edgeThreshold;
    const isAtRightEdge = data.x > viewportWidth - edgeThreshold;
    const isAtTopEdge = data.y < -rect.height + edgeThreshold;
    const isAtBottomEdge = data.y > viewportHeight - edgeThreshold;
    
    const isAtEdge = isAtLeftEdge || isAtRightEdge || isAtTopEdge || isAtBottomEdge;

    if (isAtEdge && onHide && videoType) {
      onHide(videoType);
      let hideX = data.x;
      let hideY = data.y;
      
      if (isAtLeftEdge) {
        hideX = -rect.width + 5;
      } else if (isAtRightEdge) {
        hideX = viewportWidth - 5;
      }
      
      if (isAtTopEdge) {
        hideY = -rect.height + 5;
      } else if (isAtBottomEdge) {
        hideY = viewportHeight - 5;
      }
      
      setPosition({ x: hideX, y: hideY });
    } else {
      if (!isHidden) {
        setPosition({ x: 0, y: 0 });
      }
    }
  };

  const handleRestore = () => {
    if (onRestore && videoType) {
      onRestore(videoType);
      setPosition({ x: 0, y: 0 });
    }
  };

  const handleBoxClick = useCallback(() => {
    if (onClick && id && !isDragging && !selected) {
      onClick(id);
    }
  }, [onClick, id, isDragging, selected]);

  const clickObserver = useClickObserver(handleBoxClick);

  if (isHidden && videoType) {
    const viewportWidth = window.innerWidth;
    const isAtLeftEdge = position.x < 0;
    const isAtRightEdge = position.x > viewportWidth / 2;
    
    return (
      <div
        ref={containerRef}
        className="video-restore-indicator hide-in-screenshot"
        onClick={handleRestore}
        style={{
          position: "fixed",
          left: isAtLeftEdge ? "0" : "auto",
          right: isAtRightEdge ? "0" : "auto",
          top: `${position.y}px`,
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          gap: "4px",
          background: "rgba(0, 0, 0, 0.6)",
          padding: "4px 8px",
          borderRadius: isAtLeftEdge ? "0 8px 8px 0" : "8px 0 0 8px",
          cursor: "pointer",
          transition: "all 0.3s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(0, 0, 0, 0.8)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(0, 0, 0, 0.6)";
        }}
      >
        {isAtLeftEdge ? (
          <ChevronRight size={16} color="white" />
        ) : (
          <ChevronRight size={16} color="white" style={{ transform: "rotate(180deg)" }} />
        )}
        <div className="profile-box" style={{ width: "80px", height: "120px", margin: 0 }}>
          {!isStreamOff ? (
            <video
              playsInline
              autoPlay
              muted={muted}
              ref={setVideoRef}
              style={{
                height: "100%",
                width: "100%",
                position: "absolute",
                objectFit: "cover",
                borderRadius: "8px",
              }}
            ></video>
          ) : user?.profile_picture ? (
            <img
              src={Utils.getImageUrlOfS3(user?.profile_picture)}
              style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "8px" }}
            />
          ) : (
            <img
              src="/user.jpg"
              alt="Profile"
              style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "8px" }}
            />
          )}
        </div>
      </div>
    );
  }

  const boxContent = (
    <div
      ref={containerRef}
      className={`${false ? "" : "profile-box"} ${
        notSelected && (selected ? "selected" : "hidden")
      }`}
      style={{
        position: "relative",
        width: selected ? "100vw" : (isLandscape ? "50vw" : "95vw"),
        cursor: selected && onHide ? (isDragging ? "grabbing" : "grab") : "pointer",
        transition: isDragging ? "none" : "all 0.2s ease",
      }}
      onClick={() => !selected && onClick(id)}
    >
      {!isStreamOff ? (
        <video
          playsInline
          autoPlay
          muted={muted}
          ref={setVideoRef}
          style={{
            height: "100%",
            width: "100%",
            position: "absolute",
            objectFit: "cover",
            borderRadius: "20px",
          }}
        ></video>
      ) : user?.profile_picture ? (
        <>
          <img
            src={Utils.getImageUrlOfS3(user?.profile_picture)}
            className={`profile-img `}
          />
          <p className="profile-name">{user?.fullname}</p>
        </>
      ) : (
        <>
          <img src="/user.jpg" alt="Large Profile" className={`profile-img `} />
          <p className="profile-name">{user?.fullname}</p>
        </>
      )}
    </div>
  );

  // If selected and has hide/restore handlers, make it draggable
  if (selected && onHide && videoType) {
    return (
      <Draggable
        position={position}
        onStart={clickObserver.onStart}
        onDrag={handleDrag}
        onStop={(e, data) => {
          clickObserver.onStop(e, data);
          handleStop(e, data);
        }}
        bounds="body"
      >
        {boxContent}
      </Draggable>
    );
  }

  return boxContent;
};

function useClickObserver(callback) {
  const dragStartPosRef = React.useRef(new Point());
  const onStart = (_, data) => {
    dragStartPosRef.current = new Point(data.x, data.y);
  };
  const onStop = (_, data) => {
    const dragStopPoint = new Point(data.x, data.y);
    if (Point.dist(dragStartPosRef.current, dragStopPoint) < 5) {
      callback();
    }
  };
  return { onStart, onStop };
}

export const UserBoxMini = ({
  name,
  onClick,
  selected,
  id,
  videoRef,
  user,
  stream,
  isStreamOff,
  zIndex,
  bottom,
  muted,
  onHide,
  onRestore,
  isHidden,
  videoType // 'student' | 'teacher'
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  const handleBoxClick = useCallback(() => {
    if (onClick && id && !isDragging) {
      onClick(id);
    }
  }, [onClick, id, isDragging]);

  const clickObserver = useClickObserver(handleBoxClick);

  const setVideoRef = useCallback(
    (node) => {
      if (node) {
        videoRef.current = node;
        if (stream) {
          videoRef.current.srcObject = stream;
        }
      }
    },
    [stream]
  );

  useEffect(() => {
    if (videoRef?.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [videoRef, stream, isStreamOff, isHidden]);

  const handleDrag = (e, data) => {
    setIsDragging(true);
    setPosition({ x: data.x, y: data.y });
  };

  const handleStop = (e, data) => {
    setIsDragging(false);
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Check if dragged to extreme edges (left or right edge with smaller threshold)
    // For mobile, check if dragged to left or right edge
    const edgeThreshold = 30; // Smaller threshold for edge detection
    const isAtLeftEdge = data.x < -rect.width + edgeThreshold;
    const isAtRightEdge = data.x > viewportWidth - edgeThreshold;
    const isAtTopEdge = data.y < -rect.height + edgeThreshold;
    const isAtBottomEdge = data.y > viewportHeight - edgeThreshold;
    
    // Hide if dragged to any extreme edge
    const isAtEdge = isAtLeftEdge || isAtRightEdge || isAtTopEdge || isAtBottomEdge;

    if (isAtEdge && onHide) {
      onHide(videoType);
      // Position it at the edge where it was dragged
      let hideX = data.x;
      let hideY = data.y;
      
      // Snap to the nearest edge
      if (isAtLeftEdge) {
        hideX = -rect.width + 5; // Show just a small part on the left
      } else if (isAtRightEdge) {
        hideX = viewportWidth - 5; // Show just a small part on the right
      }
      
      if (isAtTopEdge) {
        hideY = -rect.height + 5;
      } else if (isAtBottomEdge) {
        hideY = viewportHeight - 5;
      }
      
      setPosition({ x: hideX, y: hideY });
    } else {
      // Reset to original position if not hidden
      if (!isHidden) {
        setPosition({ x: 0, y: 0 });
      }
    }
  };

  const handleRestore = () => {
    if (onRestore) {
      onRestore(videoType);
      setPosition({ x: 0, y: 0 });
    }
  };

  if (isHidden) {
    // Determine which edge the video is hidden at
    const viewportWidth = window.innerWidth;
    const isAtLeftEdge = position.x < 0;
    const isAtRightEdge = position.x > viewportWidth / 2;
    
    return (
      <div
        ref={containerRef}
        className="video-restore-indicator hide-in-screenshot"
        onClick={handleRestore}
        style={{
          position: "fixed",
          left: isAtLeftEdge ? "0" : "auto",
          right: isAtRightEdge ? "0" : "auto",
          top: `${position.y}px`,
          zIndex: zIndex ?? 1000,
          display: "flex",
          alignItems: "center",
          gap: "4px",
          background: "rgba(0, 0, 0, 0.6)",
          padding: "4px 8px",
          borderRadius: isAtLeftEdge ? "0 8px 8px 0" : "8px 0 0 8px",
          cursor: "pointer",
          transition: "all 0.3s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(0, 0, 0, 0.8)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(0, 0, 0, 0.6)";
        }}
      >
        {isAtLeftEdge ? (
          <ChevronRight size={16} color="white" />
        ) : (
          <ChevronRight size={16} color="white" style={{ transform: "rotate(180deg)" }} />
        )}
        <div className="profile-box mini" style={{ width: "50px", height: "75px", margin: 0 }}>
          {!isStreamOff ? (
            <video
              playsInline
              autoPlay
              muted={muted}
              ref={setVideoRef}
              style={{
                height: "100%",
                width: "100%",
                position: "absolute",
                objectFit: "cover",
                borderRadius: "8px",
              }}
            ></video>
          ) : user?.profile_picture ? (
            <img
              src={Utils.getImageUrlOfS3(user?.profile_picture)}
              className={`profile-img `}
              style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "8px" }}
            />
          ) : (
            <img
              src="/user.jpg"
              alt="Profile"
              style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "8px" }}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <Draggable
      position={position}
      onStart={clickObserver.onStart}
      onDrag={handleDrag}
      onStop={(e, data) => {
        // Preserve original click-vs-drag behaviour
        clickObserver.onStop(e, data);
        // Also run drag-end logic for hide / reset
        handleStop(e, data);
      }}
      bounds="body"
    >
      <div 
        ref={containerRef}
        className={`profile-box mini hide-in-screenshot`} 
        style={{
          zIndex: zIndex ?? 100,
          bottom: bottom ?? 50,
          cursor: isDragging ? "grabbing" : "grab",
          transition: isDragging ? "none" : "all 0.2s ease",
        }}
      >
        {!isStreamOff ? (
          <video
            playsInline
            autoPlay
            muted={muted}
            ref={setVideoRef}
            style={{
              height: "100%",
              width: "100%",
              position: "absolute",
              objectFit: "cover",
              borderRadius: "20px",
            }}
          ></video>
        ) : user?.profile_picture ? (
          <>
            <img
              src={Utils.getImageUrlOfS3(user?.profile_picture)}
              className={`profile-img `}
            />
            <p className="profile-name">{user?.fullname}</p>
          </>
        ) : (
          <>
            <img
              src="/user.jpg"
              alt="Large Profile"
              className={`profile-img `}
            />
            <p className="profile-name">{name}</p>
          </>
        )}
      </div>
    </Draggable>
  );
};

export const VideoMiniBox = ({ onClick, id, clips, bottom, onHide, onRestore, isHidden }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  const handleBoxClick = useCallback(() => {
    if (onClick && !isDragging) {
      onClick(id);
    }
  }, [onClick, id, isDragging]);

  const clickObserver = useClickObserver(handleBoxClick);

  const handleDrag = (e, data) => {
    setIsDragging(true);
    setPosition({ x: data.x, y: data.y });
  };

  const handleStop = (e, data) => {
    setIsDragging(false);
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Check if dragged to extreme edges (left or right edge with smaller threshold)
    const edgeThreshold = 30; // Smaller threshold for edge detection
    const isAtLeftEdge = data.x < -rect.width + edgeThreshold;
    const isAtRightEdge = data.x > viewportWidth - edgeThreshold;
    const isAtTopEdge = data.y < -rect.height + edgeThreshold;
    const isAtBottomEdge = data.y > viewportHeight - edgeThreshold;
    
    // Hide if dragged to any extreme edge
    const isAtEdge = isAtLeftEdge || isAtRightEdge || isAtTopEdge || isAtBottomEdge;

    if (isAtEdge && onHide) {
      onHide('clips');
      // Position it at the edge where it was dragged
      let hideX = data.x;
      let hideY = data.y;
      
      // Snap to the nearest edge
      if (isAtLeftEdge) {
        hideX = -rect.width + 5; // Show just a small part on the left
      } else if (isAtRightEdge) {
        hideX = viewportWidth - 5; // Show just a small part on the right
      }
      
      if (isAtTopEdge) {
        hideY = -rect.height + 5;
      } else if (isAtBottomEdge) {
        hideY = viewportHeight - 5;
      }
      
      setPosition({ x: hideX, y: hideY });
    } else {
      // Reset to original position if not hidden
      if (!isHidden) {
        setPosition({ x: 0, y: 0 });
      }
    }
  };

  const handleRestore = () => {
    if (onRestore) {
      onRestore('clips');
      setPosition({ x: 0, y: 0 });
    }
  };

  if (isHidden) {
    // Determine which edge the video is hidden at
    const viewportWidth = window.innerWidth;
    const isAtLeftEdge = position.x < 0;
    const isAtRightEdge = position.x > viewportWidth / 2;
    
    return (
      <div
        ref={containerRef}
        className="video-restore-indicator hide-in-screenshot"
        onClick={handleRestore}
        style={{
          position: "fixed",
          left: isAtLeftEdge ? "0" : "auto",
          right: isAtRightEdge ? "0" : "auto",
          top: `${position.y}px`,
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          gap: "4px",
          background: "rgba(0, 0, 0, 0.6)",
          padding: "4px 8px",
          borderRadius: isAtLeftEdge ? "0 8px 8px 0" : "8px 0 0 8px",
          cursor: "pointer",
          transition: "all 0.3s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "rgba(0, 0, 0, 0.8)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "rgba(0, 0, 0, 0.6)";
        }}
      >
        {isAtLeftEdge ? (
          <ChevronRight size={16} color="white" />
        ) : (
          <ChevronRight size={16} color="white" style={{ transform: "rotate(180deg)" }} />
        )}
        <div className="profile-box mini-landscape" style={{ width: "70px", height: "70px", margin: 0 }}>
          {clips.map((clip, idx) => (
            <img 
              key={idx}
              src={Utils?.generateThumbnailURL(clip)} 
              style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "8px" }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <Draggable
      position={position}
      onStart={clickObserver.onStart}
      onDrag={handleDrag}
      onStop={(e, data) => {
        // Preserve original click-vs-drag behaviour
        clickObserver.onStop(e, data);
        // Also run drag-end logic for hide / reset
        handleStop(e, data);
      }}
      bounds="body"
    >
      <div
        ref={containerRef}
        className={`profile-box mini-landscape hide-in-screenshot`}
        style={{
          zIndex: 5,
          bottom: bottom ?? 50,
          cursor: isDragging ? "grabbing" : "grab",
          transition: isDragging ? "none" : "all 0.2s ease",
        }}
      >
        {clips.map((clip, idx) => (
          <img key={idx} src={Utils?.generateThumbnailURL(clip)} />
        ))}
      </div>
    </Draggable>
  );
};
