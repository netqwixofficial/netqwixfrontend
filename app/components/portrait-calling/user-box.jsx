import Draggable from "react-draggable";
import { Point, Utils } from "../../../utils/utils";
import React, { useEffect, useState, useRef } from "react";
import { useCallback } from "react";
import { AccountType } from "../../common/constants";
import { ChevronRight } from "react-feather";

/** Parent refs (e.g. portrait-calling localVideoRef / remoteVideoRef) must point at the <video> for PeerJS and stream sync. */
function assignForwardedVideoRef(videoRef, node) {
  if (videoRef == null) return;
  if (typeof videoRef === "function") {
    videoRef(node);
  } else {
    try {
      videoRef.current = node;
    } catch {
      /* read-only ref */
    }
  }
}

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
  // Internal ref so this instance always attaches stream to its own <video> (parent may share one ref across multiple boxes)
  const videoElRef = useRef(null);
  const effectiveStream = stream || null;

  const setVideoRef = useCallback(
    (node) => {
      videoElRef.current = node;
      assignForwardedVideoRef(videoRef, node);
      if (node && effectiveStream) node.srcObject = effectiveStream;
    },
    [effectiveStream, videoRef]
  );
  useEffect(() => {
    const el = videoElRef.current;
    if (!el) return;

    if (effectiveStream) {
      if (el.srcObject !== effectiveStream) {
        el.srcObject = effectiveStream;
      }
      if (el.paused) {
        el.play().catch((err) => {
          if (err?.name !== "AbortError") {
            console.warn("[UserBox] Failed to play video", { userId: user?._id, err });
          }
        });
      }
    } else {
      if (el.srcObject) el.srcObject = null;
    }
  }, [effectiveStream, isStreamOff, selectedUser, user?._id, videoType]);

  const handleDrag = (e, data) => {
    setIsDragging(true);
    setPosition({ x: data.x, y: data.y });
  };

  const handleStop = (e, data) => {
    // Just stop dragging and keep the last position; do not hide at edges.
    setIsDragging(false);
    setPosition({ x: data.x, y: data.y });
  };

  const handleRestore = () => {
    // Restore now simply recenters the box; no edge-hiding UI anymore.
    setPosition({ x: 0, y: 0 });
  };

  const handleBoxClick = useCallback(() => {
    if (onClick && id && !isDragging && !selected) {
      onClick(id);
    }
  }, [onClick, id, isDragging, selected]);

  const clickObserver = useClickObserver(handleBoxClick);

  // We no longer support edge-hiding; always render the normal box content.

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
  if (selected) {
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
  const videoElRef = useRef(null);
  const effectiveStream = stream || null;

  const handleBoxClick = useCallback(() => {
    if (onClick && id && !isDragging) {
      onClick(id);
    }
  }, [onClick, id, isDragging]);

  const clickObserver = useClickObserver(handleBoxClick);

  const setVideoRef = useCallback(
    (node) => {
      videoElRef.current = node;
      assignForwardedVideoRef(videoRef, node);
      if (node && effectiveStream) node.srcObject = effectiveStream;
    },
    [effectiveStream, videoRef]
  );

  useEffect(() => {
    const el = videoElRef.current;
    if (!el) return;

    if (effectiveStream) {
      if (el.srcObject !== effectiveStream) el.srcObject = effectiveStream;
      if (el.paused) {
        el.play().catch((err) => {
          if (err?.name !== "AbortError") {
            console.warn("[UserBoxMini] Failed to play video", { userId: user?._id, err });
          }
        });
      }
    } else {
      if (el.srcObject) el.srcObject = null;
    }
  }, [effectiveStream, isStreamOff, isHidden, user?._id, videoType]);

  const handleDrag = (e, data) => {
    setIsDragging(true);
    setPosition({ x: data.x, y: data.y });
  };

  const handleStop = (e, data) => {
    // Just stop dragging and keep the last position; do not hide at edges.
    setIsDragging(false);
    setPosition({ x: data.x, y: data.y });
  };

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
    // Just stop dragging and keep the last position; do not hide at edges.
    setIsDragging(false);
    setPosition({ x: data.x, y: data.y });
  };

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
