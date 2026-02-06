import moment from 'moment';
import React, { useState } from 'react'
import { Utils } from '../../../utils/utils';
import { Button } from 'reactstrap';
import ReportForm from './ReportForm';
const SessionCard = ({ bookingInfo, booking_index }) => {
    const [userTimeZone, setUserTimeZone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone)
    const [isReportFormOpen , setIsReportFormOpen] = useState(false)
    const {
        _id,
        trainee_info,
        trainer_info,
        booked_date,
        status,
        ratings,
        start_time,
        end_time,
      } = bookingInfo;

      const customStartDateTime = moment(start_time)
      ?.tz(userTimeZone)
      ?.format("h:mm a");
    const customEndDateTime = moment(end_time)
      ?.tz(userTimeZone)
      ?.format("h:mm a");
  return (
    <>
    <div
        className="card mt-3 trainer-bookings-card"
        style={{
            cursor : 'pointer'
        }}
        key={`booking-schedule-training${booking_index}`}
        onClick={()=>{
            setIsReportFormOpen(true)
        }}
      >
        <div className="card-body">
          <div className="row">
            <div className="col">
              <dl className="row">
                <dd className="ml-3">Expert :</dd>
                <dt className="ml-1">{trainer_info.fullname}</dt>
              </dl>
            </div>
            <div className="col">
              <dl className="row ml-1">
                <dd>Date :</dd>
                <dt className="ml-1">{Utils.getDateInFormat(booked_date)}</dt>
              </dl>
            </div>
            <div className="w-100"></div>
            <div className="col">
              <dl className="row">
                <dd className="ml-3">Enthusiasts :</dd>
                <dt className="ml-1">{trainee_info.fullname}</dt>
              </dl>
            </div>
            <div className="col">
              <dl className="row">
                <dd className="ml-3">Time :</dd>
                <dt className="ml-1">{`${customStartDateTime} - ${customEndDateTime}`}</dt>
              </dl>
            </div>
          </div>
        {/* <div>
            <Button 
            className='form-btn'
            style={{
               backgroundColor : '#0000805c !important' 
            }}>{status}</Button>
        </div> */}
        </div>
      </div>
      <ReportForm
        isOpen={isReportFormOpen}
        setIsReportFormOpen = {setIsReportFormOpen}
        sessionId = {_id}
        bookingInfo = {{
            trainer:trainer_info.fullname,
            trainee:trainee_info.fullname,
            date:booked_date,
            startTime:customStartDateTime,
            endTime:customEndDateTime
        }}
      />
    </>
  )
}

export default SessionCard