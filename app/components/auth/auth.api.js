import { axiosInstance } from "../../../config/axios-interceptor";

export const signup = async (payload) => {
  try {
    const res = await axiosInstance({
      method: "post",
      url: `/auth/signup`,
      data: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
      },
    });
    return res.data;
  } catch (err) {
    throw err;
  }
};

export const login = async (payload) => {
  try {
    const res = await axiosInstance({
      method: "post",
      url: `/auth/login`,
      data: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
    return res.data;
  } catch (err) {
    // Enhance network errors with better messages
    if (!err.response) {
      if (err.message === 'Network Error' || err.code === 'ERR_CONNECTION_REFUSED' || err.code === 'ECONNREFUSED') {
        const enhancedError = new Error('Unable to connect to the server. Please check your internet connection and ensure the API server is running.');
        enhancedError.originalError = err;
        enhancedError.isNetworkError = true;
        enhancedError.userMessage = 'Connection refused. Please check if the server is running and try again.';
        throw enhancedError;
      } else if (err.code === 'ECONNABORTED') {
        const enhancedError = new Error('Request timeout. Please check your connection and try again.');
        enhancedError.originalError = err;
        enhancedError.isNetworkError = true;
        enhancedError.userMessage = 'Request took too long. Please try again.';
        throw enhancedError;
      }
    }
    throw err;
  }
};

export const getMe = async () => {
  try {
    const res = await axiosInstance({
      method: "get",
      url: `/user/me`,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    return res.data;
  } catch (err) {
    throw err;
  }
};

export const googleLogin = async (payload) => {
  try {
    const res = await axiosInstance({
      method: "post",
      url: `/auth/verify-google-login`,
      data: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
      },
    });
    return res.data;
  } catch (err) {
    throw err;
  }
};

export const forgetPassword = async (payload) => {
  try {
    const res = await axiosInstance({
      method: "post",
      url: `/auth/forgot-password`,
      data: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
      },
    });
    return res.data;
  } catch (err) {
    throw err;
  }
};

export const verifiedForgetPassword = async (payload) => {
  try {
    const res = await axiosInstance({
      method: "put",
      url: `/auth/confirm-reset-password`,
      data: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
      },
    });
    return res.data;
  } catch (err) {
    throw err;
  }
};

export const fetchAllLatestOnlineUsers = async () => {
  try {
      const response = await axiosInstance({
        method: "get",
        url: `/user/all-online-user`,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
};
