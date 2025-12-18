import React from "react";
import { useAppSelector } from "../../store/hooks";
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

  const allScores: number[] = [];
  for (const entry of highscores) {
    if (Array.isArray(entry.scores) && entry.scores.length > 0) {
      allScores.push(
        ...entry.scores.filter(
          (n): n is number => typeof n === "number" && Number.isFinite(n),
        ),
      );
    } else if (typeof entry.highScore === "number") {
      allScores.push(entry.highScore);
    }
  }
  const sortedScores = [...allScores].sort((a, b) => b - a);

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
      {sortedScores.length === 0 ? (
        <div className="text-muted small">No highscores yet</div>
      ) : (
        <ul className="list-group">
          {sortedScores.map((score, idx) => (
            <li
              key={`score-${idx}-${score}`}
              className="list-group-item d-flex justify-content-between align-items-center"
            >
              <span className="text-muted">#{idx + 1}</span>
              <span className="fw-bold">{score}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default HighscoresPanel;
