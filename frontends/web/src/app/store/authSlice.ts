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
  highscores: HighscoreEntry[];
};

export type HighscoreEntry = {
  levelId: string;
  highScore?: number;
  updatedAt?: string | number | null;
  attempts?: number;
  bestTimeMs?: number;
};

const initialState: AuthState = {
  user: null,
  highscores: [],
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
      state.highscores = [];
    },
    setHighscores: (state, action: PayloadAction<HighscoreEntry[]>) => {
      state.highscores = action.payload;
    },
  },
});

export const { setUser, clearUser, setHighscores } = authSlice.actions;
export default authSlice.reducer;
