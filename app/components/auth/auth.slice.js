import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  forgetPassword,
  getMe,
  googleLogin,
  login,
  signup,
  verifiedForgetPassword,
} from "./auth.api";
import { toast } from "react-toastify";
import {
  LOCAL_STORAGE_KEYS,
  SuccessMsgs,
  leftSideBarOptions,
  topNavbarOptions,
} from "../../common/constants";

const initialState = {
  status: "idle",
  userAccType: "",
  isUserLoggedIn: false,
  authToken: "",
  userInfo: {},
  showGoogleRegistrationForm: {
    isFromGoogle: false,
    email: null,
  },
  isRedirectToDashboard : true,
  isAuthModalOpen: false,
  sidebarActiveTab: leftSideBarOptions.HOME,
  topNavbarActiveTab: null,
  sidebarModalActiveTab: null,
  sidebarLockerActiveTab: null,
  accountType: null,
  selectedTrainerId : null,
  selectedDate : null,
  slotData: null,
  userPaymentDetails : null,
  onlineUsers : null,
  selectedOnlineUser : null,
};

export const signupAsync = createAsyncThunk("signup", async (payload) => {
  try {
    const response = await signup(payload);
    return response.data;
  } catch (err) {
    if (!err.isUnauthorized) {
      toast.error(err.response.data.error);
    }
    throw err;
  }
});

export const loginAsync = createAsyncThunk("login", async (payload) => {
  try {
    const response = await login(payload);
    return response;
  } catch (err) {
    // Handle network errors
    if (err.isNetworkError || !err.response) {
      const errorMessage = err.userMessage || err.message || 'Unable to connect to the server. Please check your internet connection.';
      toast.error(errorMessage);
      throw err;
    }
    
    // Handle API errors with response
    if (!err.isUnauthorized && err.response?.data?.error) {
      toast.error(err.response.data.error);
    } else if (!err.isUnauthorized && err.response?.data?.message) {
      toast.error(err.response.data.message);
    } else if (!err.isUnauthorized) {
      toast.error('Login failed. Please check your credentials and try again.');
    }
    throw err;
  }
});

export const getMeAsync = createAsyncThunk("get/me", async () => {
  try {
    const response = await getMe();
    return response;
  } catch (err) {
    if (!err.isUnauthorized) {
      toast.error(err.response.data.error);
    }
    throw err;
  }
});

export const googleLoginAsync = createAsyncThunk(
  "googleLogin",
  async (payload) => {
    try {
      const response = await googleLogin(payload);
      return response;
    } catch (err) {
      if (!err.isUnauthorized) {
        toast.error(err.response.data.error);
      }
      throw err;
    }
  }
);

export const forgetPasswordAsync = createAsyncThunk(
  "forgetPassword",
  async (payload) => {
    try {
      const res = await forgetPassword(payload);
      return res;
    } catch (err) {
      if (!err.isUnauthorized) {
        toast.error(err.response.data.error);
      }
      throw err;
    }
  }
);

export const verifiedForgetPasswordAsync = createAsyncThunk(
  "verifiedForgetPassword",
  async (payload) => {
    try {
      const res = await verifiedForgetPassword(payload);
      return res;
    } catch (err) {
      if (!err.isUnauthorized) {
        toast.error(err.response.data.error);
      }
      throw err;
    }
  }
);

const setupLogin = (action) => {
  toast.success(action.payload.msg);
  localStorage.setItem(
    LOCAL_STORAGE_KEYS.ACCESS_TOKEN,
    action.payload.result.data.access_token
  );
  localStorage.setItem(
    LOCAL_STORAGE_KEYS.ACC_TYPE,
    action.payload.result.data.account_type
  );
};

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    auth: (state) => {
      return state;
    },
    updateIsRedirectToDashboard: (state , action) =>{
      state.isRedirectToDashboard = action.payload;
    },
    updateTrainerAndDate: (state, action) => {
      state.selectedTrainerId = action.payload.selectedTrainerId;
      state.selectedDate = action.payload.selectedDate;
      state.slotData = action?.payload?.slots || null;
    },
    userLogout: (state, action) =>{
      state.userInfo = {};
    },
    updateIsAuthModalOpen: (state, action) =>{
      state.isAuthModalOpen= action.payload;
    },
    updateIsUserLoggedIn: (state, action) => {
      state.isUserLoggedIn = false;
      state.sidebarActiveTab = "";
    },
    setUserPaymentDetails: (state, action) =>{
       state.userPaymentDetails = action.payload;
    },
    setAccountType: (state, action) => {
      state.accountType = action?.payload || localStorage.getItem(LOCAL_STORAGE_KEYS?.ACC_TYPE)
    },
    setActiveTab: (state, action) => {
      state.topNavbarActiveTab = null;
      state.sidebarActiveTab = action.payload;
    },
    setTopNavbarActiveTab: (state, action) => {
      state.sidebarActiveTab = leftSideBarOptions?.TOPNAVBAR;
      state.topNavbarActiveTab = action.payload;
      state.selectedOnlineUser = null;
    },
    setSeletedOnlineTrainer: (state, action) => {
      state.sidebarActiveTab = leftSideBarOptions?.TOPNAVBAR;
      state.topNavbarActiveTab = action.payload.tab;
      state.selectedOnlineUser = action.payload.selectedOnlineUser;
    },
    setActiveModalTab: (state, action) => {
      state.sidebarModalActiveTab = action.payload;
    },
    setActiveLockerTab: (state, action) => {
      state.sidebarLockerActiveTab = action.payload;
    },
    updateIsGoogleForm: (state) => {
      state.showGoogleRegistrationForm.isFromGoogle = false;
    },
    updateApiStatus: (state , action) =>{
      state.status = action.payload;
    },
    updateOnlineUsers: (state, action) => {
      state.onlineUsers = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(signupAsync.pending, (state) => {
        state.status = "pending";
      })
      .addCase(signupAsync.fulfilled, (state, action) => {
        state.status = "fulfilled";
        state.userInfo = action.payload;
        toast.success(SuccessMsgs.signUp.success);
      })
      .addCase(signupAsync.rejected, (state) => {
        state.status = "rejected";
      })
      .addCase(getMeAsync.pending, (state) => {
        state.status = "pending";
      })
      .addCase(getMeAsync.fulfilled, (state, action) => {
        state.userInfo = action.payload.userInfo;
        state.status = "fulfilled";
      })
      .addCase(getMeAsync.rejected, (state) => {
        state.status = "rejected";
      })
      .addCase(loginAsync.pending, (state) => {
        state.authToken = "";
        state.status = "loading";
      })
      .addCase(loginAsync.rejected, (state) => {
        state.status = "rejected";
      })
      .addCase(loginAsync.fulfilled, (state, action) => {
        state.status = "fulfilled";
        state.isUserLoggedIn = true;
        if (action.payload) {
          state.authToken = action.payload.result.data.access_token;
          setupLogin(action);
        }
        state.sidebarActiveTab = leftSideBarOptions.HOME;
      })
      .addCase(googleLoginAsync.pending, (state) => {
        state.showGoogleRegistrationForm.isFromGoogle = false;
        state.status = "loading";
      })
      .addCase(googleLoginAsync.rejected, (state) => {
        state.showGoogleRegistrationForm.isFromGoogle = false;
        state.status = "rejected";
      })
      .addCase(googleLoginAsync.fulfilled, (state, action) => {
        state.status = "fulfilled";
        if (action.payload) {
          // user needs to register
          if (
            action.payload &&
            action.payload.data &&
            !action.payload.data.isRegistered
          ) {
            toast.success(action.payload.msg);
            state.showGoogleRegistrationForm.isFromGoogle = true;
            state.showGoogleRegistrationForm.email = action.payload.data.email;
          } else {
            state.isUserLoggedIn = true;
            // user can do login
            setupLogin(action);
          }
        }
      })
      .addCase(forgetPasswordAsync.pending, (state, action) => {
        state.status = "pending";
      })
      .addCase(forgetPasswordAsync.fulfilled, (state, action) => {
        state.status = "fulfilled";
        toast.success(action.payload.msg);
      })
      .addCase(forgetPasswordAsync.rejected, (state, action) => {
        state.status = "rejected";
      })
      .addCase(verifiedForgetPasswordAsync.pending, (state, action) => {
        state.status = "pending";
      })
      .addCase(verifiedForgetPasswordAsync.fulfilled, (state, action) => {
        state.status = "fulfilled";
        toast.success(action.payload.msg);
      })
      .addCase(verifiedForgetPasswordAsync.rejected, (state, action) => {
        state.status = "rejected";
      });
  },
});

export default authSlice.reducer;
export const authState = (state) => state.auth;
export const authAction = authSlice.actions;
