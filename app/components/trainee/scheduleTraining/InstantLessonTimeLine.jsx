import React, { useContext, useEffect, useState } from 'react';
import { Modal, Button, Input, Form, FormGroup, Label } from 'reactstrap';
import moment from 'moment';
import { convertTimesToISO, Utils } from '../../../../utils/utils';
import { createPaymentIntentAsync, bookInstantMeetingAsync } from '../trainee.slice';
import { authAction } from '../../auth/auth.slice';
import { useAppDispatch } from '../../../store';
import { BookedSession, LOCAL_STORAGE_KEYS } from '../../../common/constants';
import { RxCross2 } from 'react-icons/rx';
import { DateTime } from 'luxon';
import { SocketContext } from '../../socket/SocketProvider';
import { EVENTS } from '../../../../helpers/events';
import { initiateTraineeFlow } from '../../instant-lesson/instantLessonHelpers';
import { toast } from 'react-toastify';

const InstantLessons = [
  { label: '15 Minutes', duration: 15 },
  { label: '30 Minutes', duration: 30 },
  { label: '60 Minutes', duration: 60 },
  { label: '2 Hours', duration: 120 },
];

const indexedInstantLesson = {
  15: { label: '15 Minutes', duration: 15 },
  30: { label: '30 Minutes', duration: 30 },
  60: { label: '60 Minutes', duration: 60 },
  120: { label: '2 Hours', duration: 120 },
};

const getTimeRange = (duration, isSchedule, selectedSlot) => {
  if (isSchedule) {
    return {
      startTime: selectedSlot?.start,
      endTime: selectedSlot?.end,
      sessionStartTime: selectedSlot?.start,
      sessionEndTime: selectedSlot?.end,
    };
  }

  const now = moment();
  const startTime = moment(now).add(0, 'minutes');
  const endTime = moment(startTime).add(duration, 'minutes');
   
  return {
    sessionStartTime: startTime.format('HH:mm'),
    sessionEndTime: endTime.format('HH:mm'),
    startTime: startTime,
    endTime: endTime,
  };
};

const InstantLessonTimeLine = ({
  isOpen,
  onClose,
  trainerInfo,
  userInfo,
  setBookSessionPayload,
  setAmount,
  startDate,
  isCommonBooking,
  setIsCommonBooking,
  selectedDate,
  selectedSlot,
}) => {
  const dispatch = useAppDispatch();
  const socket = useContext(SocketContext);
  const isTokenExists = localStorage.getItem(LOCAL_STORAGE_KEYS.ACCESS_TOKEN);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [slot, setSlot] = useState(null);
  const [couponCode, setCouponCode] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmittingInstant, setIsSubmittingInstant] = useState(false);

  useEffect(() => {
    if (isCommonBooking) {
      setSelectedLesson(parseInt(trainerInfo.userInfo?.extraInfo?.availabilityInfo?.selectedDuration));
    }
  }, [trainerInfo, isCommonBooking, selectedSlot]);

  useEffect(() => {
    if (selectedLesson && isCommonBooking) {
      const tempSlot = getTimeRange(selectedLesson.duration, isCommonBooking);
      setSlot(tempSlot);
    }
  }, [selectedLesson, isCommonBooking]);

  const handleFormValidation = () => {
    if (couponCode.length > 50) {
      setFormError("Coupon code cannot exceed 50 characters.");
      return false;
    }
    setFormError("");
    return true;
  };

  return (
    <Modal isOpen={isOpen}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 20px 10px 20px",
          borderBottom: "2px solid #e9ecef",
        }}
      >
        <h3
          style={{
            margin: 0,
            fontSize: "22px",
            fontWeight: "600",
            color: "#000080",
          }}
        >
          {isCommonBooking ? "Schedule Your Lesson" : "Book Instant Lesson"}
        </h3>
        <RxCross2
          style={{
            fontSize: "24px",
            color: "#6c757d",
            cursor: "pointer",
            transition: "color 0.2s ease",
          }}
          onClick={() => {
            onClose(false);
            setSelectedLesson(null);
            setIsCommonBooking(false);
          }}
          onMouseEnter={(e) => {
            e.target.style.color = "#000080";
          }}
          onMouseLeave={(e) => {
            e.target.style.color = "#6c757d";
          }}
        />
      </div>
      <div
        style={{
          padding: '30px',
          maxWidth: '600px',
          margin: '0 auto',
        }}
      >
        <div
          style={{
            backgroundColor: "#f8f9fa",
            borderRadius: "10px",
            padding: "20px",
            marginBottom: "25px",
            border: "1px solid #e9ecef",
          }}
        >
          <p
            style={{
              color: '#495057',
              fontSize: '16px',
              textAlign: 'center',
              margin: 0,
              lineHeight: "1.6",
            }}
          >
            {isCommonBooking
              ? "Book your slot in advance to avoid waiting for the trainer to come online."
              : "Don't want to wait for a scheduled slot? Book an Instant Lesson and get started within just 2 minutes!"}
          </p>
        </div>

        {/* Duration Selection Section */}
        <div
          style={{
            marginBottom: "25px",
          }}
        >
          <label
            style={{
              display: "block",
              fontSize: "16px",
              fontWeight: "600",
              color: "#212529",
              marginBottom: "15px",
            }}
          >
            {isCommonBooking ? "Selected Duration" : "Select Lesson Duration"}
          </label>
          <div
            className="row"
            style={{
              width: '100%',
              margin: '0px auto',
              justifyContent: 'center',
              textAlign: 'center',
            }}
          >
            {!isCommonBooking && InstantLessons.map((item, i) => {
              return (
                <div
                  key={i}
                  onClick={() => setSelectedLesson(item)}
                  className="col-5"
                  style={{
                    border: selectedLesson?.duration === item?.duration 
                      ? '3px solid #28a745' 
                      : '2px solid #000080',
                    backgroundColor: selectedLesson?.duration === item?.duration 
                      ? '#f0f8f0' 
                      : '#fff',
                    cursor: 'pointer',
                    padding: '15px 10px',
                    margin: '8px 5px',
                    borderRadius: '8px',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedLesson?.duration !== item?.duration) {
                      e.currentTarget.style.backgroundColor = '#f8f9fa';
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedLesson?.duration !== item?.duration) {
                      e.currentTarget.style.backgroundColor = '#fff';
                      e.currentTarget.style.transform = 'scale(1)';
                    }
                  }}
                >
                  <b style={{ 
                    color: selectedLesson?.duration === item?.duration 
                      ? '#28a745' 
                      : '#000080',
                    fontSize: '16px',
                  }}>
                    {item.label}
                  </b>
                </div>
              );
            })}
            {isCommonBooking && (
              <div
                className="col-5"
                style={{
                  border: '2px solid #000080',
                  backgroundColor: '#f8f9fa',
                  padding: '15px 10px',
                  margin: '8px 5px',
                  borderRadius: '8px',
                }}
              >
                <b style={{ color: '#000080', fontSize: '16px' }}>
                  {indexedInstantLesson[selectedLesson]?.label}
                </b>
              </div>
            )}
          </div>
        </div>

        {/* Coupon Code Section */}
        <div
          style={{
            marginBottom: "25px",
          }}
        >
          <Form>
            <FormGroup noMargin>
              <label
                style={{
                  display: "block",
                  fontSize: "16px",
                  fontWeight: "600",
                  color: "#212529",
                  marginBottom: "10px",
                }}
              >
                Promo Code (Optional)
              </label>
              <Input
                type="text"
                id="couponCode"
                value={couponCode}
                onChange={(e) => {
                  setCouponCode(e.target.value);
                  if (formError) {
                    setFormError("");
                  }
                }}
                className='mt-0 mb-0'
                style={{
                  border: formError ? '2px solid #dc3545' : '2px solid #000080',
                  color: '#000080',
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  fontSize: "15px",
                }}
                placeholder="Enter promo code"
              />
            </FormGroup>
            {formError && (
              <p style={{ 
                color: '#dc3545', 
                fontSize: '14px',
                marginTop: "8px",
                marginBottom: 0,
              }}>
                {formError}
              </p>
            )}
          </Form>
        </div>

        {/* Action Button */}
        <div className="col-12 mb-3 d-flex justify-content-center align-items-center">
          <Button
            type="button"
            disabled={!selectedLesson || isSubmittingInstant}
            className="mt-3 btn btn-sm btn-primary"
            style={{
              backgroundColor: !selectedLesson ? "#6c757d" : "#000080",
              borderColor: !selectedLesson ? "#6c757d" : "#000080",
              padding: "12px 40px",
              fontSize: "16px",
              fontWeight: "600",
              borderRadius: "8px",
              cursor: !selectedLesson ? "not-allowed" : "pointer",
              transition: "all 0.3s ease",
              minWidth: "200px",
            }}
            onMouseEnter={(e) => {
              if (selectedLesson) {
                e.target.style.backgroundColor = "#0000a0";
                e.target.style.transform = "scale(1.05)";
              }
            }}
            onMouseLeave={(e) => {
              if (selectedLesson) {
                e.target.style.backgroundColor = "#000080";
                e.target.style.transform = "scale(1)";
              }
            }}
            onClick={async () => {
              try {
                if (!selectedLesson || !handleFormValidation()) {
                  return;
                }

                // Instant lesson path: no schedule/timezone dependency; trainer gets request in upcoming
                if (!isCommonBooking) {
                  const trainerId =
                    trainerInfo?.userInfo?._id ||
                    trainerInfo?.userInfo?.trainer_id ||
                    trainerInfo?.userInfo?.id;
                  if (!trainerId || !userInfo?._id) {
                    toast.error("Missing trainer or user info.");
                    return;
                  }
                  setIsSubmittingInstant(true);
                  const res = await dispatch(
                    bookInstantMeetingAsync({ trainer_id: trainerId })
                  ).unwrap();
                  const bookingId =
                    res?.bookingId ||
                    res?.data?.bookingId ||
                    res?.booking?._id;
                  if (!bookingId) {
                    toast.error("Instant lesson could not be created.");
                    setIsSubmittingInstant(false);
                    return;
                  }
                  const coachId = String(trainerId);
                  const duration = selectedLesson?.duration || 30;
                  const expiresAt = new Date(
                    Date.now() + 2 * 60 * 1000
                  ).toISOString();
                  if (socket) {
                    socket.emit(EVENTS.INSTANT_LESSON.REQUEST, {
                      lessonId: String(bookingId),
                      coachId,
                      traineeId: userInfo._id,
                      traineeInfo: userInfo,
                      duration,
                      expiresAt,
                      lessonType: `Instant Lesson - ${duration} min`,
                    });
                  }
                  initiateTraineeFlow({
                    lessonId: String(bookingId),
                    coachId,
                    traineeInfo: userInfo || {},
                    duration,
                    requestData: {},
                  });
                  toast.success("Instant lesson request sent. Trainer will see it in upcoming lessons.");
                  onClose(false);
                  setIsSubmittingInstant(false);
                  return;
                }

                // Scheduled path (existing payment + book-session flow)
                const slot1 = getTimeRange(selectedLesson.duration);
                let startTime = DateTime.fromFormat(
                  selectedSlot?.start,
                  "h:mm a"
                ).toFormat("HH:mm");
                let endTime = DateTime.fromFormat(
                  selectedSlot?.end,
                  "h:mm a"
                ).toFormat("HH:mm");
                const amountPayable = Utils.getMinutesFromHourMM(
                  startTime,
                  endTime,
                  trainerInfo?.userInfo?.extraInfo?.hourly_rate
                );
                let paymentIntentData;
                if (amountPayable > 0) {
                  if (isTokenExists) {
                    dispatch(authAction.updateIsAuthModalOpen(false));
                    paymentIntentData = await dispatch(
                      createPaymentIntentAsync({
                        amount: +amountPayable.toFixed(1),
                        destination: trainerInfo?.userInfo?.stripe_account_id,
                        commission: trainerInfo?.userInfo?.commission,
                        customer: userInfo?.stripe_account_id,
                        couponCode: couponCode,
                      })
                    ).unwrap();
                  } else {
                    dispatch(authAction.updateIsAuthModalOpen(true));
                  }
                  const today =
                    DateTime.now().toISO({
                      suppressMilliseconds: false,
                      includeOffset: false,
                    }) + "Z";
                  const payload = {
                    slot_id: slot?._id,
                    charging_price:
                      paymentIntentData?.data?.result?.amount
                        ? paymentIntentData?.data?.result?.amount / 100
                        : null ?? amountPayable,
                    trainer_id:
                      trainerInfo?.userInfo?._id ||
                      trainerInfo?.userInfo?.trainer_id,
                    trainer_info: trainerInfo,
                    hourly_rate: trainerInfo?.userInfo?.extraInfo?.hourly_rate,
                    status: BookedSession.booked,
                    booked_date: today,
                    session_start_time: startTime,
                    session_end_time: endTime,
                    start_time: convertTimesToISO(today, startTime),
                    end_time: convertTimesToISO(today, endTime),
                  };
                  setBookSessionPayload(payload);
                  setAmount(amountPayable.toFixed(1));
                  onClose(false);
                }
              } catch (error) {
                if (!isCommonBooking) {
                  setIsSubmittingInstant(false);
                }
              }
            }}
          >
            {isCommonBooking ? "Proceed to Checkout" : "Book Instant Lesson"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default InstantLessonTimeLine;
