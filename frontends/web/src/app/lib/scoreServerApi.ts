export type Provider = "google" | "facebook";

export type AuthUser = {
  id: string;
  displayName: string | null;
  isGuest: boolean;
  createdAt: string;
};

export type LoginResponse = {
  token: string;
  user: AuthUser;
};

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  displayName: string | null;
  score: number;
  updatedAt: string;
};

export type LeaderboardResponse = {
  mode: string;
  leaderboard: LeaderboardEntry[];
};

export type SubmitRunRequest = {
  mode: string;
  secondsTaken: number;
  bombsMarked: number;
  totalCells: number;
  clientPlatform: string;
  clientVersion?: string;
};

export type SubmitRunResponse = {
  score: number;
  isPb: boolean;
  leaderboard?: Array<{
    userId: string;
    displayName: string | null;
    score: number;
    updatedAt: string;
  }>;
};

const getBaseUrl = (): string =>
  process.env.NEXT_PUBLIC_SCORE_SERVER_URL || "http://localhost:5000";

async function requestJson<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getBaseUrl()}${input}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  const text = await res.text();
  const json = text ? (JSON.parse(text) as unknown) : null;

  if (!res.ok) {
    let errorMessage: string | null = null;
    if (json && typeof json === "object" && "error" in json) {
      const val = (json as Record<string, unknown>).error;
      if (typeof val === "string") errorMessage = val;
    }
    if (!errorMessage) errorMessage = text || `Request failed: ${res.status}`;
    throw new Error(errorMessage);
  }

  return json as T;
}

export const loginWithProviderToken = async (
  provider: Provider,
  token: string,
): Promise<LoginResponse> =>
  requestJson<LoginResponse>(`/auth/${provider}/login`, {
    method: "POST",
    body: JSON.stringify({ token }),
  });

export const linkProviderToken = async (
  provider: Provider,
  jwt: string,
  token: string,
): Promise<{ linked: boolean }> =>
  requestJson<{ linked: boolean }>(`/auth/${provider}/link`, {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}` },
    body: JSON.stringify({ token }),
  });

export const submitRun = async (
  jwt: string,
  payload: SubmitRunRequest,
  leaderboardLimit = 15,
): Promise<SubmitRunResponse> =>
  requestJson<SubmitRunResponse>(
    `/api/runs?leaderboardLimit=${encodeURIComponent(String(leaderboardLimit))}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${jwt}` },
      body: JSON.stringify(payload),
    },
  );

export const fetchLeaderboard = async (
  mode: string,
  limit = 15,
): Promise<LeaderboardResponse> =>
  requestJson<LeaderboardResponse>(
    `/leaderboards/${encodeURIComponent(mode)}?limit=${encodeURIComponent(String(limit))}`,
    { method: "GET" },
  );
