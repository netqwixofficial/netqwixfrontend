import { useState, useEffect, useCallback } from 'react';
import { DateTime } from 'luxon';
import { CovertTimeAccordingToTimeZone } from '../../../../utils/utils';

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

    const filtered = scheduledMeetingDetails.filter((session) => {
      const { ratings } = session;
      const start_time = session.session_start_time || session.start_time;
      const end_time = session.session_end_time || session.end_time;
      if (!start_time || !end_time) return false;

      const startTimeUpdated = CovertTimeAccordingToTimeZone(
        start_time,
        session.time_zone,
        false
      );
      const endTimeUpdated = CovertTimeAccordingToTimeZone(
        end_time,
        session.time_zone,
        false
      );

      const currentTime = DateTime.now();
      const startTime = DateTime.fromISO(startTimeUpdated, { zone: 'utc' });
      const endTime = DateTime.fromISO(endTimeUpdated, { zone: 'utc' });

      const currentDate = currentTime.toFormat('yyyy-MM-dd');
      const currentTimeOnly = currentTime.toFormat('HH:mm');

      const startDate = startTime.toFormat('yyyy-MM-dd');
      const startTimeOnly = startTime.toFormat('HH:mm');

      const endDate = endTime.toFormat('yyyy-MM-dd');
      const endTimeOnly = endTime.toFormat('HH:mm');

      const isDateSame =
        currentDate === startDate && currentDate === endDate;
      const isWithinTimeFrame =
        isDateSame &&
        currentTimeOnly >= startTimeOnly &&
        currentTimeOnly <= endTimeOnly;

      return isWithinTimeFrame && !ratings;
    });

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

