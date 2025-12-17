import React from "react";
import { useAppSelector } from "../store/hooks";

const LeaderboardContainer = (): React.JSX.Element | null => {
  const { leaderboard, leaderboardStatus } = useAppSelector(
    (s) => s.scoreServer,
  );

  if (leaderboardStatus === "loading") {
    return <div className="text-muted small mb-3">Loading leaderboard…</div>;
  }

  if (!leaderboard.length) return null;

  return (
    <div className="mb-3">
      <h2 className="h6 mb-2">Leaderboard</h2>
      <div className="table-responsive">
        <table className="table table-sm table-striped align-middle mb-0">
          <thead>
            <tr>
              <th scope="col" style={{ width: 70 }}>
                Rank
              </th>
              <th scope="col">Player</th>
              <th scope="col" style={{ width: 140 }}>
                Score
              </th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((row) => (
              <tr key={`${row.userId}-${row.rank}`}>
                <td>#{row.rank}</td>
                <td>{row.displayName || row.userId.slice(0, 8)}</td>
                <td>{row.score.toFixed(4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeaderboardContainer;
