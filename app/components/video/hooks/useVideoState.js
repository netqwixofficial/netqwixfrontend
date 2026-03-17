import { useState, useEffect, useRef } from 'react';
import { useMediaQuery } from '../../../hook/useMediaQuery';
import { useAppSelector } from '../../../store';
import { bookingsState } from '../../common/common.slice';
import { AccountType } from '../../../common/constants';

/**
 * Custom hook for managing video call state
 */
export const useVideoState = ({
  accountType,
  session_end_time,
  toUser,
  isTraineeJoined,
}) => {
  const { startMeeting } = useAppSelector(bookingsState);
  const [selectedClips, setSelectedClips] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isFeedStopped, setIsFeedStopped] = useState(false);
  const [displayMsg, setDisplayMsg] = useState({ showMsg: false, msg: '' });
  const [isRemoteVideoOff, setRemoteVideoOff] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [pinnedUser, setPinnedUser] = useState(null);
  const [videoController, setVideoController] = useState(false);
  const [isCanvasMenuNoteShow, setIsCanvasMenuNoteShow] = useState(false);
  const [micNote, setMicNote] = useState(false);
  const [clipSelectNote, setClipSelectNote] = useState(false);
  const [countClipNoteOpen, setCountClipNoteOpen] = useState(false);
  const [permissionModal, setPermissionModal] = useState(true);
  const [isTooltipShow, setIsTooltipShow] = useState(true);
  const [modal, setModal] = useState(false);
  const [showThumbnailForFirstVideo, setShowThumbnailForFirstVideo] = useState(true);
  const [showThumbnailForTwoVideo, setShowThumbnailForTwoVideo] = useState(true);
  const [globalSliderValue, setGlobalSliderValue] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isOpenConfirm, setIsOpenConfirm] = useState(false);
  const [isOpenReport, setIsOpenReport] = useState(false);
  const [isOpenCrop, setIsOpenCrop] = useState(false);
  const [screenShots, setScreenShots] = useState([]);
  const [reportObj, setReportObj] = useState({ title: '', topic: '' });
  const [isScreenShotModelOpen, setIsScreenShotModelOpen] = useState(false);
  const [isModelOpen, setIsModelOpen] = useState(false);
  const [callEnd, setCallEnd] = useState(false);

  // Media queries
  const width500 = useMediaQuery(500);
  const width768 = useMediaQuery(768);
  const width900 = useMediaQuery(900);
  const width1000 = useMediaQuery(1000);

  // Height for responsive calculations
  const height = typeof window !== 'undefined' ? window.innerHeight : 500;

  /**
   * Set initial pinned user based on screen height
   */
  const setInitialPinnedUser = () => {
    if (height < 500) {
      setIsPinned(true);
      if (accountType === AccountType.TRAINER) {
        setPinnedUser('user-video-1');
      } else {
        setPinnedUser('user-video-2');
      }
    }
  };

  /**
   * Reset initial pinned user
   */
  const resetInitialPinnedUser = () => {
    if (height < 500) {
      setIsPinned(false);
      setPinnedUser(null);
    }
  };

  /**
   * Select trainee clips on load
   */
  const selectTraineeClip = async (setter) => {
    try {
      if (startMeeting?.trainee_clip?.length > 0) {
        setter(startMeeting.trainee_clip);
      } else {
        setter([]);
      }
    } catch (err) {
      // Handle error silently
    }
  };

  // Select trainee clips when trainee joins
  useEffect(() => {
    if (toUser.account_type === 'Trainee' && isTraineeJoined) {
      selectTraineeClip(setSelectedClips);
    }
  }, [isTraineeJoined, toUser.account_type]);

  // Set initial pinned user on mount
  useEffect(() => {
    setInitialPinnedUser();
  }, []);

  return {
    // State
    selectedClips,
    isMuted,
    isFeedStopped,
    displayMsg,
    isRemoteVideoOff,
    isPinned,
    pinnedUser,
    videoController,
    isCanvasMenuNoteShow,
    micNote,
    clipSelectNote,
    countClipNoteOpen,
    permissionModal,
    isTooltipShow,
    modal,
    showThumbnailForFirstVideo,
    showThumbnailForTwoVideo,
    globalSliderValue,
    isOpen,
    isOpenConfirm,
    isOpenReport,
    isOpenCrop,
    screenShots,
    reportObj,
    isScreenShotModelOpen,
    isModelOpen,
    callEnd,
    width500,
    width768,
    width900,
    width1000,
    height,

    // Setters
    setSelectedClips,
    setIsMuted,
    setIsFeedStopped,
    setDisplayMsg,
    setRemoteVideoOff,
    setIsPinned,
    setPinnedUser,
    setVideoController,
    setIsCanvasMenuNoteShow,
    setMicNote,
    setClipSelectNote,
    setCountClipNoteOpen,
    setPermissionModal,
    setIsTooltipShow,
    setModal,
    setShowThumbnailForFirstVideo,
    setShowThumbnailForTwoVideo,
    setGlobalSliderValue,
    setIsOpen,
    setIsOpenConfirm,
    setIsOpenReport,
    setIsOpenCrop,
    setScreenShots,
    setReportObj,
    setIsScreenShotModelOpen,
    setIsModelOpen,
    setCallEnd,

    // Functions
    setInitialPinnedUser,
    resetInitialPinnedUser,
  };
};

