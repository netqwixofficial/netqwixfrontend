import React from 'react';
import { AccountType, BookedSession } from '../../../common/constants';
import { Utils } from '../../../../utils/utils';
import TrainerRenderBooking from '../TrainerRenderBooking';
import TraineeRenderBooking from '../TraineeRenderBooking';

/**
 * BookingCard Component
 * Extracted from bookings/index.jsx to improve maintainability
 * Renders individual booking card based on account type
 */
const BookingCard = ({
  booking,
  accountType,
  booking_index,
  isMeetingCompleted,
  getMeetingAvailability,
  // Trainer props
  selectedClips,
  setSelectedClips,
  setIsOpen,
  setIsOpenID,
  // Trainee props
  isOpen,
  clips,
  setClips,
  addTraineeClipInBookedSession,
}) => {
  const {
    _id,
    status,
    booked_date,
    session_start_time,
    session_end_time,
    start_time,
    end_time,
    trainee_info,
    trainer_info,
    ratings,
    trainee_clips,
    report,
  } = booking;

  const availabilityInfo = getMeetingAvailability(
    booked_date,
    session_start_time,
    session_end_time,
    Intl.DateTimeFormat().resolvedOptions()?.timeZone,
    start_time,
    end_time
  );

  const {
    isStartButtonEnabled,
    has24HoursPassedSinceBooking,
    isCurrentDateBefore,
    isUpcomingSession,
  } = availabilityInfo;

  const isMeetingDone =
    isMeetingCompleted(booking) || has24HoursPassedSinceBooking;

  const renderBookingContent = () => {
    switch (accountType) {
      case AccountType.TRAINER:
        return (
          <TrainerRenderBooking
            _id={_id}
            status={status}
            trainee_info={trainee_info}
            trainer_info={trainer_info}
            isCurrentDateBefore={isCurrentDateBefore}
            isStartButtonEnabled={isStartButtonEnabled}
            isMeetingDone={isMeetingDone}
            isUpcomingSession={isUpcomingSession}
            ratings={ratings}
            booking_index={booking_index}
            trainee_clips={trainee_clips}
            selectedClips={selectedClips}
            setSelectedClips={setSelectedClips}
            report={report}
            session_end_time={session_end_time}
            setIsOpen={setIsOpen}
            setIsOpenID={setIsOpenID}
          />
        );

      case AccountType.TRAINEE:
        return (
          <TraineeRenderBooking
            _id={_id}
            status={status}
            trainee_info={trainee_info}
            trainer_info={trainer_info}
            isCurrentDateBefore={isCurrentDateBefore}
            isStartButtonEnabled={isStartButtonEnabled}
            isMeetingDone={isMeetingDone}
            isUpcomingSession={isUpcomingSession}
            ratings={ratings}
            booking_index={booking_index}
            has24HoursPassedSinceBooking={has24HoursPassedSinceBooking}
            isOpen={isOpen}
            setIsOpen={setIsOpen}
            clips={clips}
            setClips={setClips}
            selectedClips={selectedClips}
            setSelectedClips={setSelectedClips}
            setIsOpenID={setIsOpenID}
            addTraineeClipInBookedSession={addTraineeClipInBookedSession}
            trainee_clips={trainee_clips}
            report={report}
            session_end_time={session_end_time}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="card mt-2 trainer-bookings-card" key={`booking-${_id}`}>
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h5>{trainee_info?.fullname || trainer_info?.fullname}</h5>
            <p className="mb-1">
              Date: {Utils.getDateInLocalFormat(start_time || booked_date)}
            </p>
            <p className="mb-1">
              Time: {Utils.formatTime(start_time || session_start_time)} -{" "}
              {Utils.formatTime(end_time || session_end_time)}
            </p>
            <span
              className={`badge ${
                status === BookedSession.confirmed
                  ? 'badge-success'
                  : status === BookedSession.canceled
                  ? 'badge-danger'
                  : 'badge-secondary'
              }`}
            >
              {status}
            </span>
          </div>
        </div>
        <div className="mt-3">{renderBookingContent()}</div>
      </div>
    </div>
  );
};

export default BookingCard;

