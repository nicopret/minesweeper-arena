import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type AuthUser = {
  firstName: string;
  fullName?: string;
  email?: string;
  pictureUrl?: string;
  userId?: string;
  createdAt?: string | null;
  lastSeenAt?: string | null;
};

export type AuthState = {
  user: AuthUser | null;
};

const initialState: AuthState = {
  user: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<AuthUser>) => {
      state.user = action.payload;
    },
    clearUser: (state) => {
      state.user = null;
    },
  },
});

export const { setUser, clearUser } = authSlice.actions;
export default authSlice.reducer;
