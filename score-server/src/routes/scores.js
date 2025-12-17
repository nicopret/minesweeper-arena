const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

module.exports = async function (fastify) {
  fastify.get("/scores", {
    schema: {
      querystring: {
        type: "object",
        properties: {
          limit: { type: "integer", minimum: 1, maximum: MAX_LIMIT },
        },
      },
      response: {
        200: {
          type: "object",
          properties: {
            scores: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "integer" },
                  playerName: { type: "string" },
                  difficulty: { type: "string" },
                  timeMs: { type: "integer" },
                  createdAt: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    handler: async (request) => {
      const limit = Math.min(request.query.limit || DEFAULT_LIMIT, MAX_LIMIT);
      const { rows } = await fastify.pg.query(
        `
          SELECT id, player_name AS "playerName", difficulty, time_ms AS "timeMs", created_at AS "createdAt"
          FROM scores
          ORDER BY time_ms ASC, created_at ASC
          LIMIT $1
        `,
        [limit],
      );
      return { scores: rows };
    },
  });

  fastify.post("/scores", {
    schema: {
      body: {
        type: "object",
        required: ["playerName", "difficulty", "timeMs"],
        properties: {
          playerName: { type: "string", minLength: 1, maxLength: 100 },
          difficulty: { type: "string", minLength: 1, maxLength: 50 },
          timeMs: { type: "integer", minimum: 0 },
        },
      },
    },
    handler: async (request, reply) => {
      const { playerName, difficulty, timeMs } = request.body;
      const { rows } = await fastify.pg.query(
        `
          INSERT INTO scores (player_name, difficulty, time_ms)
          VALUES ($1, $2, $3)
          RETURNING id, player_name AS "playerName", difficulty, time_ms AS "timeMs", created_at AS "createdAt"
        `,
        [playerName, difficulty, timeMs],
      );
      reply.code(201);
      return rows[0];
    },
  });
};
