import { useContext, useEffect, useRef, useState } from "react";
import { EVENTS } from "../../../helpers/events";
import { AccountType } from "../../common/constants";
import { useAppSelector } from "../../store";
import { authState } from "../auth/auth.slice";
import TimeRemaining from "./time-remaining";
import { UserBox, UserBoxMini } from "./user-box";
import { SocketContext } from "../socket";
import { CanvasMenuBar } from "../video/canvas.menubar";

const OneOnOneCall = ({
  timeRemaining,
  bothUsersJoined = false,
  selectedUser,
  setSelectedUser,
  localVideoRef,
  remoteVideoRef,
  toUser,
  fromUser,
  remoteStream,
  localStream,
  isLocalStreamOff,
  setIsLocalStreamOff,
  isRemoteStreamOff,
  isLandscape,
  setShowScreenshotButton
}) => {
  const socket = useContext(SocketContext);
  const { accountType } = useAppSelector(authState);
  const annotationCanvasRef = useRef(null);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const drawingPathRef = useRef([]); // Store current drawing path for sync
  const [isCanvasMenuOpen, setIsCanvasMenuOpen] = useState(false);

  // Mirror basic CanvasMenuBar configuration so trainer gets similar tools
  const [canvasConfigs, setCanvasConfigs] = useState({
    sender: {
      strokeStyle: "#ff0000",
      lineWidth: 3,
      lineCap: "round",
    },
  });

  const [sketchPickerColor, setSketchPickerColor] = useState({
    r: 255,
    g: 0,
    b: 0,
    a: 1,
  });

  // For now we only support freehand on live video; shapes are ignored but we
  // keep the state so the menu bar looks and behaves consistently.
  const [activeShape, setActiveShape] = useState(null);
  // Track which videos are hidden (dragged outside viewport)
  const [hiddenVideos, setHiddenVideos] = useState({
    student: false,
    teacher: false
  });

  useEffect(()=>{
    setShowScreenshotButton(false)
  },[])

  const handleHideVideo = (videoType) => {
    setHiddenVideos(prev => ({ ...prev, [videoType]: true }));
  };

  const handleRestoreVideo = (videoType) => {
    setHiddenVideos(prev => ({ ...prev, [videoType]: false }));
  };

  // Resize annotation canvas to match video section
  useEffect(() => {
    const canvas = annotationCanvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;

      // Snapshot existing drawing before changing size, to avoid losing
      // annotations when the layout changes (e.g. orientation, layout shifts).
      let prevDataUrl = null;
      const prevWidth = canvas.width;
      const prevHeight = canvas.height;
      if (prevWidth && prevHeight) {
        try {
          prevDataUrl = canvas.toDataURL();
        } catch (e) {
          console.warn("[OneOnOneCall] Failed to snapshot annotation canvas before resize", e);
        }
      }

      const { offsetWidth, offsetHeight } = parent;
      if (offsetWidth && offsetHeight) {
        canvas.width = offsetWidth;
        canvas.height = offsetHeight;
      }

      if (prevDataUrl) {
        const img = new Image();
        img.onload = () => {
          const ctx = canvas.getContext("2d");
          if (!ctx) return;
          try {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          } catch (err) {
            console.warn("[OneOnOneCall] Failed to restore annotation canvas after resize", err);
          }
        };
        img.src = prevDataUrl;
      }
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  const getCanvasPos = (e) => {
    const canvas = annotationCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  const handlePointerDown = (e) => {
    if (accountType !== AccountType.TRAINER || !isAnnotating) return;
    e.preventDefault();
    const canvas = annotationCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCanvasPos(e);
    // Use current canvas configuration (color / width) similar to clip mode
    ctx.strokeStyle = canvasConfigs?.sender?.strokeStyle || "#ff0000";
    ctx.lineWidth = canvasConfigs?.sender?.lineWidth || 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, y);
    lastPosRef.current = { x, y };
    drawingPathRef.current = [{ x, y }]; // Start new path
    setIsDrawing(true);
  };

  const handlePointerMove = (e) => {
    if (!isDrawing || accountType !== AccountType.TRAINER || !isAnnotating) return;
    e.preventDefault();
    const canvas = annotationCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { x, y } = getCanvasPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    lastPosRef.current = { x, y };
    drawingPathRef.current.push({ x, y }); // Add point to path
  };

  const handlePointerUp = (e) => {
    if (!isDrawing) return;
    e && e.preventDefault();
    
    // Send drawing path to student via socket
    if (accountType === AccountType.TRAINER && drawingPathRef.current.length > 0 && socket && fromUser?._id && toUser?._id) {
      const canvas = annotationCanvasRef.current;
      if (canvas) {
        // Send canvas as image data URL for reliable sync
        try {
          const imageData = canvas.toDataURL('image/png');
          // Send as base64 string in strikes field (compatible with clip-mode format)
          socket.emit(EVENTS.EMIT_DRAWING_CORDS, {
            userInfo: { from_user: fromUser._id, to_user: toUser._id },
            strikes: imageData, // Send as data URL string
            canvasSize: { width: canvas.width, height: canvas.height },
            canvasIndex: 1, // Single canvas for one-on-one mode
          });
        } catch (err) {
          console.warn("Failed to sync annotation:", err);
          // Fallback: send path coordinates
          socket.emit(EVENTS.EMIT_DRAWING_CORDS, {
            userInfo: { from_user: fromUser._id, to_user: toUser._id },
            strikes: JSON.stringify(drawingPathRef.current),
            canvasSize: { width: canvas.width, height: canvas.height },
            canvasIndex: 1,
          });
        }
      }
    }
    
    drawingPathRef.current = []; // Clear path
    setIsDrawing(false);
  };

  const clearAnnotations = () => {
    const canvas = annotationCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Emit clear event to student
    if (accountType === AccountType.TRAINER && socket && fromUser?._id && toUser?._id) {
      socket.emit(EVENTS.ON_CLEAR_CANVAS, {
        userInfo: { from_user: fromUser._id, to_user: toUser._id },
        canvasIndex: 1,
      });
    }
  };

  const handleUserClick = (id) => {
    if (accountType === AccountType.TRAINER) {
      setSelectedUser(id);
      emitVideoSelectEvent("swap", id);
    }
  };

  // Socket event listeners for video select, annotations, and drawing mode
  useEffect(() => {
    if (!socket) return;

    const handleVideoSelect = ({ id, type }) => {
      if (type === "swap" && accountType === AccountType.TRAINEE) {
        setSelectedUser(id);
      }
    };

    // Listen for annotation drawing from trainer
    const handleDrawingCoords = ({ strikes, canvasSize, canvasIndex }) => {
      if (accountType === AccountType.TRAINEE && canvasIndex === 1) {
        const canvas = annotationCanvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!ctx || !canvas) return;
        
        try {
          // Check if strikes is a data URL (image format)
          if (typeof strikes === 'string' && strikes.startsWith('data:image')) {
            // Handle image data URL format
            const img = new Image();
            img.onload = () => {
              const scaleX = canvas.width / (canvasSize?.width || canvas.width);
              const scaleY = canvas.height / (canvasSize?.height || canvas.height);
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0, canvasSize?.width * scaleX || canvas.width, canvasSize?.height * scaleY || canvas.height);
            };
            img.onerror = () => {
              console.warn("Failed to load annotation image");
            };
            img.src = strikes;
          } else {
            // Handle path coordinates format (fallback)
            let path;
            if (typeof strikes === 'string') {
              try {
                path = JSON.parse(strikes);
              } catch {
                // If not JSON, might be Blob format from clip-mode
                return;
              }
            } else {
              path = strikes;
            }
            
            if (Array.isArray(path) && path.length > 0) {
              // Scale coordinates if canvas sizes differ
              const scaleX = canvas.width / (canvasSize?.width || canvas.width);
              const scaleY = canvas.height / (canvasSize?.height || canvas.height);
              
              ctx.strokeStyle = "#ff0000";
              ctx.lineWidth = 3;
              ctx.lineCap = "round";
              ctx.beginPath();
              ctx.moveTo(path[0].x * scaleX, path[0].y * scaleY);
              for (let i = 1; i < path.length; i++) {
                ctx.lineTo(path[i].x * scaleX, path[i].y * scaleY);
              }
              ctx.stroke();
            }
          }
        } catch (err) {
          console.warn("Failed to parse drawing coordinates:", err);
        }
      }
    };

    // Listen for clear canvas event
    const handleClearCanvas = ({ canvasIndex }) => {
      if (accountType === AccountType.TRAINEE && canvasIndex === 1) {
        const canvas = annotationCanvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (ctx && canvas) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    };

    // Listen for drawing mode toggle
    const handleToggleDrawingMode = ({ drawingMode }) => {
      if (accountType === AccountType.TRAINEE) {
        setIsAnnotating(drawingMode);
      }
    };

    socket.on(EVENTS.ON_VIDEO_SELECT, handleVideoSelect);
    socket.on(EVENTS.EMIT_DRAWING_CORDS, handleDrawingCoords);
    socket.on(EVENTS.ON_CLEAR_CANVAS, handleClearCanvas);
    socket.on(EVENTS.TOGGLE_DRAWING_MODE, handleToggleDrawingMode);

    return () => {
      if (socket) {
        socket.off(EVENTS.ON_VIDEO_SELECT, handleVideoSelect);
        socket.off(EVENTS.EMIT_DRAWING_CORDS, handleDrawingCoords);
        socket.off(EVENTS.ON_CLEAR_CANVAS, handleClearCanvas);
        socket.off(EVENTS.TOGGLE_DRAWING_MODE, handleToggleDrawingMode);
      }
    };
  }, [socket, accountType, fromUser?._id, toUser?._id, setSelectedUser, setIsAnnotating]);

  const emitVideoSelectEvent = (type, id) => {
    if (socket && fromUser?._id && toUser?._id) {
      socket.emit(EVENTS.ON_VIDEO_SELECT, {
        userInfo: { from_user: fromUser._id, to_user: toUser._id },
        type,
        id,
      });
    }
  };

  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column", 
      height: "100%", 
      maxHeight: "100%", 
      overflow: "hidden",
      width: "100%",
      boxSizing: "border-box"
    }}>
      <div 
        className="d-flex w-100 justify-content-end mr-3 mr-md-5"
        style={{
          padding: "6px 12px 4px",
          flexShrink: 0,
          boxSizing: "border-box",
        }}
      >
        {timeRemaining && (
          <TimeRemaining
            timeRemaining={timeRemaining}
            bothUsersJoined={bothUsersJoined}
          />
        )}
      </div>

      <div className="video-section one-on-one-layout" style={{ 
        position: "relative", 
        flex: 1, 
        minHeight: 0, 
        maxHeight: "100%",
        overflow: "hidden",
        boxSizing: "border-box",
        padding: "0 8px"
      }}>
        <div className="one-on-one-layout__primary">
        <UserBox
          id={toUser._id}
          onClick={handleUserClick}
          selected={selectedUser === toUser._id}
          selectedUser={selectedUser}
          notSelected={selectedUser}
          videoRef={localVideoRef}
          user={fromUser}
          stream={localStream}
          isStreamOff={isLocalStreamOff}
          isLandscape={isLandscape}
          muted={true}
        />
        </div>
        <div className="one-on-one-layout__secondary">
        <UserBox
          id={fromUser._id}
          onClick={handleUserClick}
          selectedUser={selectedUser}
          selected={selectedUser === fromUser._id}
          notSelected={selectedUser}
          videoRef={remoteVideoRef}
          user={toUser}
          stream={remoteStream}
          isStreamOff={isRemoteStreamOff}
          isLandscape={isLandscape}
        />
        </div>

        {selectedUser && (
          <UserBoxMini
            id={selectedUser === toUser._id ? fromUser._id : toUser._id}
            onClick={handleUserClick}
            selected={false}
            videoRef={selectedUser === toUser._id ? remoteVideoRef : localVideoRef}
            stream={selectedUser === toUser._id ? remoteStream : localStream}
            user={selectedUser === toUser._id ? toUser : fromUser}
            isStreamOff={
              selectedUser === toUser._id ? isRemoteStreamOff : isLocalStreamOff
            }
            muted={selectedUser === toUser._id ? false : true}
            videoType={selectedUser === toUser._id ? "student" : "teacher"}
            onHide={handleHideVideo}
            onRestore={handleRestoreVideo}
            isHidden={selectedUser === toUser._id ? hiddenVideos.student : hiddenVideos.teacher}
          />
        )}

        {/* Annotation canvas overlay for trainer */}
        <canvas
          ref={annotationCanvasRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents:
              accountType === AccountType.TRAINER && isAnnotating ? "auto" : "none",
            zIndex: 15,
          }}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onMouseLeave={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
        />

        {accountType === AccountType.TRAINER && (
          <>
            {/* Global annotate toggle (enables overlay + toolbar) */}
            <div
              style={{
                position: "absolute",
                top: 15,
                right: 15,
                zIndex: 21,
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
              }}
              className="hide-in-screenshot"
            >
              <button
                type="button"
                onClick={() => {
                  const newMode = !isAnnotating;
                  setIsAnnotating(newMode);
                  // Emit drawing mode toggle to student so they mirror state
                  if (socket && fromUser?._id && toUser?._id) {
                    socket.emit(EVENTS.TOGGLE_DRAWING_MODE, {
                      userInfo: { from_user: fromUser._id, to_user: toUser._id },
                      drawingMode: newMode,
                    });
                  }
                }}
                style={{
                  padding: "10px 18px",
                  fontSize: "14px",
                  fontWeight: "500",
                  borderRadius: "25px",
                  border: `2px solid ${isAnnotating ? "#1976d2" : "#e0e0e0"}`,
                  backgroundColor: isAnnotating ? "#1976d2" : "#ffffff",
                  color: isAnnotating ? "#ffffff" : "#333333",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
                onMouseEnter={(e) => {
                  if (!isAnnotating) {
                    e.currentTarget.style.backgroundColor = "#e3f2fd";
                    e.currentTarget.style.borderColor = "#1976d2";
                    e.currentTarget.style.color = "#1976d2";
                  }
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
                }}
                onMouseLeave={(e) => {
                  if (!isAnnotating) {
                    e.currentTarget.style.backgroundColor = "#ffffff";
                    e.currentTarget.style.borderColor = "#e0e0e0";
                    e.currentTarget.style.color = "#333333";
                  }
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
                }}
              >
                <span>✏️</span>
                {isAnnotating ? "Stop Annotating" : "Annotate"}
              </button>
              {isAnnotating && (
                <button
                  type="button"
                  onClick={clearAnnotations}
                  style={{
                    padding: "10px 18px",
                    fontSize: "14px",
                    fontWeight: "500",
                    borderRadius: "25px",
                    border: "2px solid #e0e0e0",
                    backgroundColor: "#ffffff",
                    color: "#f44336",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#ffebee";
                    e.currentTarget.style.borderColor = "#f44336";
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#ffffff";
                    e.currentTarget.style.borderColor = "#e0e0e0";
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";
                  }}
                >
                  <span>🗑️</span>
                  Clear
                </button>
              )}
            </div>

            {/* Full CanvasMenuBar tools, same as clip mode, shown when annotating */}
            {isAnnotating && (
              <div
                style={{
                  position: "absolute",
                  top: 50,
                  left: "50%",
                  transform: "translateX(-50%)",
                  zIndex: 20,
                }}
                className="hide-in-screenshot"
              >
                <CanvasMenuBar
                  isOpen={isCanvasMenuOpen}
                  setIsOpen={setIsCanvasMenuOpen}
                  canvasConfigs={canvasConfigs}
                  setCanvasConfigs={(config) => {
                    setCanvasConfigs(config);
                  }}
                  sketchPickerColor={sketchPickerColor}
                  setSketchPickerColor={setSketchPickerColor}
                  drawShapes={(shapeType) => {
                    // For live video we currently only support freehand;
                    // we still track the active shape so the UI behaves
                    // similarly to clip mode.
                    setActiveShape(shapeType);
                  }}
                  refreshDrawing={clearAnnotations}
                  // The following props are required by CanvasMenuBar but
                  // are not used for live-video annotations. We pass safe
                  // no-op handlers so existing functionality is not broken.
                  selectedClips={[]}
                  setSelectedClips={() => {}}
                  toUser={{ fullname: "" }}
                  isCanvasMenuNoteShow={false}
                  setIsCanvasMenuNoteShow={() => {}}
                  setMicNote={() => {}}
                  setClipSelectNote={() => {}}
                  clipSelectNote={false}
                  setCountClipNoteOpen={() => {}}
                  resetInitialPinnedUser={() => {}}
                  isFromPotrait={true}
                  isFullScreen={false}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default OneOnOneCall;
