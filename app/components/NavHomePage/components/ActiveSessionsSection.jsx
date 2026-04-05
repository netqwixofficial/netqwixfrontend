import React from 'react';
import { AccountType } from '../../../common/constants';
import { Utils } from '../../../../utils/utils';
import { formatTimeInLocalZone } from '../../../../utils/utils';
import TrainerRenderBooking from '../../bookings/TrainerRenderBooking';
import TraineeRenderBooking from '../../bookings/TraineeRenderBooking';
import { Star } from 'react-feather';

/**
 * ActiveSessionsSection Component
 * Extracted from NavHomePage/index.jsx to improve maintainability
 * Displays currently active sessions
 */
const ActiveSessionsSection = ({
  filteredSessions,
  accountType,
  width600,
  showRatingLabel,
  renderBooking,
}) => {
  if (!filteredSessions || !filteredSessions.length) {
    return null;
  }

  return (
    <div className="upcoming_session">
      <h2 className="text-center">Active Sessions</h2>
      {filteredSessions.map((session, booking_index) => (
        <div
          className="card mt-2 trainer-bookings-card upcoming_session_content"
          key={`active-session-${session._id}`}
        >
          <div className="card-body" style={{ padding: '5px' }}>
            <div
              className="d-flex justify-content-center"
              style={{ gap: width600 ? '10px' : '30px' }}
            >
              {/* User Avatar */}
              <div>
                <div
                  style={{
                    width: '80px',
                    height: '80px',
                    border: '2px solid rgb(0, 0, 128)',
                    borderRadius: '5px',
                    padding: '5px',
                  }}
                >
                  <img
                    src={
                      session.trainer_info.profile_picture ||
                      session.trainee_info.profile_picture
                        ? Utils.getImageUrlOfS3(
                            accountType === AccountType.TRAINER
                              ? session.trainee_info.profile_picture
                              : session.trainer_info.profile_picture
                          )
                        : '/assets/images/demoUser.png'
                    }
                    alt="user_image"
                    className="rounded"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      borderRadius: '50%',
                      transition: 'all 0.6s linear',
                    }}
                    onError={(e) => {
                      e.target.src = '/assets/images/demoUser.png';
                    }}
                  />
                </div>
                <div className="mt-2">
                  <dt className="ml-1">
                    {accountType === AccountType.TRAINER
                      ? session.trainee_info.fullname
                      : session.trainer_info.fullname}
                  </dt>
                </div>
              </div>

              {/* Session Details */}
              <div className="d-flex flex-column justify-content-center">
                <div>
                  <div
                    className={`d-flex ${
                      width600 ? 'flex-column' : 'flex-row'
                    }`}
                  >
                    <div>Date :</div>
                    <dt className="ml-1">
                      {Utils.getDateInFormat(session.booked_date)}
                    </dt>
                  </div>
                </div>
                <div>
                  <div
                    className={`d-flex ${
                      width600 ? 'flex-column' : 'flex-row'
                    }`}
                  >
                    <div>Time :</div>
                    <dt className="ml-1">{`${formatTimeInLocalZone(
                      session.session_start_time || session.start_time
                    )} - ${formatTimeInLocalZone(
                      session.session_end_time || session.end_time
                    )}`}</dt>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            className="card-footer"
            style={{
              padding: width600 ? '5px' : '5px',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <div>
              <div>{showRatingLabel(session.ratings)}</div>
              <div>
                {renderBooking(
                  session,
                  session.status,
                  booking_index,
                  session.booked_date,
                  session.session_start_time,
                  session.session_end_time,
                  session._id,
                  session.trainee_info,
                  session.trainer_info,
                  session.ratings,
                  session.trainee_clips,
                  session.report,
                  session.start_time,
                  session.end_time
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ActiveSessionsSection;

