import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  loading: false,
};

const userSlice = createSlice({
  name: "userUI",
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
  },
});

// Export actions
export const { setLoading } = userSlice.actions;

// Export reducer
export default userSlice.reducer;
