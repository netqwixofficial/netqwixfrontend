import { useState, useRef, useCallback, useEffect, useContext } from 'react';
import { SocketContext } from '../../socket';
import { EVENTS } from '../../../../helpers/events';
import { AccountType } from '../../../common/constants';
import { useAppSelector } from '../../../store';
import { bookingsState } from '../../common/common.slice';

export const useVideoCall = ({
  id,
  accountType,
  fromUser,
  toUser,
  videoRef,
  remoteVideoRef,
  setIsTraineeJoined,
  setDisplayMsg,
  setIsModelOpen,
  setPermissionModal,
  errorHandling,
  cleanupFunction,
}) => {
  const socket = useContext(SocketContext);
  const { startMeeting } = useAppSelector(bookingsState);
  const [remoteStream, setRemoteStream] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [isCallEnded, setIsCallEnded] = useState(false);
  const [isTraineeJoined, setIsTraineeJoinedLocal] = useState(false);
  const peerRef = useRef(null);

  /**
   * Initialize Peer connection
   */
  const initializePeer = useCallback(() => {
    if (typeof window === 'undefined' || !window.Peer) {
      return null;
    }

    const Peer = window.Peer;
    const peer = new Peer(fromUser._id, {
      config: startMeeting?.iceServers || {},
    });

    peer.on('open', (peerId) => {
      // Notify server that this user joined the call for a specific session
      // ENHANCED: Always include sessionId and peerId for proper backend tracking
      const joinPayload = {
        userInfo: {
          // REQUIRED: booked_sessions Mongo _id
          sessionId: id || startMeeting?.id,
          from_user: fromUser._id,
          to_user: toUser._id,
          peerId: peerId, // Include peerId for unique device tracking
        },
      };
      
      console.log('[useVideoCall] Emitting ON_CALL_JOIN', {
        sessionId: joinPayload.userInfo.sessionId,
        from_user: joinPayload.userInfo.from_user,
        to_user: joinPayload.userInfo.to_user,
        peerId: joinPayload.userInfo.peerId,
      });
      
      socket.emit('ON_CALL_JOIN', joinPayload);
    });

    peer.on('error', (error) => {
      console.error('Peer error:', error);
      errorHandling('Connection error occurred. Please try again.');
    });

    peer.on('call', (call) => {
      if (localStream) {
        call.answer(localStream);
        call.on('stream', (remoteStream) => {
          setIsTraineeJoinedLocal(true);
          setIsTraineeJoined(true);
          setDisplayMsg({ showMsg: false, msg: '' });
          setRemoteStream(remoteStream);
          if (remoteVideoRef?.current) {
            remoteVideoRef.current.srcObject = remoteStream;
          }
        });
      }
    });

    return peer;
  }, [
    fromUser,
    toUser,
    startMeeting,
    socket,
    localStream,
    remoteVideoRef,
    setIsTraineeJoined,
    setDisplayMsg,
    errorHandling,
  ]);

  /**
   * Connect to peer
   */
  const connectToPeer = useCallback(
    (peer, peerId) => {
      if (!(videoRef && videoRef?.current)) return;

      const call = peer.call(peerId, videoRef.current.srcObject);
      call.on('stream', (remoteStream) => {
        setDisplayMsg({ showMsg: false, msg: '' });
        setIsTraineeJoinedLocal(true);
        setIsTraineeJoined(true);
        if (remoteVideoRef?.current) {
          remoteVideoRef.current.srcObject = remoteStream;
        }
        setRemoteStream(remoteStream);
        if (accountType === AccountType.TRAINEE) {
          setIsModelOpen(true);
        }
      });
    },
    [
      videoRef,
      remoteVideoRef,
      accountType,
      setIsTraineeJoined,
      setDisplayMsg,
      setIsModelOpen,
    ]
  );

  /**
   * Start video call
   */
  const handleStartCall = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      setPermissionModal(false);
      setLocalStream(stream);

      if (videoRef?.current) {
        videoRef.current.srcObject = stream;
      }

      setDisplayMsg({
        showMsg: true,
        msg: `Waiting for ${toUser?.fullname} to join...`,
      });

      const peer = initializePeer();
      if (peer) {
        peerRef.current = peer;
      }
    } catch (err) {
      setPermissionModal(true);
      errorHandling(
        'Please allow media permission to microphone and camera for video call...'
      );
    }
  }, [
    toUser,
    videoRef,
    initializePeer,
    setPermissionModal,
    setDisplayMsg,
    errorHandling,
  ]);

  /**
   * End video call
   */
  const cutCall = useCallback(() => {
    setIsCallEnded(true);
    cleanupFunction();
  }, [cleanupFunction]);

  /**
   * Handle peer disconnect
   */
  const handlePeerDisconnect = useCallback(() => {
    if (!(peerRef && peerRef.current)) return;

    for (let conns in peerRef.current.connections) {
      peerRef.current.connections[conns].forEach((conn) => {
        if (conn.peerConnection) {
          conn.peerConnection.close();
        }
        if (conn.close) {
          conn.close();
        }
      });
    }

    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }
  }, []);

  /**
   * Listen to socket events for video call
   */
  useEffect(() => {
    if (!socket) return;

    const handleCallJoin = ({ userInfo }) => {
      const { from_user } = userInfo;
      if (!(peerRef && peerRef.current)) return;
      connectToPeer(peerRef.current, from_user);
    };

    const handleOffer = (offer) => {
      peerRef.current?.signal(offer);
    };

    const handleAnswer = (answer) => {
      peerRef.current?.signal(answer);
    };

    const handleIceCandidate = (candidate) => {
      peerRef.current?.signal(candidate);
    };

    const handleCallClose = () => {
      setDisplayMsg({
        showMsg: true,
        msg: `${toUser?.fullname} left the meeting, redirecting back to home screen in 5 seconds...`,
      });
      cleanupFunction();
    };

    socket.on('ON_CALL_JOIN', handleCallJoin);
    socket.on(EVENTS.VIDEO_CALL.ON_OFFER, handleOffer);
    socket.on(EVENTS.VIDEO_CALL.ON_ANSWER, handleAnswer);
    socket.on(EVENTS.VIDEO_CALL.ON_ICE_CANDIDATE, handleIceCandidate);
    socket.on(EVENTS.VIDEO_CALL.ON_CLOSE, handleCallClose);

    return () => {
      socket.off('ON_CALL_JOIN', handleCallJoin);
      socket.off(EVENTS.VIDEO_CALL.ON_OFFER, handleOffer);
      socket.off(EVENTS.VIDEO_CALL.ON_ANSWER, handleAnswer);
      socket.off(EVENTS.VIDEO_CALL.ON_ICE_CANDIDATE, handleIceCandidate);
      socket.off(EVENTS.VIDEO_CALL.ON_CLOSE, handleCallClose);
    };
  }, [
    socket,
    toUser,
    connectToPeer,
    cleanupFunction,
    setDisplayMsg,
  ]);

  return {
    // State
    remoteStream,
    localStream,
    isCallEnded,
    isTraineeJoined,
    peerRef,

    // Setters
    setRemoteStream,
    setLocalStream,
    setIsCallEnded,

    // Actions
    handleStartCall,
    cutCall,
    handlePeerDisconnect,
    connectToPeer,
  };
};

