import { useState, useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../../store';
import {
  bookingsState,
  getScheduledMeetingDetailsAsync,
} from '../../common/common.slice';
import { AccountType, BookedSession } from '../../../common/constants';
import { Utils } from '../../../../utils/utils';

/**
 * Custom hook for managing bookings data and operations
 * Extracted from bookings/index.jsx to improve maintainability
 */
export const useBookings = ({ accountType }) => {
  const dispatch = useAppDispatch();
  const { scheduledMeetingDetails, isLoading } = useAppSelector(bookingsState);
  const [activeTabs, setActiveTab] = useState('Upcoming');
  const [bIndex, setBIndex] = useState(0);
  const [bookedSession, setBookedSession] = useState({
    id: '',
    booked_status: '',
  });

  /**
   * Fetch scheduled meeting details
   */
  const fetchBookings = useCallback(() => {
    dispatch(getScheduledMeetingDetailsAsync());
  }, [dispatch]);

  /**
   * Check if meeting is completed
   */
  const isMeetingCompleted = useCallback(
    (detail) => {
      return (
        detail.status === BookedSession.completed ||
        (detail &&
          detail.ratings &&
          detail.ratings[accountType?.toLowerCase()] &&
          detail.ratings[accountType?.toLowerCase()].sessionRating)
      );
    },
    [accountType]
  );

  /**
   * Get meeting availability info
   */
  const getMeetingAvailability = useCallback(
    (booked_date, session_start_time, session_end_time, start_time, end_time) => {
      return Utils.meetingAvailability(
        booked_date,
        session_start_time,
        session_end_time,
        Intl.DateTimeFormat().resolvedOptions()?.timeZone,
        start_time,
        end_time
      );
    },
    []
  );

  /**
   * Filter bookings by status
   */
  const filterBookingsByStatus = useCallback(
    (status) => {
      if (!scheduledMeetingDetails?.length) return [];

      return scheduledMeetingDetails.filter((booking) => {
        const availabilityInfo = getMeetingAvailability(
          booking.booked_date,
          booking.session_start_time,
          booking.session_end_time,
          booking.start_time,
          booking.end_time
        );

        const isMeetingDone =
          isMeetingCompleted(booking) ||
          availabilityInfo.has24HoursPassedSinceBooking;

        switch (status) {
          case 'Upcoming':
            return (
              booking.status === BookedSession.confirmed &&
              !isMeetingDone &&
              availabilityInfo.isUpcomingSession
            );
          case 'Past':
            return isMeetingDone;
          case 'Canceled':
            return booking.status === BookedSession.canceled;
          default:
            return false;
        }
      });
    },
    [scheduledMeetingDetails, getMeetingAvailability, isMeetingCompleted]
  );

  /**
   * Get bookings for current active tab
   */
  const getCurrentTabBookings = useCallback(() => {
    return filterBookingsByStatus(activeTabs);
  }, [activeTabs, filterBookingsByStatus]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  return {
    // State
    scheduledMeetingDetails,
    isLoading,
    activeTabs,
    bIndex,
    bookedSession,

    // Setters
    setActiveTab,
    setBIndex,
    setBookedSession,

    // Actions
    fetchBookings,
    isMeetingCompleted,
    getMeetingAvailability,
    filterBookingsByStatus,
    getCurrentTabBookings,
  };
};

