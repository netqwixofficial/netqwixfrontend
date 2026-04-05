import React, { createContext, useEffect, useState, useRef } from "react";
import socketio from "socket.io-client";
import { useAppSelector } from "../../store";
import { authState } from "../auth/auth.slice";
import { LOCAL_STORAGE_KEYS } from "../../common/constants";
import { setupMockInstantLesson } from "../instant-lesson/mockInstantLesson";

const URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

export const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { authToken } = useAppSelector(authState);
  const socketRef = useRef(null);

  useEffect(() => {
    let token = localStorage.getItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN);
    if (authToken) {
      token = authToken;
    }

    if (!token) {
      // Disconnect existing socket if token is removed
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      return;
    }

    // Guard: Prevent socket connection if URL is missing
    if (!URL) {
      console.error('[SOCKET ERROR] Cannot connect socket: NEXT_PUBLIC_API_BASE_URL is undefined');
      return;
    }

    // Only create new socket if we don't have one or if token changed
    const currentToken = socketRef.current?.io?.opts?.query?.authorization;
    if (socketRef.current && currentToken === token && socketRef.current.connected) {
      // Socket already exists and is connected with same token, no need to recreate
      return;
    }

    // Disconnect existing socket before creating new one
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    console.log('[Socket] Attempting to connect to:', URL);
    console.log('[Socket] Token present:', !!token);

    const newSocket = socketio.connect(URL, {
      query: { authorization: token, autoConnect: true },
      // Prefer WebSocket first (fewer HTTP round-trips). Polling remains fallback for strict proxies.
      transports: ["websocket", "polling"],
      // Increase reconnection attempts
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      // Timeout for connection attempts
      timeout: 30000,
      // Force new connection to avoid stale connections
      forceNew: false,
      // Upgrade transport automatically
      upgrade: true,
      // Remember transport preference
      rememberUpgrade: true,
    });

    // Track connection attempts
    let connectionAttempts = 0;

    newSocket.on('connect_error', (error) => {
      connectionAttempts++;
      console.error('[Socket] Connection error:', {
        message: error.message,
        type: error.type,
        description: error.description,
        attempts: connectionAttempts,
        transport: newSocket.io?.engine?.transport?.name || 'unknown'
      });
      
      // If websocket fails multiple times, try forcing polling
      if (connectionAttempts >= 3 && newSocket.io?.engine?.transport?.name === 'websocket') {
        console.warn('[Socket] WebSocket failed multiple times, attempting to upgrade to polling');
        newSocket.io.opts.transports = ['polling'];
      }
    });

    newSocket.on('reconnect_error', (error) => {
      console.error('[Socket] Reconnection error:', {
        message: error.message,
        type: error.type,
        transport: newSocket.io?.engine?.transport?.name || 'unknown'
      });
    });

    newSocket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`[Socket] Reconnection attempt ${attemptNumber}`);
    });

    newSocket.on('reconnect_failed', () => {
      console.error('[Socket] Reconnection failed after all attempts');
      console.error('[Socket] Final transport:', newSocket.io?.engine?.transport?.name || 'unknown');
      setSocket(null);
    });

    newSocket.on('connect', () => {
      connectionAttempts = 0; // Reset on successful connection
      setSocket(newSocket);
      const transport = newSocket.io?.engine?.transport?.name || 'unknown';
      console.log(`[Socket] Connected successfully using ${transport} transport`);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      connectionAttempts = 0; // Reset on successful reconnection
      setSocket(newSocket);
      const transport = newSocket.io?.engine?.transport?.name || 'unknown';
      console.log(`[Socket] Reconnected after ${attemptNumber} attempts using ${transport} transport`);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      // Don't set socket to null on disconnect - it might reconnect
      // Only set to null if it's a forced disconnect or after reconnect_failed
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Set up mock function for testing (only in development)
    if (process.env.NODE_ENV === "development") {
      setupMockInstantLesson(newSocket);
    }

    // Cleanup on unmount or token change
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [authToken]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

// Keep the old getSocket function for backward compatibility
export const getSocket = () => {
  // This is a placeholder - components should use SocketContext instead
  return null;
};

