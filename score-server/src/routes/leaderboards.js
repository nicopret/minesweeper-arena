module.exports = async function (fastify) {
  fastify.get("/leaderboards/:mode", {
    schema: {
      params: {
        type: "object",
        required: ["mode"],
        properties: {
          mode: { type: "string", minLength: 1, maxLength: 100 },
        },
      },
      querystring: {
        type: "object",
        properties: {
          limit: { type: "integer", minimum: 1, maximum: 100 },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            mode: { type: "string" },
            leaderboard: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  rank: { type: "integer" },
                  userId: { type: "string" },
                  displayName: { type: ["string", "null"] },
                  score: { type: "number" },
                  updatedAt: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    handler: async (request) => {
      const { mode } = request.params;
      const limit = request.query.limit || 15;

      // Use SQL window function for stable ranks.
      const rows = await fastify.prisma.$queryRaw`
        SELECT
          row_number() OVER (ORDER BY br.score_numeric DESC, br.updated_at ASC) AS rank,
          br.user_id AS "userId",
          u.display_name AS "displayName",
          br.score_numeric AS score,
          br.updated_at AS "updatedAt"
        FROM best_runs br
        JOIN users u ON u.id = br.user_id
        WHERE br.mode = ${mode}::text
        ORDER BY br.score_numeric DESC, br.updated_at ASC
        LIMIT ${limit}::int
      `;

      return { mode, leaderboard: rows };
    },
  });
};
