import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import {
  fetchLeaderboard,
  linkProviderToken,
  loginWithProviderToken,
  submitRun,
  type LeaderboardEntry,
  type Provider,
  type SubmitRunRequest,
} from "../lib/scoreServerApi";

type AuthState = {
  token: string | null;
  userId: string | null;
  displayName: string | null;

  leaderboardMode: string | null;
  leaderboard: LeaderboardEntry[];

  loginStatus: "idle" | "loading" | "failed";
  linkStatus: "idle" | "loading" | "failed";
  leaderboardStatus: "idle" | "loading" | "failed";
  submitStatus: "idle" | "loading" | "failed" | "succeeded";

  lastSubmit?: { score: number; isPb: boolean };
  message: string | null;
};

const STORAGE_KEY = "scoreServerAuth";

const initialState: AuthState = {
  token: null,
  userId: null,
  displayName: null,
  leaderboardMode: null,
  leaderboard: [],
  loginStatus: "idle",
  linkStatus: "idle",
  leaderboardStatus: "idle",
  submitStatus: "idle",
  lastSubmit: undefined,
  message: null,
};

const persistAuth = (
  token: string,
  userId: string,
  displayName: string | null,
) => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ token, userId, displayName }),
    );
  } catch {
    // ignore storage errors
  }
};

const clearPersistedAuth = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
};

export const initAuthFromStorage = createAsyncThunk(
  "scoreServer/initAuth",
  async () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as {
        token: string;
        userId: string;
        displayName: string | null;
      };
      if (!parsed?.token || !parsed?.userId) return null;
      return parsed;
    } catch {
      return null;
    }
  },
);

export const login = createAsyncThunk(
  "scoreServer/login",
  async ({ provider, token }: { provider: Provider; token: string }) => {
    return loginWithProviderToken(provider, token);
  },
);

export const link = createAsyncThunk(
  "scoreServer/link",
  async (
    { provider, token }: { provider: Provider; token: string },
    { getState },
  ) => {
    const state = getState() as { scoreServer: AuthState };
    if (!state.scoreServer.token) throw new Error("Not logged in");
    return linkProviderToken(provider, state.scoreServer.token, token);
  },
);

export const loadLeaderboard = createAsyncThunk(
  "scoreServer/loadLeaderboard",
  async ({ mode }: { mode: string }) => fetchLeaderboard(mode, 15),
);

export const submitRunAndMaybeUpdateLeaderboard = createAsyncThunk(
  "scoreServer/submitRun",
  async ({ payload }: { payload: SubmitRunRequest }, { getState }) => {
    const state = getState() as { scoreServer: AuthState };
    if (!state.scoreServer.token) throw new Error("Not logged in");
    return submitRun(state.scoreServer.token, payload, 15);
  },
);

const scoreServerSlice = createSlice({
  name: "scoreServer",
  initialState,
  reducers: {
    logout: (state) => {
      state.token = null;
      state.userId = null;
      state.displayName = null;
      state.loginStatus = "idle";
      state.linkStatus = "idle";
      state.submitStatus = "idle";
      state.lastSubmit = undefined;
      state.message = null;
      clearPersistedAuth();
    },
    setMessage: (state, action: PayloadAction<string | null>) => {
      state.message = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(initAuthFromStorage.fulfilled, (state, action) => {
      if (!action.payload) return;
      state.token = action.payload.token;
      state.userId = action.payload.userId;
      state.displayName = action.payload.displayName;
    });

    builder.addCase(login.pending, (state) => {
      state.loginStatus = "loading";
      state.message = null;
    });
    builder.addCase(login.fulfilled, (state, action) => {
      state.loginStatus = "idle";
      state.token = action.payload.token;
      state.userId = action.payload.user.id;
      state.displayName = action.payload.user.displayName;
      persistAuth(
        action.payload.token,
        action.payload.user.id,
        action.payload.user.displayName,
      );
      state.message = "Logged in.";
    });
    builder.addCase(login.rejected, (state, action) => {
      state.loginStatus = "failed";
      state.message = action.error.message || "Login failed.";
    });

    builder.addCase(link.pending, (state) => {
      state.linkStatus = "loading";
      state.message = null;
    });
    builder.addCase(link.fulfilled, (state) => {
      state.linkStatus = "idle";
      state.message = "Account linked.";
    });
    builder.addCase(link.rejected, (state, action) => {
      state.linkStatus = "failed";
      state.message = action.error.message || "Link failed.";
    });

    builder.addCase(loadLeaderboard.pending, (state) => {
      state.leaderboardStatus = "loading";
    });
    builder.addCase(loadLeaderboard.fulfilled, (state, action) => {
      state.leaderboardStatus = "idle";
      state.leaderboardMode = action.payload.mode;
      state.leaderboard = action.payload.leaderboard;
    });
    builder.addCase(loadLeaderboard.rejected, (state, action) => {
      state.leaderboardStatus = "failed";
      state.message = action.error.message || "Failed to load leaderboard.";
    });

    builder.addCase(submitRunAndMaybeUpdateLeaderboard.pending, (state) => {
      state.submitStatus = "loading";
      state.lastSubmit = undefined;
    });
    builder.addCase(
      submitRunAndMaybeUpdateLeaderboard.fulfilled,
      (state, action) => {
        state.submitStatus = "succeeded";
        state.lastSubmit = {
          score: action.payload.score,
          isPb: action.payload.isPb,
        };

        if (action.payload.leaderboard) {
          state.leaderboard = action.payload.leaderboard.map((row, idx) => ({
            rank: idx + 1,
            userId: row.userId,
            displayName: row.displayName,
            score: row.score,
            updatedAt: row.updatedAt,
          }));
        }
      },
    );
    builder.addCase(
      submitRunAndMaybeUpdateLeaderboard.rejected,
      (state, action) => {
        state.submitStatus = "failed";
        state.message = action.error.message || "Run submission failed.";
      },
    );
  },
});

export const { logout, setMessage } = scoreServerSlice.actions;
export default scoreServerSlice.reducer;
