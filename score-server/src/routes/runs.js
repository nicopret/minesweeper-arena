function computeScoreNumeric({ totalCells, secondsTaken }) {
  // Simple deterministic scoring: bigger boards in less time => higher score.
  // If you want a different formula later, keep this function as the single source of truth.
  return totalCells / secondsTaken;
}

module.exports = async function (fastify) {
  fastify.post("/runs", {
    preHandler: fastify.authenticate,
    schema: {
      body: {
        type: "object",
        required: [
          "mode",
          "secondsTaken",
          "bombsMarked",
          "totalCells",
          "clientPlatform",
        ],
        properties: {
          mode: { type: "string", minLength: 1, maxLength: 100 },
          secondsTaken: { type: "integer", minimum: 1, maximum: 60 * 60 * 24 },
          bombsMarked: { type: "integer", minimum: 0, maximum: 999999 },
          totalCells: { type: "integer", minimum: 1, maximum: 999999 },
          clientPlatform: { type: "string", minLength: 1, maxLength: 50 },
          clientVersion: { type: "string", maxLength: 50 },
        },
      },
      querystring: {
        type: "object",
        properties: {
          leaderboardLimit: { type: "integer", minimum: 1, maximum: 100 },
        },
      },
    },
    handler: async (request) => {
      const userId = request.user && request.user.sub;
      if (!userId) {
        const err = new Error("Unauthorized");
        err.statusCode = 401;
        throw err;
      }

      const {
        mode,
        secondsTaken,
        bombsMarked,
        totalCells,
        clientPlatform,
        clientVersion,
      } = request.body;

      const scoreNumeric = computeScoreNumeric({ totalCells, secondsTaken });

      const result = await fastify.prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (!user) {
          const err = new Error("Unauthorized");
          err.statusCode = 401;
          throw err;
        }

        const run = await tx.run.create({
          data: {
            userId,
            mode,
            secondsTaken,
            bombsMarked,
            totalCells,
            scoreNumeric,
            clientPlatform,
            clientVersion: clientVersion || null,
          },
        });

        // Conditional upsert for PB:
        // - inserts initial PB row
        // - updates only when new score is higher
        const pbRows = await tx.$queryRaw`
          INSERT INTO best_runs (user_id, mode, run_id, score_numeric, updated_at)
          VALUES (${userId}::uuid, ${mode}::text, ${run.id}::uuid, ${scoreNumeric}::double precision, now())
          ON CONFLICT (user_id, mode)
          DO UPDATE SET
            run_id = EXCLUDED.run_id,
            score_numeric = EXCLUDED.score_numeric,
            updated_at = now()
          WHERE EXCLUDED.score_numeric > best_runs.score_numeric
          RETURNING run_id as "runId", score_numeric as "scoreNumeric"
        `;

        const isPb =
          Array.isArray(pbRows) &&
          pbRows.length > 0 &&
          pbRows[0].runId === run.id;

        let leaderboard = undefined;
        if (request.query.leaderboardLimit) {
          const limit = request.query.leaderboardLimit;
          const best = await tx.bestRun.findMany({
            where: { mode },
            orderBy: [{ scoreNumeric: "desc" }, { updatedAt: "asc" }],
            take: limit,
            include: { user: true },
          });
          leaderboard = best.map((row) => ({
            userId: row.userId,
            displayName: row.user.displayName,
            score: row.scoreNumeric,
            updatedAt: row.updatedAt,
          }));
        }

        return { run, isPb, leaderboard };
      });

      return {
        score: result.run.scoreNumeric,
        isPb: result.isPb,
        leaderboard: result.leaderboard,
      };
    },
  });
};
