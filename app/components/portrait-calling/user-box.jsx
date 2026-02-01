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
  muted
}) => {
   

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

  return (
    <div
      className={`${false ? "" : "profile-box"} ${
        notSelected && (selected ? "selected" : "hidden")
      }`}
      style={{
        position: "relative",
        width: selected ? "100vw" : (isLandscape ? "50vw" : "95vw")
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

  const handleBoxClick = () => {
    if (onClick && id && !isDragging) {
      onClick(id);
    }
  };

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
    
    // Check if dragged outside viewport (with some threshold)
    const threshold = 50;
    const isOutsideViewport = 
      data.x + rect.width < -threshold ||
      data.x > viewportWidth + threshold ||
      data.y + rect.height < -threshold ||
      data.y > viewportHeight + threshold;

    if (isOutsideViewport && onHide) {
      onHide(videoType);
      // Position it off-screen
      setPosition({ 
        x: viewportWidth + 20, 
        y: Math.max(20, Math.min(data.y, viewportHeight - rect.height - 20))
      });
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
    return (
      <div
        ref={containerRef}
        className="video-restore-indicator hide-in-screenshot"
        onClick={handleRestore}
      >
        <ChevronRight size={20} color="white" />
        <div className="profile-box mini" style={{ width: "60px", height: "90px", margin: 0 }}>
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
      bounds="parent"
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
  const clickObserver = useClickObserver(handleBoxClick);

  const handleBoxClick = () => {
    if (onClick && !isDragging) {
      onClick(id);
    }
  };

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
    
    // Check if dragged outside viewport (with some threshold)
    const threshold = 50;
    const isOutsideViewport = 
      data.x + rect.width < -threshold ||
      data.x > viewportWidth + threshold ||
      data.y + rect.height < -threshold ||
      data.y > viewportHeight + threshold;

    if (isOutsideViewport && onHide) {
      onHide('clips');
      // Position it off-screen
      setPosition({ 
        x: viewportWidth + 20, 
        y: Math.max(20, Math.min(data.y, viewportHeight - rect.height - 20))
      });
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
    return (
      <div
        ref={containerRef}
        className="video-restore-indicator hide-in-screenshot"
        onClick={handleRestore}
      >
        <ChevronRight size={20} color="white" />
        <div className="profile-box mini-landscape" style={{ width: "90px", height: "90px", margin: 0 }}>
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
      bounds="parent"
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
