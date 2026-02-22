import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  addRating,
  addTraineeClipInBookedSession,
  getScheduledMeetingDetails,
  updateBookedSessionScheduledMeeting,
  uploadProfilePicture,
} from "./common.api";
import { toast } from "react-toastify";

const initialState = {
  status: "idle",
  scheduledMeetingDetails: [],
  scheduledMeetingDetailsByStatus: {
    upcoming: [],
    cancelled: [],
    completed: [],
    active: [],
  },
  addRatingModel: { _id: null, isOpen: false },
  profile_picture: null,
  isLoading: true,
  selectedTrainerId: null,
  profile_image_url: null,
  configs: {
    sidebar: {
      isToggleEnable: false,
      isMobileMode: false,
    },
  },
  activeTab: "",
  sidebarTab: "",
  isMeetingLoading : false,
  startMeeting : {
    trainerInfo: null,
    traineeInfo: null,
    id: null,
    isOpenModal: false,
  },
  // Cache metadata to prevent unnecessary refetches
  lastFetchedTimestamp: {},
  cachedTabBook: null,
};

export const addRatingAsync = createAsyncThunk(
  "add/rating",
  async (payload) => {
    try {
      const res = await addRating(payload);
      return res;
    } catch (err) {
       
      if (!err.isUnauthorized) {
        toast.error(err.response.data.error);
      }
      throw err;
    }
  }
);

export const updateBookedSessionScheduledMeetingAsync = createAsyncThunk(
  "update/booked/session",
  async (payload, { dispatch }) => {
    const { status, updatePayload } = payload;
    const statusPayload = { status };
    try {
      const response = await updateBookedSessionScheduledMeeting(updatePayload);
      dispatch(getScheduledMeetingDetailsAsync(statusPayload));
      return response;
    } catch (err) {
      if (!err.isUnauthorized) {
        toast.error(err.response.data.error);
      }
      throw err;
    }
  }
);


export const addTraineeClipInBookedSessionAsync = createAsyncThunk(
  "add/clip/booked/session",
  async (payload, { dispatch }) => {
    try {
      const response = await addTraineeClipInBookedSession(payload);
      return response;
    } catch (err) {
      if (!err.isUnauthorized) {
        toast.error(err.response.data.error);
      }
      throw err;
    }
  }
);

export const getScheduledMeetingDetailsAsync = createAsyncThunk(
  "get/scheduled/meetings",
  async (payload, { getState }) => {
    try {
      const state = getState();
      const bookings = state?.bookings;

      const requestedTab = payload?.status || null;
      const cachedTab = bookings?.cachedTabBook || null;
      const lastFetchedTimestamps = bookings?.lastFetchedTimestamp || {};
      const forceRefresh = payload?.forceRefresh === true; // Allow force refresh flag

      // If force refresh is requested, skip cache
      if (!forceRefresh) {
        // If we already fetched this tab recently, reuse cached data
        const CACHE_TTL_MS = 30 * 1000; // 30 seconds cache (reduced from 1 minute for better freshness)
        const isSameTab = requestedTab && cachedTab && requestedTab === cachedTab;
        const lastFetched = lastFetchedTimestamps[requestedTab] || lastFetchedTimestamps["all"];
        const isFresh =
          typeof lastFetched === "number" &&
          Date.now() - lastFetched < CACHE_TTL_MS;

        // Check if we have cached data for this specific status
        const cachedDataForStatus = requestedTab && bookings?.scheduledMeetingDetailsByStatus?.[requestedTab];
        
        if (isSameTab && isFresh && Array.isArray(cachedDataForStatus) && cachedDataForStatus.length > 0) {
          return {
            data: cachedDataForStatus,
            cachedTabBook: requestedTab,
            fromCache: true,
          };
        }
      }

      const response = await getScheduledMeetingDetails(payload);
      // Include the payload (tabBook) in the response for caching
      return { ...response, cachedTabBook: requestedTab, fromCache: false };
    } catch (err) {
      if (!err.isUnauthorized) {
        toast.error(err.response?.data?.error || "Something went wrong");
      }
      throw err;
    }
  }
);

export const uploadProfilePictureAsync = createAsyncThunk(
  "add/profile_picture",
  async (payload) => {
    try {
      const response = await uploadProfilePicture(payload);
      return response;
    } catch (err) {
      if (!err.isUnauthorized) {
        toast.error(err.response.data.error);
      }
      throw err;
    }
  }
);

export const bookingsSlice = createSlice({
  name: "bookings",
  initialState,
  reducers: {
    bookings: (state) => {
      return state;
    },
    addRating: (state, action) => {
      state.addRatingModel = action.payload;
    },
    removeProfilePicture: (state, action) => {
      state.profile_picture = action.payload;
    },
    handleLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    handleSelectedTrainer: (state, action) => {
      state.selectedTrainerId = action.payload;
    },
    removeProfileImageUrl: (state, action) => {
      state.profile_image_url = action.payload;
    },
    isMobileFriendly: (state, action) => {
      state.configs.sidebar = {
        ...state.configs.sidebar,
        isMobileMode: action.payload,
      };
    },
    isSidebarToggleEnabled: (state, action) => {
      state.configs.sidebar = {
        ...state.configs.sidebar,
        isToggleEnable: action.payload,
      };
    },
    handleActiveTab: (state, action) => {
      state.activeTab = action.payload;
    },
    handleSidebarTabClose: (state, action) => {
      state.sidebarTab = action.payload;
    },
    setStartMeeting: (state , action) =>{
      state.startMeeting = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getScheduledMeetingDetailsAsync.pending, (state) => {
        state.status = "pending";
        state.isMeetingLoading = true;
      })
      .addCase(getScheduledMeetingDetailsAsync.fulfilled, (state, action) => {
        state.status = "fulfilled";
        state.isMeetingLoading = false;
        const fetchedStatus = action.payload.cachedTabBook || "all";
        const fetchedData = action.payload.data || [];

        if (fetchedStatus && fetchedStatus !== "all") {
          state.scheduledMeetingDetailsByStatus[fetchedStatus] = fetchedData;
        }

        const allData = [
          ...(state.scheduledMeetingDetailsByStatus.upcoming || []),
          ...(state.scheduledMeetingDetailsByStatus.cancelled || []),
          ...(state.scheduledMeetingDetailsByStatus.completed || []),
          ...(state.scheduledMeetingDetailsByStatus.active || []),
        ];
        const uniqueData = allData.reduce((acc, current) => {
          const existingIndex = acc.findIndex((item) => item._id === current._id);
          if (existingIndex === -1) {
            acc.push(current);
          } else {
            acc[existingIndex] = current;
          }
          return acc;
        }, []);
        state.scheduledMeetingDetails = uniqueData;
        state.lastFetchedTimestamp = {
          ...state.lastFetchedTimestamp,
          [fetchedStatus]: Date.now(),
        };
        state.cachedTabBook = action.payload.cachedTabBook;
      })
      .addCase(getScheduledMeetingDetailsAsync.rejected, (state, action) => {
        state.status = "rejected";
        state.isMeetingLoading = false;
      })
      .addCase(
        updateBookedSessionScheduledMeetingAsync.pending,
        (state, action) => {
          state.status = "pending";
        }
      )
      .addCase(
        updateBookedSessionScheduledMeetingAsync.fulfilled,
        (state, action) => {
          state.status = "fulfilled";
          toast.success(action.payload.message);
        }
      )
      .addCase(
        updateBookedSessionScheduledMeetingAsync.rejected,
        (state, action) => {
          state.status = "rejected";
        }
      )
      .addCase(
        addTraineeClipInBookedSessionAsync.pending,
        (state, action) => {
          state.status = "pending";
        }
      )
      .addCase(
        addTraineeClipInBookedSessionAsync.fulfilled,
        (state, action) => {
          state.status = "fulfilled";
          toast.success("Clips shared successfully");
        }
      )
      .addCase(
        addTraineeClipInBookedSessionAsync.rejected,
        (state, action) => {
          state.status = "rejected";
        }
      )
      .addCase(addRatingAsync.pending, (state, action) => {
        state.status = "pending";
      })
      .addCase(addRatingAsync.fulfilled, (state, action) => {
        state.status = "fulfilled";
        state.addRatingModel = { _id: null, isOpen: false };
        toast.success(action.payload.message, { type: "success" });
      })
      .addCase(addRatingAsync.rejected, (state, action) => {
        state.status = "rejected";
      })
      .addCase(uploadProfilePictureAsync.pending, (state, action) => {
        state.status = "pending";
      })
      .addCase(uploadProfilePictureAsync.fulfilled, (state, action) => {
        state.status = "fulfilled";
        state.profile_picture = action.payload.url;
        state.profile_image_url = action.payload.url;
      })
      .addCase(uploadProfilePictureAsync.rejected, (state, action) => {
        state.status = "rejected";
      });
  },
});

export default bookingsSlice.reducer;
export const bookingsState = (state) => state.bookings;
export const bookingsAction = bookingsSlice.actions;
