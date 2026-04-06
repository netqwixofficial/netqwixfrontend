import { useState, useEffect, useCallback } from 'react';
import { isScheduledSessionLiveNow } from '../../../../utils/utils';

/**
 * Custom hook for managing active sessions
 * Extracted from NavHomePage/index.jsx to improve maintainability
 */
export const useActiveSessions = ({ scheduledMeetingDetails }) => {
  const [filteredSessions, setFilteredSessions] = useState([]);

  /**
   * Filter sessions that are confirmed and within the current time range
   */
  const filterActiveSessions = useCallback(() => {
    if (!scheduledMeetingDetails?.length) {
      setFilteredSessions([]);
      return;
    }

    const filtered = scheduledMeetingDetails.filter((session) =>
      isScheduledSessionLiveNow(session)
    );

    setFilteredSessions(filtered);
  }, [scheduledMeetingDetails]);

  useEffect(() => {
    filterActiveSessions();
  }, [filterActiveSessions]);

  return {
    filteredSessions,
    filterActiveSessions,
  };
};

