import { configureStore } from "@reduxjs/toolkit";
import gameReducer from "./gameSlice";
import scoreServerReducer from "./scoreServerSlice";

export const store = configureStore({
  reducer: {
    game: gameReducer,
    scoreServer: scoreServerReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
