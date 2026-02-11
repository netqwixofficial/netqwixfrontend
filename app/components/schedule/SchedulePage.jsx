import React, { useState, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../store";
import { authState } from "../auth/auth.slice";
import { updateProfileAsync } from "../trainer/trainer.slice";
import { currentTimeZone } from "../../../utils/videoCall";
import { toast } from "react-toastify";
import { useMediaQuery } from "../../hook/useMediaQuery";
import { Save, Plus, Copy, X, Clock, Globe, Calendar } from "react-feather";
import timezones from "../../../utils/timezones.json";
import ScheduleSkeleton from "../common/ScheduleSkeleton";
import CircleLoader from "../../common/CircleLoader";
import "./SchedulePage.scss";

const initialDayValue = {
  Sun: [{ start: "09:00 AM", end: "05:00 PM" }],
  Mon: [{ start: "09:00 AM", end: "05:00 PM" }],
  Tue: [{ start: "09:00 AM", end: "05:00 PM" }],
  Wed: [{ start: "09:00 AM", end: "05:00 PM" }],
  Thu: [{ start: "09:00 AM", end: "05:00 PM" }],
  Fri: [{ start: "09:00 AM", end: "05:00 PM" }],
  Sat: [{ start: "09:00 AM", end: "05:00 PM" }],
};

const appointmentDurations = [
  { label: "15 minutes", value: 15 },
  { label: "30 minutes", value: 30 },
  { label: "1 hour", value: 60 },
  { label: "2 hours", value: 120 },
];

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DayAvailability = ({ day, times, setTimes, copyToAll, width600, width900 }) => {

  const handleTimeChange = (index, field, value) => {
    const newTimes = [...times];
    const newSlot = { ...times[index] };

    if (field === "end") {
      const [startHour, startMinutes] = parseTime(newSlot.start);
      const [endHour, endMinutes] = parseTime(value);

      if (endHour < startHour || (endHour === startHour && endMinutes < startMinutes)) {
        toast.error("End time cannot be earlier than start time.");
        return;
      }
    } else if (field === "start") {
      const [newStartHour, newStartMinutes] = parseTime(value);
      const [currentEndHour, currentEndMinutes] = parseTime(newSlot.end);

      if (newStartHour > currentEndHour || (newStartHour === currentEndHour && newStartMinutes > currentEndMinutes)) {
        toast.error("Start time cannot be later than end time.");
        return;
      }
    }

    newSlot[field] = value;
    newTimes[index] = newSlot;
    setTimes(newTimes);
  };

  const generateTimeOptions = () => {
    const times = [];
    for (let h = 1; h < 12; h++) {
      times.push(`${h}:00 AM`);
      times.push(`${h}:30 AM`);
    }
    times.push("12:00 PM");
    times.push("12:30 PM");
    for (let h = 1; h < 12; h++) {
      times.push(`${h}:00 PM`);
      times.push(`${h}:30 PM`);
    }
    times.push("12:00 AM");
    return times;
  };

  const timeOptions = generateTimeOptions();

  const parseTime = (time) => {
    const [hour, minute] = time.split(":");
    const parsedHour = parseInt(hour, 10);
    const isPM = time.includes("PM");
    return [(parsedHour % 12) + (isPM ? 12 : 0), minute.slice(0, 2)];
  };

  const getNextTimeSlot = () => {
    if (times.length === 0) return { start: "9:00 AM", end: "10:00 AM" };

    const lastSlot = times[times.length - 1];
    const [lastEndHour, lastEndMinutes] = parseTime(lastSlot.end);

    const nextStartHour = (lastEndHour + 1) % 24;
    const nextPeriod = nextStartHour >= 12 ? "PM" : "AM";
    const displayStartHour = nextStartHour % 12 === 0 ? 12 : nextStartHour % 12;
    const nextStart = `${displayStartHour}:${lastEndMinutes} ${nextPeriod}`;

    const nextEndHour = (lastEndHour + 2) % 24;
    const nextEndPeriod = nextEndHour >= 12 ? "PM" : "AM";
    const displayEndHour = nextEndHour % 12 === 0 ? 12 : nextEndHour % 12;
    const nextEnd = `${displayEndHour}:${lastEndMinutes} ${nextEndPeriod}`;

    if (nextStart === "11:00 PM") {
      return { start: "11:00 PM", end: "12:00 PM" };
    }

    return { start: nextStart, end: nextEnd };
  };

  const addTimeSlot = () => {
    if (times.length === 0 || times[times.length - 1].end !== "12:00 PM") {
      setTimes([...times, getNextTimeSlot()]);
    }
  };

  const removeTimeSlot = (index) => {
    setTimes(times.filter((_, i) => i !== index));
  };

  return (
    <div
      className="day-availability-item"
      style={{
        borderBottom: "1px solid #f0f0f0",
        padding: width600 ? "16px 0" : "18px 0",
        transition: "all 0.2s ease"
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: width600 ? "column" : "row",
          alignItems: width600 ? "flex-start" : "center",
          justifyContent: "space-between",
          gap: width600 ? "16px" : width900 ? "18px" : "24px",
          width: "100%"
        }}
      >
        {/* Day Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            minWidth: width600 ? "100%" : width900 ? "100px" : "120px",
            flexShrink: 0
          }}
        >
          <h4
            style={{
              margin: 0,
              fontSize: width600 ? "15px" : "16px",
              fontWeight: "600",
              color: "#1a1a1a",
              minWidth: width600 ? "auto" : "100px"
            }}
          >
            {day === "Sun" ? "Sunday" : day === "Mon" ? "Monday" : day === "Tue" ? "Tuesday" : day === "Wed" ? "Wednesday" : day === "Thu" ? "Thursday" : day === "Fri" ? "Friday" : "Saturday"}
          </h4>
        </div>

        {/* Time Slots Section */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            width: width600 ? "100%" : "auto",
            minWidth: 0
          }}
        >
          {times.length === 0 ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px",
                color: "#999",
                fontSize: width600 ? "13px" : "14px"
              }}
            >
              <Clock size={16} color="#999" />
              <span>Unavailable</span>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px"
              }}
            >
              {times.map((slot, index) => (
                <div
                  key={index}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: width600 ? "8px" : "10px",
                    flexWrap: width600 ? "wrap" : "nowrap",
                    padding: width600 ? "8px 0" : "10px 0"
                  }}
                >
                  <select
                    onChange={(e) => handleTimeChange(index, "start", e.target.value)}
                    value={slot.start}
                    style={{
                      padding: width600 ? "8px 10px" : "10px 12px",
                      border: "1px solid #ddd",
                      borderRadius: "6px",
                      fontSize: width600 ? "13px" : "14px",
                      color: "#333",
                      backgroundColor: "#fff",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      flex: width600 ? "1 1 calc(50% - 4px)" : "0 1 auto",
                      minWidth: width600 ? "calc(50% - 4px)" : "140px",
                      outline: "none"
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#000080";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#ddd";
                    }}
                  >
                    {timeOptions.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>

                  <span
                    style={{
                      color: "#666",
                      fontSize: width600 ? "16px" : "18px",
                      fontWeight: "600",
                      flexShrink: 0
                    }}
                  >
                    -
                  </span>

                  <select
                    value={slot.end}
                    onChange={(e) => handleTimeChange(index, "end", e.target.value)}
                    style={{
                      padding: width600 ? "8px 10px" : "10px 12px",
                      border: "1px solid #ddd",
                      borderRadius: "6px",
                      fontSize: width600 ? "13px" : "14px",
                      color: "#333",
                      backgroundColor: "#fff",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      flex: width600 ? "1 1 calc(50% - 4px)" : "0 1 auto",
                      minWidth: width600 ? "calc(50% - 4px)" : "140px",
                      outline: "none"
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#000080";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#ddd";
                    }}
                  >
                    {timeOptions.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={() => removeTimeSlot(index)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: width600 ? "32px" : "36px",
                      height: width600 ? "32px" : "36px",
                      backgroundColor: "transparent",
                      border: "1px solid #ddd",
                      borderRadius: "6px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      color: "#dc2626",
                      flexShrink: 0
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#fee2e2";
                      e.currentTarget.style.borderColor = "#fca5a5";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.borderColor = "#ddd";
                    }}
                    aria-label="Remove time slot"
                  >
                    <X size={width600 ? 16 : 18} strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: width600 ? "8px" : "10px",
            flexShrink: 0,
            flexDirection: width600 ? "row" : "row"
          }}
        >
          <button
            onClick={addTimeSlot}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: width600 ? "36px" : "40px",
              height: width600 ? "36px" : "40px",
              backgroundColor: "transparent",
              border: "1px solid #4ade80",
              borderRadius: "6px",
              cursor: "pointer",
              transition: "all 0.2s ease",
              color: "#16a34a",
              flexShrink: 0
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#dcfce7";
              e.currentTarget.style.borderColor = "#22c55e";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.borderColor = "#4ade80";
            }}
            aria-label="Add time slot"
            title="Add time slot"
          >
            <Plus size={width600 ? 18 : 20} strokeWidth={2} />
          </button>

          {times.length > 0 && (
            <button
              onClick={() => copyToAll()}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: width600 ? "36px" : "40px",
                height: width600 ? "36px" : "40px",
                backgroundColor: "transparent",
                border: "1px solid #60a5fa",
                borderRadius: "6px",
                cursor: "pointer",
                transition: "all 0.2s ease",
                color: "#2563eb",
                flexShrink: 0
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#dbeafe";
                e.currentTarget.style.borderColor = "#3b82f6";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.borderColor = "#60a5fa";
              }}
              aria-label="Copy to all days"
              title="Copy schedule to all days"
            >
              <Copy size={width600 ? 16 : 18} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const SchedulePage = () => {
  const dispatch = useAppDispatch();
  const { userInfo } = useAppSelector(authState);
  const width600 = useMediaQuery(600);
  const width900 = useMediaQuery(900);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [availability, setAvailability] = useState(initialDayValue);
  const [timeZone, setTimeZone] = useState(currentTimeZone());
  const [selectedDuration, setSelectedDuration] = useState(15);

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      setIsLoading(true);
      try {
        // Simulate loading time for better UX
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (userInfo?.extraInfo?.availabilityInfo) {
          setAvailability(
            userInfo.extraInfo.availabilityInfo.availability || initialDayValue
          );
          setTimeZone(
            userInfo.extraInfo.availabilityInfo.timeZone || currentTimeZone()
          );
          setSelectedDuration(
            userInfo.extraInfo.availabilityInfo.duration || 15
          );
        }
      } catch (error) {
        console.error("Error loading schedule data:", error);
        toast.error("Failed to load schedule data");
      } finally {
        setIsLoading(false);
      }
    };

    if (userInfo) {
      loadUserData();
    }
  }, [userInfo]);

  const setDayTimes = (day, newTimes) => {
    setAvailability((prev) => ({
      ...prev,
      [day]: newTimes,
    }));
  };

  const copyToAll = (day_key) => {
    const copiedTimes = availability[day_key].length
      ? JSON.parse(JSON.stringify(availability[day_key]))
      : [];
    const newAvailability = Object.keys(availability).reduce((acc, key) => {
      acc[key] = copiedTimes;
      return acc;
    }, {});
    setAvailability(newAvailability);
    toast.success("Schedule copied to all days");
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const working_hours = { availability, selectedDuration, timeZone };
      await dispatch(
        updateProfileAsync({
          extraInfo: {
            ...userInfo?.extraInfo,
            availabilityInfo: working_hours,
          },
        })
      ).unwrap();
      toast.success("Schedule saved successfully!");
    } catch (error) {
      console.error("Error saving schedule:", error);
      toast.error("Failed to save schedule. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <ScheduleSkeleton />;
  }

  return (
    <div className="schedule-page-container">
      <style>{`
        .schedule-page-container {
          padding: ${width600 ? "16px" : width900 ? "20px" : "24px"};
          max-width: 1200px;
          margin: 0 auto;
          min-height: 100vh;
          background: #ffffff;
          box-sizing: border-box;
        }
        
        @media (max-width: 600px) {
          .schedule-page-container {
            padding: 12px;
          }
        }
      `}</style>

      {/* Header Section */}
      <div
        style={{
          marginBottom: width600 ? "20px" : "24px",
          paddingBottom: width600 ? "16px" : "20px",
          borderBottom: "2px solid #f0f0f0"
        }}
      >
        <h1
          style={{
            fontSize: width600 ? "20px" : width900 ? "24px" : "28px",
            fontWeight: "600",
            color: "#1a1a1a",
            margin: 0,
            lineHeight: "1.3"
          }}
        >
          Schedule Management
        </h1>
        <p
          style={{
            fontSize: width600 ? "13px" : "14px",
            color: "#666",
            margin: "8px 0 0 0"
          }}
        >
          Manage your weekly availability and appointment settings
        </p>
      </div>

      {/* Settings Section */}
      <div
        style={{
          marginBottom: width600 ? "24px" : "28px",
          paddingBottom: width600 ? "20px" : "24px",
          borderBottom: "1px solid #f0f0f0"
        }}
      >
        <h2
          style={{
            fontSize: width600 ? "18px" : width900 ? "20px" : "22px",
            fontWeight: "600",
            color: "#1a1a1a",
            margin: `0 0 ${width600 ? "16px" : "20px"} 0`,
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <Clock size={20} color="#666" strokeWidth={2} />
          <span>Settings</span>
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: width600 ? "1fr" : width900 ? "1fr 1fr" : "1fr 1fr",
            gap: width600 ? "20px" : "24px"
          }}
        >
          {/* Timezone Selector */}
          <div>
            <label
              htmlFor="timeZone"
              style={{
                display: "block",
                fontSize: width600 ? "13px" : "14px",
                fontWeight: "500",
                color: "#333",
                marginBottom: "8px"
              }}
            >
              Time Zone
            </label>
            <select
              id="timeZone"
              value={timeZone}
              onChange={(e) => setTimeZone(e.target.value)}
              style={{
                width: "100%",
                padding: width600 ? "10px 12px" : "12px 16px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                fontSize: width600 ? "14px" : "15px",
                color: "#333",
                backgroundColor: "#fff",
                cursor: "pointer",
                transition: "all 0.2s ease",
                outline: "none"
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#000080";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#ddd";
              }}
            >
              {timezones.map((zone, index) => (
                <option key={index} value={zone.value}>
                  {zone.label}
                </option>
              ))}
            </select>
          </div>

          {/* Appointment Duration */}
          <div>
            <label
              htmlFor="appointmentDuration"
              style={{
                display: "block",
                fontSize: width600 ? "13px" : "14px",
                fontWeight: "500",
                color: "#333",
                marginBottom: "8px"
              }}
            >
              Appointment Duration
            </label>
            <select
              id="appointmentDuration"
              value={selectedDuration}
              onChange={(e) => setSelectedDuration(Number(e.target.value))}
              style={{
                width: "100%",
                padding: width600 ? "10px 12px" : "12px 16px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                fontSize: width600 ? "14px" : "15px",
                color: "#333",
                backgroundColor: "#fff",
                cursor: "pointer",
                transition: "all 0.2s ease",
                outline: "none"
              }}
              onFocus={(e) => {
                e.target.style.borderColor = "#000080";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#ddd";
              }}
            >
              {appointmentDurations.map((duration) => (
                <option key={duration.value} value={duration.value}>
                  {duration.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Availability Section */}
      <div
        style={{
          marginBottom: width600 ? "24px" : "28px"
        }}
      >
        <h2
          style={{
            fontSize: width600 ? "18px" : width900 ? "20px" : "22px",
            fontWeight: "600",
            color: "#1a1a1a",
            margin: `0 0 ${width600 ? "20px" : "24px"} 0`,
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }}
        >
          <Calendar size={20} color="#666" strokeWidth={2} />
          <span>Weekly Availability</span>
        </h2>

        {weekDays.map((day) => (
          <DayAvailability
            key={day}
            day={day}
            times={availability[day] || []}
            setTimes={(newTimes) => setDayTimes(day, newTimes)}
            copyToAll={() => copyToAll(day)}
            width600={width600}
            width900={width900}
          />
        ))}
      </div>

      {/* Save Button */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-start",
          marginTop: width600 ? "24px" : "28px",
          paddingTop: width600 ? "20px" : "24px",
          borderTop: "1px solid #f0f0f0"
        }}
      >
        <button
          onClick={handleSave}
          disabled={isSaving}
          type="button"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            padding: width600 ? "12px 24px" : "14px 32px",
            backgroundColor: isSaving ? "#94a3b8" : "#000080",
            color: "#fff !important",
            border: "none",
            borderRadius: "8px",
            fontSize: width600 ? "14px" : "15px",
            fontWeight: "600",
            cursor: isSaving ? "not-allowed" : "pointer",
            transition: "all 0.2s ease"
          }}
          onMouseEnter={(e) => {
            if (!isSaving) {
              e.currentTarget.style.backgroundColor = "#0000b0";
            }
          }}
          onMouseLeave={(e) => {
            if (!isSaving) {
              e.currentTarget.style.backgroundColor = "#000080";
            }
          }}
        >
          {isSaving ? (
            <>
              <CircleLoader size={18} />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save size={18} strokeWidth={2.5} />
              <span>Save Schedule</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default SchedulePage;

