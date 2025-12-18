import React from "react";
import { useAppSelector } from "../../store/hooks";
import type { HighscoreEntry } from "../../store/authSlice";
import GoogleLoginPanel from "../auth/GoogleLoginPanel";

const formatDate = (value: string | number | null | undefined): string => {
  if (!value) return "";
  const d =
    typeof value === "string" || typeof value === "number"
      ? new Date(value)
      : null;
  if (!d || Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
};

const daysSince = (
  value: string | number | null | undefined,
): number | null => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const diffMs = Date.now() - d.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
};

const levelLabel = (levelId: string): string => {
  if (levelId === "easy-9x9") return "Easy (9x9)";
  if (levelId === "medium-16x16") return "Medium (16x16)";
  if (levelId === "hard-16x30") return "Hard (16x30)";
  return levelId;
};

const HighscoresPanel = (): React.JSX.Element | null => {
  const user = useAppSelector((state) => state.auth.user);
  const highscores = useAppSelector((state) => state.auth.highscores);

  if (!user?.userId) {
    return (
      <div className="mb-3 text-center">
        <h5 className="mb-2">Highscores</h5>
        <p className="mb-3 text-muted small">
          You are not signed in. Sign in to see your scoreboard and best times.
        </p>
        <div className="d-inline-block">
          <GoogleLoginPanel />
        </div>
      </div>
    );
  }

  const sorted: HighscoreEntry[] = [...highscores].sort(
    (a, b) => (b.highScore ?? 0) - (a.highScore ?? 0),
  );

  const accountDays = daysSince(user.createdAt);
  let subtitle: string | null = null;
  if (accountDays === 0) {
    subtitle = null;
  } else if (accountDays !== null && accountDays < 50) {
    subtitle = `Playing now for ${accountDays} days`;
  } else if (user.createdAt) {
    subtitle = `Member since ${formatDate(user.createdAt)}`;
  }

  return (
    <div className="mb-3">
      <h5 className="mb-1">Highscores</h5>
      {subtitle ? (
        <div className="text-muted small mb-2">{subtitle}</div>
      ) : null}
      {sorted.length === 0 ? (
        <div className="text-muted small">No highscores yet</div>
      ) : (
        <ul className="list-group">
          {sorted.map((entry) => (
            <li
              key={entry.levelId}
              className="list-group-item d-flex justify-content-between align-items-center"
            >
              <span>{levelLabel(entry.levelId)}</span>
              <span className="fw-bold">
                {typeof entry.highScore === "number"
                  ? entry.highScore
                  : "\u2014"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default HighscoresPanel;
