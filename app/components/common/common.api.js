import axios from "axios";
import { axiosInstance } from "../../../config/axios-interceptor";
import { convertTimesForDataArray, CovertTimeAccordingToTimeZone, Utils } from "../../../utils/utils";
import { LOCAL_STORAGE_KEYS } from "../../common/constants";
import store from "../../store";
import { DateTime } from "luxon";
export const addRating = async (payload) => {
  try {
    const res = await axiosInstance({
      method: "put",
      url: `/user/rating`,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      data: JSON.stringify(payload),
    });
    return res.data;
  } catch (err) {
    throw err;
  }
};

export const getScheduledMeetingDetails = async (payload) => {
  console.trace('[API AUDIT] getScheduledMeetingDetails called from:');
  try {
    const response = await axiosInstance({
      method: "get",
      url: `/user/scheduled-meetings`,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        Authorization: `Bearer ${Utils.getToken(
          LOCAL_STORAGE_KEYS.ACCESS_TOKEN
        )}`,
      },
      params: payload,
      timeout: 60000, // 60s for scheduled-meetings (avoids timeout during call when backend is slow)
    });
    

    let filteredData = response.data?.data || [];

    // Edge case: Handle empty or invalid response
    if (!Array.isArray(filteredData)) {
      console.warn("getScheduledMeetingDetails: Invalid data format received");
      return { ...response.data, data: [] };
    }

    if (payload?.status === "upcoming") {
      const now = new Date();
      filteredData = filteredData.filter((item) => {
        const isBookedOrConfirmed = item?.status === "booked" || item?.status === "confirmed";
        if (!isBookedOrConfirmed) return false;
        const rawEndTime = item?.end_time;
        if (!rawEndTime) {
          // If no end_time, check start_time or booked_date as fallback
          const rawStartTime = item?.start_time;
          if (rawStartTime) {
            try {
              return new Date(rawStartTime) > now;
            } catch (e) {
              console.warn("Error checking start_time for upcoming filter:", item?._id, e);
              return false;
            }
          }
          // If no time fields, allow it (backend should have filtered already)
          return true;
        }
        try {
          // Allow bookings that haven't ended yet (with small buffer for timezone differences)
          return new Date(rawEndTime) > now;
        } catch (e) {
          console.warn("Error checking end_time for upcoming filter:", item?._id, e);
          return false;
        }
      });
    }

    // Convert times for the filtered data
    filteredData = convertTimesForDataArray(filteredData);

    // Iterate through the data and update statuses if needed
    filteredData = filteredData.map((item, index) => {
      // Edge case: Skip invalid items
      if (!item || !item._id) {
        console.warn("Skipping invalid booking item at index:", index);
        return item;
      }

      if (item.status === "booked" || item.status === "confirmed") {
        try {
          const availabilityInfo = Utils.meetingAvailability(
            item.booked_date,
            item.session_start_time,
            item.session_end_time,
            item.time_zone, // Assuming `userTimeZone` is `item.time_zone`
            item.start_time,
            item.end_time
          );
          const { has24HoursPassedSinceBooking } = availabilityInfo || {};

          const accountType = store.getState()?.auth?.accountType;

          const isMeetingCompleted = (detail) => {
            if (!detail || !detail.ratings || !accountType) return false;
            const ratingInfo = detail.ratings[accountType.toLowerCase()];
            return ratingInfo && ratingInfo.sessionRating;
          };

          // Check if the meeting time has actually passed before marking as completed
          const isMeetingTimePassed = () => {
            if (!item.end_time) return false;
            try {
              const endTime = new Date(item.end_time);
              const now = new Date();
              return endTime < now;
            } catch (e) {
              console.warn("Error checking meeting end time:", item._id, e);
              return false;
            }
          };

          // Only mark as completed if:
          // 1. Meeting has a rating AND the meeting time has passed, OR
          // 2. 24 hours have passed since booking AND the meeting time has passed
          // This prevents marking future meetings as completed just because they have ratings
          const shouldMarkAsCompleted = 
            (isMeetingCompleted(item) && isMeetingTimePassed()) || 
            (has24HoursPassedSinceBooking && isMeetingTimePassed());

          if (shouldMarkAsCompleted) {
            item.status = "completed"; // Update the status to completed
          }
        } catch (error) {
          console.warn("Error processing booking availability:", item._id, error);
          // Continue with original item if error occurs
        }
      }
      return item;
    });

    if (payload?.status === "upcoming") {
      // After map, drop any item that was marked "completed" (e.g. has rating + time passed)
      filteredData = filteredData.filter((item) => item.status === "booked" || item.status === "confirmed");
    } else if (payload?.status === "canceled") {
      filteredData = filteredData.filter((item) => item.status === "canceled");
    } else if (payload?.status === "completed") {
      filteredData = filteredData.filter((item) => item.status === "completed");
    }

    // Sort by latest bookings first (most recent createdAt or booked_date first)
    // This ensures new bookings appear at the top
    filteredData.sort((a, b) => {
      // Try to use createdAt first (most accurate), fallback to booked_date
      // Edge case: Handle invalid dates
      let dateA = 0;
      try {
        if (a.createdAt) {
          const parsed = new Date(a.createdAt).getTime();
          dateA = isNaN(parsed) ? 0 : parsed;
        } else if (a.booked_date) {
          const parsed = new Date(a.booked_date).getTime();
          dateA = isNaN(parsed) ? 0 : parsed;
        }
      } catch (e) {
        console.warn("Error parsing date for booking:", a._id, e);
        dateA = 0;
      }

      let dateB = 0;
      try {
        if (b.createdAt) {
          const parsed = new Date(b.createdAt).getTime();
          dateB = isNaN(parsed) ? 0 : parsed;
        } else if (b.booked_date) {
          const parsed = new Date(b.booked_date).getTime();
          dateB = isNaN(parsed) ? 0 : parsed;
        }
      } catch (e) {
        console.warn("Error parsing date for booking:", b._id, e);
        dateB = 0;
      }
      
      // Sort descending (newest first)
      return dateB - dateA;
    });
    
    return { ...response.data, data: filteredData };
  } catch (error) {
    
    throw error;
  }
};

export const updateBookedSessionScheduledMeeting = async (payload) => {
  try {
    const response = await axiosInstance({
      method: "put",
      url: `/user/update-booked-session/${payload.id}`,
      data: payload,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        Authorization: `Bearer ${Utils.getToken(
          LOCAL_STORAGE_KEYS.ACCESS_TOKEN
        )}`,
      },
    });
    return response.data;
  } catch (err) {
    throw err;
  }
};

export const updateMobileNumber = async (payload) => {
  try {
    const response = await axiosInstance({
      method: "put",
      url: `/user/update-mobile-number`,
      data: payload,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        Authorization: `Bearer ${Utils.getToken(
          LOCAL_STORAGE_KEYS.ACCESS_TOKEN
        )}`,
      },
    });
    return response.data;
  } catch (err) {
    throw err;
  }
};

export const uploadProfilePicture = async (payload) => {
  try {
    const formData = new FormData();
    formData.append("files", payload.files);
    const response = await axiosInstance({
      url: `/common/upload`,
      method: "post",
      data: formData,
      headers: {
        "Content-Type": "multipart/form-data",
        "Access-Control-Allow-Origin": "*",
        Authorization: `Bearer ${Utils.getToken(
          LOCAL_STORAGE_KEYS.ACCESS_TOKEN
        )}`,
      },
    });
    return response.data;
  } catch (err) {
    throw err;
  }
};

export const addTraineeClipInBookedSession = async (payload) => {
  try {
    const response = await axiosInstance({
      method: "put",
      url: `/user/add-trainee-clip/${payload.id}`,
      data: payload,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        Authorization: `Bearer ${Utils.getToken(
          LOCAL_STORAGE_KEYS.ACCESS_TOKEN
        )}`,
      },
    });
    return response.data;
  } catch (err) {
    throw err;
  }
};

export const createVarificationSession = async (payload) => {
  try {
    const res = await axiosInstance({
      method: "PUT",
      url: `/user/create-verification-session`,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      data: JSON.stringify(payload),
    });
    return res.data;
  } catch (err) {
    throw err;
  }
};

export const createStripeVarificationUrl = async (payload) => {
  try {
    const res = await axiosInstance({
      method: "PUT",
      url: `/user/stripe-account-verification`,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      data: JSON.stringify(payload),
    });
    return res.data;
  } catch (err) {
    throw err;
  }
};

export const getS3SignUrlForProfile = async (payload) => {
  try {
    const response = await axiosInstance({
      method: "PUT",
      url: `/common/update-profile-picture`,
      data: payload,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    return response.data;
  } catch (err) {
    throw err;
  }
};

export const generateThumbnailURL = async (payload) => {
  try {
    const response = await axiosInstance({
      method: "POST",
      url: `https://6d3e-59-99-53-84.ngrok-free.app/common/generate-thumbnail`,
      data: payload,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    return response;
  } catch (err) {
    throw err;
  }
};

export async function pushProfilePhotoToS3(
  presignedUrl,
  uploadPhoto,
  setProgress,
  cb
) {
  const myHeaders = new Headers({
    "Content-Type": "image/*",
    "Content-Disposition": "inline",
  });
  axios
    .put(presignedUrl, uploadPhoto, {
      headers: myHeaders,
      onUploadProgress: (progressEvent) => {
        const { loaded, total } = progressEvent;
        const percentCompleted = (loaded / total) * 100;
        setProgress && setProgress(
          Math.trunc(percentCompleted === 100 ? 0 : percentCompleted)
        );
      },
    })
    .then((response) => {
      cb()
    })
    .catch((error) => {
      console.error("Error:", error);

      if (error.response) {
        console.error("Response data:", error.response.data);
      }
    });
}
