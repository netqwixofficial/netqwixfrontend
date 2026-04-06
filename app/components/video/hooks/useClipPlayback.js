import { useState, useRef, useCallback, useEffect, useContext } from 'react';
import { SocketContext } from '../../socket';
import { EVENTS } from '../../../../helpers/events';
import {
  safePlayVideoElement,
  safePlayTwoVideoElements,
} from '../videoPlayback';


export const useClipPlayback = ({
  fromUser,
  toUser,
  sessionId,
  selectedClips,
  setSelectedClips,
  setIsPinned,
  setPinnedUser,
  resetInitialPinnedUser,
  setInitialPinnedUser,
}) => {
  const socket = useContext(SocketContext);
  const selectedVideoRef1 = useRef(null);
  const selectedVideoRef2 = useRef(null);
  const progressBarRef = useRef(null);
  const progressBarRef2 = useRef(null);
  const globalProgressBarRef = useRef(0);

  const [isPlaying, setIsPlaying] = useState({
    isPlayingAll: false,
    number: '',
    isPlaying1: false,
    isPlaying2: false,
  });

  const [videoTime, setVideoTime] = useState({
    currentTime1: '00:00',
    currentTime2: '00:00',
    remainingTime1: '00:00',
    remainingTime2: '00:00',
  });

  const [progressRange, setProgressRange] = useState(0);
  const [videoController, setVideoController] = useState(false);

  /**
   * Emit video select event (clips or swap)
   */
  const emitVideoSelectEvent = useCallback(
    (type, videos, mainScreen) => {
      socket.emit(EVENTS.ON_VIDEO_SELECT, {
        userInfo: { from_user: fromUser._id, to_user: toUser._id },
        type,
        videos,
        mainScreen,
      });
    },
    [socket, fromUser, toUser]
  );

  /**
   * Emit video play/pause event
   */
  const emitVideoPlayPauseEvent = useCallback(
    (isPlayingAll, number, isPlaying1, isPlaying2) => {
      socket.emit(EVENTS.ON_VIDEO_PLAY_PAUSE, {
        userInfo: { from_user: fromUser._id, to_user: toUser._id },
        isPlayingAll,
        number,
        isPlaying1,
        isPlaying2,
        ...(sessionId ? { sessionId } : {}),
      });
    },
    [socket, fromUser, toUser, sessionId]
  );

  /**
   * Emit video time update event
   */
  const emitVideoTimeEvent = useCallback(
    (clickedTime, number) => {
      socket.emit(EVENTS.ON_VIDEO_TIME, {
        userInfo: { from_user: fromUser._id, to_user: toUser._id },
        clickedTime,
        number,
        ...(sessionId ? { sessionId } : {}),
      });
    },
    [socket, fromUser, toUser, sessionId]
  );

  /**
   * Play/pause video helper (play uses safe path for mobile / iOS)
   */
  const playPauseVideo = useCallback(async (videoRef, shouldPlay) => {
    if (!videoRef?.current) return;
    if (shouldPlay) {
      await safePlayVideoElement(videoRef.current);
    } else {
      videoRef.current.pause();
    }
  }, []);

  /**
   * Handle global progress bar toggle
   */
  const globalProgressBarToggler = useCallback(() => {
    setVideoController(!videoController);
    setIsPlaying({
      isPlayingAll: false,
      number: '',
      isPlaying1: false,
      isPlaying2: false,
    });
  }, [videoController]);

  /**
   * Handle global progress bar change
   */
  const handleGlobalProgressBarChange = useCallback(
    (e) => {
      const { value } = e.target;
      const maxTime = Math.max(
        selectedVideoRef1.current?.duration || 0,
        selectedVideoRef2.current?.duration || 0
      );

      if (selectedVideoRef1.current) {
        selectedVideoRef1.current.currentTime = (value / 100) * maxTime;
      }
      if (selectedVideoRef2.current) {
        selectedVideoRef2.current.currentTime = (value / 100) * maxTime;
      }

      setProgressRange(value);
      globalProgressBarRef.current = value;
    },
    []
  );

  /**
   * Listen to socket events for clip playback
   */
  useEffect(() => {
    if (!socket) return;

    const handleVideoSelect = ({ type, videos, mainScreen }) => {
      if (type === 'clips') {
        setSelectedClips([...videos]);
        if (videos?.length) {
          resetInitialPinnedUser();
        } else {
          setInitialPinnedUser();
        }
      } else {
        setPinnedUser(mainScreen);
        setIsPinned(!!mainScreen);
      }
    };

    const handleVideoPlayPause = async ({
      isPlayingAll,
      number,
      isPlaying1,
      isPlaying2,
    }) => {
      if (number === 'all') {
        if (isPlayingAll) {
          await safePlayTwoVideoElements(
            selectedVideoRef1.current,
            selectedVideoRef2.current
          );
        } else {
          selectedVideoRef1.current?.pause();
          selectedVideoRef2.current?.pause();
        }
      } else if (number === 'one') {
        await playPauseVideo(selectedVideoRef1, isPlaying1);
      } else if (number === 'two') {
        await playPauseVideo(selectedVideoRef2, isPlaying2);
      }

      setIsPlaying({ isPlayingAll, number, isPlaying1, isPlaying2 });
    };

    const handleVideoTime = ({ clickedTime, number }) => {
      if (selectedVideoRef1?.current) {
        if (number === 'one') {
          selectedVideoRef1.current.currentTime = clickedTime;
        } else if (selectedVideoRef2?.current) {
          selectedVideoRef2.current.currentTime = clickedTime;
        }
      }
    };

    socket.on(EVENTS.ON_VIDEO_SELECT, handleVideoSelect);
    socket.on(EVENTS.ON_VIDEO_PLAY_PAUSE, handleVideoPlayPause);
    socket.on(EVENTS.ON_VIDEO_TIME, handleVideoTime);

    return () => {
      socket.off(EVENTS.ON_VIDEO_SELECT, handleVideoSelect);
      socket.off(EVENTS.ON_VIDEO_PLAY_PAUSE, handleVideoPlayPause);
      socket.off(EVENTS.ON_VIDEO_TIME, handleVideoTime);
    };
  }, [
    socket,
    setSelectedClips,
    resetInitialPinnedUser,
    setInitialPinnedUser,
    setPinnedUser,
    setIsPinned,
    playPauseVideo,
  ]);

  /**
   * Emit event when selected clips change
   */
  useEffect(() => {
    emitVideoSelectEvent('clips', selectedClips, null);
  }, [selectedClips?.length, emitVideoSelectEvent]);

  return {
    // Refs
    selectedVideoRef1,
    selectedVideoRef2,
    progressBarRef,
    progressBarRef2,
    globalProgressBarRef,

    // State
    isPlaying,
    videoTime,
    progressRange,
    videoController,

    // Setters
    setIsPlaying,
    setVideoTime,
    setProgressRange,
    setVideoController,

    // Actions
    emitVideoSelectEvent,
    emitVideoPlayPauseEvent,
    emitVideoTimeEvent,
    globalProgressBarToggler,
    handleGlobalProgressBarChange,
  };
};

