import { axiosInstance } from "../../../config/axios-interceptor";

import {fetchPeerConfig} from "../../../api/index"

export const fetchTraineeWithSlots = async (params) => {
  try {
    const response = await axiosInstance({
      method: "get",
      url: `/trainee/get-trainers-with-slots`,
      params,
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


export const bookSession = async (payload) => {
  try {
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // Include the timezone in the payload
    payload.time_zone = userTimeZone;
    
    // Try to fetch peer config, but don't let it block booking creation
    try {
      const iceServerResponse = await fetchPeerConfig();
      if (iceServerResponse?.data?.formattedIceServers) {
        payload.iceServers = iceServerResponse.data.formattedIceServers;
      } else {
        // Fallback to basic STUN servers if peer config fails
        payload.iceServers = [
          { urls: "stun:stun.cloudflare.com:3478" },
          { urls: "stun:stun.cloudflare.com:53" },
          { urls: "stun:stun.l.google.com:19302" }
        ];
      }
    } catch (peerError) {
      console.warn('Failed to fetch peer config, using fallback STUN servers:', peerError);
      // Use fallback STUN servers if peer config fetch fails
      payload.iceServers = [
        { urls: "stun:stun.cloudflare.com:3478" },
        { urls: "stun:stun.cloudflare.com:53" },
        { urls: "stun:stun.l.google.com:19302" }
      ];
    }
    
    const response = await axiosInstance({
      method: "post",
      url: `/trainee/book-session`,
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


export const createPaymentIntent = async (payload) => {
  try {
    const response = await axiosInstance({
      method: "post",
      url: `/transaction/create-payment-intent`,
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


/** Book instant meeting (timezone/schedule independent). Pass trainer_id only; server uses UTC now. */
export const bookInstantMeeting = async (payload) => {
  try {
    const response = await axiosInstance({
      method: "post",
      url: `/trainee/book-instant-meeting`,
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

export const updateProfile = async (payload) => {
  try {
    const response = await axiosInstance({
      method: "put",
      url: `/trainee/profile`,
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
