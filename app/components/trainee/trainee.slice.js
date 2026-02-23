import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
  bookSession,
  bookInstantMeeting,
  createPaymentIntent,
  fetchTraineeWithSlots,
  updateProfile,
} from "./trainee.api";
import { toast } from "react-toastify";
import { getMeAsync } from "../auth/auth.slice";

const initialState = {
  status: "idle",
  getTraineeSlots: [],
  transaction: {
    intent: null,
  },
  newBookingData: {}
};

export const getTraineeWithSlotsAsync = createAsyncThunk(
  "get/trainee/slots",
  async (params) => {
    try {
      const response = await fetchTraineeWithSlots(params);
      return response;
    } catch (err) {
      if (!err.isUnauthorized) {
        toast.error(err.response.data.error);
      }
      throw err;
    }
  }
);

export const bookSessionAsync = createAsyncThunk(
  "add/trainee/book-session",
  async (payload) => {
    try {
      const response = await bookSession(payload);
      return response;
    } catch (err) {
      if (!err.isUnauthorized) {
        toast.error(err.response?.data?.error || "Booking failed");
      }
      throw err;
    }
  }
);

/** Instant lesson: no date/timezone; server uses UTC now. Returns { bookingId, booking }. */
export const bookInstantMeetingAsync = createAsyncThunk(
  "add/trainee/book-instant-meeting",
  async (payload) => {
    try {
      const response = await bookInstantMeeting(payload);
      return response;
    } catch (err) {
      if (!err.isUnauthorized) {
        toast.error(err.response?.data?.error || "Instant lesson request failed");
      }
      throw err;
    }
  }
);

//update Profile
export const updateTraineeProfileAsync = createAsyncThunk(
  "trainee/update/profile",
  async (payload, { dispatch }) => {
    try {
      const response = await updateProfile(payload);
      dispatch(getMeAsync());
      return response;
    } catch (err) {
      if (!err.isUnauthorized) {
        toast.error(err.response.data.error);
      }
      throw err;
    }
  }
);

// TODO: should fall under transaction slice
export const createPaymentIntentAsync = createAsyncThunk(
  "transaction/create-payment-intent",
  async (payload) => {
    try {
      const response = await createPaymentIntent(payload);
      return response;
    } catch (err) {
       
      if (!err.isUnauthorized) {
        toast.error(err.response.data.error);
      }
      throw err;
    }
  }
);

export const traineeSlice = createSlice({
  name: "trainee",
  initialState,
  reducers: {
    trainee: (state) => {
      return state;
    },
    removePaymentIntent: (state, action) => {
      state.transaction.intent = null;
    },
    removeNewBookingData: (state, action) => {
      state.newBookingData = {};
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getTraineeWithSlotsAsync.pending, (state, action) => {
        state.status = "pending";
      })
      .addCase(getTraineeWithSlotsAsync.fulfilled, (state, action) => {
         
        state.status = "fulfilled";
        state.getTraineeSlots = action.payload.data;
      })
      .addCase(getTraineeWithSlotsAsync.rejected, (state, action) => {
        state.status = "rejected";
      })
      .addCase(bookSessionAsync.pending, (state, action) => {
        state.status = "pending";
      })
      .addCase(bookSessionAsync.fulfilled, (state, action) => {
        state.status = "fulfilled";
        state.transaction.intent = null;
        const { data } = action.payload;
        toast.success(data.message);
        state.newBookingData = data;
      })
      .addCase(bookSessionAsync.rejected, (state, action) => {
        state.status = "rejected";
      })
      .addCase(createPaymentIntentAsync.pending, (state, action) => {
        state.status = "pending";
      })
      .addCase(createPaymentIntentAsync.fulfilled, (state, action) => {
        state.status = "fulfilled";
        state.transaction.intent = action.payload.data;
      })
      .addCase(createPaymentIntentAsync.rejected, (state, action) => {
        state.status = "rejected";
      })
      .addCase(updateTraineeProfileAsync.pending, (state, action) => {
        state.status = "pending";
      })
      .addCase(updateTraineeProfileAsync.fulfilled, (state, action) => {
        toast.success(action.payload.data.message);
        state.status = "fulfilled";
      })
      .addCase(updateTraineeProfileAsync.rejected, (state, action) => {
        state.status = "rejected";
      });
  },
});
export default traineeSlice.reducer;
export const traineeState = (state) => state.trainee;
export const traineeAction = traineeSlice.actions;
