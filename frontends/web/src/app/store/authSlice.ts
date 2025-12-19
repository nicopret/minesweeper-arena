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
  highlight?: {
    score: number | null;
    levelId?: string;
  } | null;
};

export type HighscoreEntry = {
  levelId: string;
  highScore?: number;
  updatedAt?: string | number | null;
  attempts?: number;
  bestTimeMs?: number;
  scores?: number[];
};

const initialState: AuthState = {
  user: null,
  highscores: [],
  highlight: null,
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
      state.highlight = null;
    },
    setHighscores: (state, action: PayloadAction<HighscoreEntry[]>) => {
      state.highscores = action.payload;
    },
    setHighlight: (
      state,
      action: PayloadAction<{ score: number | null; levelId?: string } | null>,
    ) => {
      state.highlight = action.payload;
    },
  },
});

export const { setUser, clearUser, setHighscores, setHighlight } =
  authSlice.actions;
export default authSlice.reducer;
