"use client";

import { Provider } from "react-redux";
import type { ReactNode } from "react";
import { store } from "./store/store";
import { PostHogProvider } from "./PostHogProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <PostHogProvider>
      <Provider store={store}>{children}</Provider>
    </PostHogProvider>
  );
}
