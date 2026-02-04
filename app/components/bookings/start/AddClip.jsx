import React, { useState, useEffect, useRef } from 'react';
import Modal from '../../../common/modal';
import { useAppDispatch } from '../../../store';
import { traineeAction } from '../../trainee/trainee.slice';
import { Utils } from '../../../../utils/utils';
import { X, ChevronLeft, ChevronRight, Play } from 'react-feather';
import { Button } from 'reactstrap';
import { useMediaQuery } from 'usehooks-ts';
import { Tooltip } from 'react-tippy';
import { MY_CLIPS_LABEL_LIMIT } from '../../../../utils/constant';

const AddClip = ({ isOpen, onClose, trainer, selectedClips, clips, setSelectedClips, shareFunc }) => {
  const [selectedClipsCopy, setSelectedClipsCopy] = useState([]);
  const [isOpenPlayVideo, setIsOpenPlayVideo] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState("");
  const [selectedClip, setSelectedClip] = useState(null);
  const [currentGroupIndex, setCurrentGroupIndex] = useState(null);
  const [currentClipIndex, setCurrentClipIndex] = useState(null);
  const [videoDimensions, setVideoDimensions] = useState({
    maxWidth: "470px",
    height: "587px",
  });
  const dispatch = useAppDispatch();
  const { removeNewBookingData } = traineeAction;
  const isMobileScreen = useMediaQuery("(max-width:1000px)");
  const width500 = useMediaQuery("(max-width: 500px)");
  const closeButtonRef = useRef(null);

  // Initialize selected clips from props
  useEffect(() => {
    setSelectedClipsCopy(selectedClips && selectedClips.length > 0 ? [...selectedClips] : []);
  }, [selectedClips]);

  // Flatten all clips from categories
  const allClips = clips.reduce((acc, category) => {
    return acc.concat(category.clips || []);
  }, []);

  // Find clip position in flattened array
  const findClipPosition = (clip) => {
    let globalIndex = 0;
    for (let i = 0; i < clips.length; i++) {
      const category = clips[i];
      const clipsInCategory = category.clips || [];
      for (let j = 0; j < clipsInCategory.length; j++) {
        if (clipsInCategory[j]._id === clip._id) {
          return { groupIndex: i, clipIndex: j, globalIndex };
        }
        globalIndex++;
      }
    }
    return null;
  };

  const openClipInModal = (clip) => {
    const position = findClipPosition(clip);
    if (position) {
      setCurrentGroupIndex(position.groupIndex);
      setCurrentClipIndex(position.clipIndex);
      setSelectedVideo(Utils?.generateVideoURL(clip));
      setSelectedClip(clip);
      setIsOpenPlayVideo(true);
    }
  };

  const findNextClipPosition = () => {
    if (currentGroupIndex === null || currentClipIndex === null) return null;

    let g = currentGroupIndex;
    let c = currentClipIndex + 1;

    while (g < clips.length) {
      const group = clips[g];
      const clipsInGroup = group?.clips || [];
      if (c < clipsInGroup.length) {
        return { groupIndex: g, clipIndex: c, clip: clipsInGroup[c] };
      }
      g += 1;
      c = 0;
    }
    return null;
  };

  const findPreviousClipPosition = () => {
    if (currentGroupIndex === null || currentClipIndex === null) return null;

    let g = currentGroupIndex;
    let c = currentClipIndex - 1;

    while (g >= 0) {
      const group = clips[g];
      const clipsInGroup = group?.clips || [];
      if (c >= 0 && c < clipsInGroup.length) {
        return { groupIndex: g, clipIndex: c, clip: clipsInGroup[c] };
      }
      g -= 1;
      if (g >= 0) {
        const prevGroup = clips[g];
        const prevClips = prevGroup?.clips || [];
        c = prevClips.length - 1;
      }
    }
    return null;
  };

  const handleNextClip = () => {
    const next = findNextClipPosition();
    if (!next) return;
    setCurrentGroupIndex(next.groupIndex);
    setCurrentClipIndex(next.clipIndex);
    setSelectedVideo(Utils?.generateVideoURL(next.clip));
    setSelectedClip(next.clip);
  };

  const handlePreviousClip = () => {
    const prev = findPreviousClipPosition();
    if (!prev) return;
    setCurrentGroupIndex(prev.groupIndex);
    setCurrentClipIndex(prev.clipIndex);
    setSelectedVideo(Utils?.generateVideoURL(prev.clip));
    setSelectedClip(prev.clip);
  };

  const handleVideoLoad = (event) => {
    const video = event.target;
    const aspectRatio = video.videoWidth / video.videoHeight;

    if (aspectRatio > 1) {
      setVideoDimensions({ width: "100%", height: "70%" });
    } else {
      setVideoDimensions({
        maxWidth: width500 ? "320px" : "470px",
        height: width500 ? "350px" : "587px",
      });
    }
  };

  // Keyboard navigation for video modal
  useEffect(() => {
    if (!isOpenPlayVideo) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpenPlayVideo(false);
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        handleNextClip();
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        handlePreviousClip();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpenPlayVideo, clips, currentGroupIndex, currentClipIndex]);

  // Ensure focus stays inside modal when it opens
  useEffect(() => {
    if (isOpenPlayVideo && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [isOpenPlayVideo]);

  const handleClipSelection = (clip) => {
    const isSelected = selectedClipsCopy.some((val) => val?._id === clip?._id);
    
    if (isSelected) {
      // Deselect clip
      setSelectedClipsCopy((prev) => prev.filter((val) => val?._id !== clip?._id));
    } else if (selectedClipsCopy.length < 2) {
      // Select clip if less than 2 selected
      setSelectedClipsCopy((prev) => [...prev, clip]);
    }
  };

  const isMaxSelected = selectedClipsCopy.length >= 2;
  const isClipDisabled = (clip) => {
    const isSelected = selectedClipsCopy.some((val) => val?._id === clip?._id);
    return isMaxSelected && !isSelected;
  };

  const handleShare = () => {
    setSelectedClips(selectedClipsCopy);
    if (shareFunc) {
      shareFunc(selectedClipsCopy);
    }
    onClose();
  };

  const handleClose = () => {
    setSelectedClipsCopy([]);
    onClose();
    dispatch(removeNewBookingData());
  };

  return (
    <>
      <Modal 
        isOpen={isOpen} 
        overflowHidden 
        className="clip-selection-modal"
        element={
          <div className='d-flex flex-column' style={{ 
            width: '100%', 
            height: '100%', 
            padding: '20px',
            backgroundColor: '#fff',
            borderRadius: '8px'
          }}>
            {/* Header */}
            <div className='d-flex justify-content-between align-items-center mb-4'>
              <h2 className="mb-0" style={{ fontSize: isMobileScreen ? "18px" : "24px", fontWeight: "600" }}>
                Add 2 clips
              </h2>
              <div
                className="icon-btn btn-sm btn-outline-light close-apps pointer"
                onClick={handleClose}
                style={{ marginLeft: "auto" }}
              >
                <X />
              </div>
            </div>

            {/* Share Button - Moved to top */}
            {clips?.length && (
              <div className="d-flex justify-content-center w-100 mb-3">
                <Button
                  color="success"
                  onClick={handleShare}
                  disabled={selectedClipsCopy.length === 0}
                  style={{
                    minWidth: "120px",
                    padding: "10px 30px",
                    fontSize: "16px",
                    fontWeight: "600"
                  }}
                >
                  Share {selectedClipsCopy.length > 0 && `(${selectedClipsCopy.length})`}
                </Button>
              </div>
            )}

            {/* Selected Clips Counter */}
            {selectedClipsCopy.length > 0 && (
              <div className="mb-3" style={{ padding: "10px", backgroundColor: "#f0f0f0", borderRadius: "8px" }}>
                <h5 className="mb-2" style={{ fontSize: "14px", fontWeight: "600" }}>
                  Selected Clips ({selectedClipsCopy.length}/2)
                </h5>
                <div className="d-flex flex-wrap gap-2">
                  {selectedClipsCopy.map((clip) => (
                    <div
                      key={clip._id}
                      style={{
                        padding: "8px 12px",
                        backgroundColor: "#28a745",
                        color: "white",
                        borderRadius: "6px",
                        fontSize: "12px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                      }}
                    >
                      <span>{clip.title || "Untitled"}</span>
                      <X 
                        size={14} 
                        style={{ cursor: "pointer" }}
                        onClick={() => handleClipSelection(clip)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Clips Grid */}
            <div 
              className="media-gallery portfolio-section grid-portfolio"
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "10px 0"
              }}
            >
              {clips?.length ? (
                clips.map((category, categoryIndex) => (
                  <div
                    key={category._id || categoryIndex}
                    className="mb-4"
                  >
                    {category._id && (
                      <h5 className="block-title mb-3" style={{ fontSize: "16px", fontWeight: "600" }}>
                        {category._id}
                        <label className="badge badge-primary sm ml-2">
                          {category.clips?.length || 0}
                        </label>
                      </h5>
                    )}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: isMobileScreen ? "repeat(2, 1fr)" : "repeat(2, 1fr)",
                        gap: "15px",
                        width: "100%"
                      }}
                    >
                      {category.clips?.map((clip, clipIndex) => {
                        const isSelected = selectedClipsCopy.some((val) => val?._id === clip?._id);
                        const isDisabled = isClipDisabled(clip);
                        
                        return (
                          <div
                            key={clip._id || clipIndex}
                            className="video-container"
                            style={{
                              borderRadius: "8px",
                              position: "relative",
                              cursor: isDisabled ? "not-allowed" : "pointer",
                              opacity: isDisabled ? 0.5 : 1,
                              transition: "all 0.3s ease"
                            }}
                            onClick={() => {
                              if (!isDisabled) {
                                handleClipSelection(clip);
                              }
                            }}
                          >
                            {/* Clip Title */}
                            <Tooltip
                              title={clip?.title || "Untitled"}
                              position="bottom"
                              trigger="mouseenter"
                            >
                              <h6
                                className="text-truncate mb-2"
                                style={{
                                  fontSize: "13px",
                                  fontWeight: "500",
                                  textAlign: "center",
                                  padding: "0 5px",
                                  marginBottom: "8px",
                                  maxWidth: "100%"
                                }}
                              >
                                {clip?.title && clip.title.length > MY_CLIPS_LABEL_LIMIT 
                                  ? `${clip.title.slice(0, MY_CLIPS_LABEL_LIMIT)}...` 
                                  : clip?.title || "Untitled"}
                              </h6>
                            </Tooltip>

                            {/* Video Container */}
                            <div style={{ position: "relative" }}>
                              <video
                                poster={Utils.generateThumbnailURL(clip)}
                                style={{
                                  width: "100%",
                                  aspectRatio: "1/1",
                                  border: isSelected ? "4px solid #28a745" : "4px solid #b4bbd1",
                                  borderRadius: "8px",
                                  objectFit: "cover",
                                  pointerEvents: isDisabled ? "none" : "auto"
                                }}
                              >
                                <source src={Utils?.generateVideoURL(clip)} type="video/mp4" />
                              </video>

                              {/* Play Button Overlay */}
                              <div
                                style={{
                                  position: "absolute",
                                  top: "50%",
                                  left: "50%",
                                  transform: "translate(-50%, -50%)",
                                  backgroundColor: "rgba(0, 0, 0, 0.6)",
                                  borderRadius: "50%",
                                  padding: "12px",
                                  cursor: isDisabled ? "not-allowed" : "pointer",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  transition: "all 0.3s ease"
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isDisabled) {
                                    openClipInModal(clip);
                                  }
                                }}
                                onMouseEnter={(e) => {
                                  if (!isDisabled) {
                                    e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.6)";
                                }}
                              >
                                <Play size={20} color="#fff" fill="#fff" />
                              </div>

                              {/* Checkbox */}
                              <div
                                style={{
                                  position: "absolute",
                                  top: "8px",
                                  right: "8px",
                                  backgroundColor: isSelected ? "#28a745" : "white",
                                  border: "2px solid",
                                  borderColor: isSelected ? "#28a745" : "#b4bbd1",
                                  borderRadius: "4px",
                                  width: "24px",
                                  height: "24px",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: isDisabled ? "not-allowed" : "pointer",
                                  zIndex: 10,
                                  transition: "all 0.3s ease"
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isDisabled) {
                                    handleClipSelection(clip);
                                  }
                                }}
                              >
                                {isSelected && (
                                  <svg
                                    width="16"
                                    height="16"
                                    viewBox="0 0 16 16"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      d="M13.5 4L6 11.5L2.5 8"
                                      stroke="black"
                                      strokeWidth="2"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    minHeight: "200px"
                  }}
                >
                  <h5 className="block-title">No Clips Found</h5>
                </div>
              )}
            </div>
          </div>
        }
      />

      {/* Video Player Modal */}
      <Modal
        isOpen={isOpenPlayVideo}
        element={
          <>
            <div className="d-flex flex-column align-items-center justify-content-center h-100" style={{ padding: "20px" }}>
              <div
                className="position-relative"
                style={{
                  borderRadius: 8,
                  maxWidth: "100%",
                  backgroundColor: "#1a1a1a",
                  padding: "20px",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.3)"
                }}
              >
                {/* Close button */}
                <div className="media-body text-right" style={{ position: "absolute", top: "10px", right: "10px", zIndex: 10 }}>
                  <button
                    ref={closeButtonRef}
                    type="button"
                    className="icon-btn btn-sm btn-outline-light close-apps pointer"
                    onClick={() => setIsOpenPlayVideo(false)}
                    aria-label="Close video"
                    style={{
                      backgroundColor: "rgba(0,0,0,0.5)",
                      borderRadius: "50%",
                      padding: "8px"
                    }}
                  >
                    <X />
                  </button>
                </div>

                {/* Title at top center */}
                {selectedClip && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: "20px",
                      paddingTop: "10px"
                    }}
                  >
                    <h4
                      style={{
                        margin: 0,
                        fontSize: "18px",
                        fontWeight: 600,
                        color: "#fff",
                        textAlign: "center",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        maxWidth: "80%",
                      }}
                    >
                      {selectedClip.title || "Untitled"}
                    </h4>
                  </div>
                )}

                {/* Video with navigation buttons */}
                <div className="d-flex align-items-center justify-content-center" style={{ marginBottom: "20px" }}>
                  {/* Previous button */}
                  <button
                    type="button"
                    className="icon-btn btn-sm btn-outline-light mr-2"
                    onClick={handlePreviousClip}
                    disabled={!findPreviousClipPosition()}
                    aria-label="Previous clip"
                    style={{
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "rgba(0, 0, 128, 0.8)",
                      border: "2px solid #000080",
                      padding: "10px",
                      opacity: !findPreviousClipPosition() ? 0.5 : 1,
                      cursor: !findPreviousClipPosition() ? "not-allowed" : "pointer",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)"
                    }}
                  >
                    <ChevronLeft size={20} color="#fff" />
                  </button>

                  <video
                    key={selectedVideo}
                    style={videoDimensions}
                    controls
                    onLoadedData={handleVideoLoad}
                  >
                    <source src={selectedVideo} type="video/mp4" />
                  </video>

                  {/* Next button */}
                  <button
                    type="button"
                    className="icon-btn btn-sm btn-outline-light ml-2"
                    onClick={handleNextClip}
                    disabled={!findNextClipPosition()}
                    aria-label="Next clip"
                    style={{
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: "rgba(0, 0, 128, 0.8)",
                      border: "2px solid #000080",
                      padding: "10px",
                      opacity: !findNextClipPosition() ? 0.5 : 1,
                      cursor: !findNextClipPosition() ? "not-allowed" : "pointer",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)"
                    }}
                  >
                    <ChevronRight size={20} color="#fff" />
                  </button>
                </div>
              </div>
            </div>
          </>
        }
      />
    </>
  );
};

export default AddClip;
