import { FastifyInstance } from "fastify";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { knex } from "../database";
import { CheckSessionIdExists } from "../middlewares/check-session-id-exists";

export async function transactionsRoutes(app: FastifyInstance) {
    app.get(
        "/",
        {
            preHandler: [CheckSessionIdExists],
        },
        async (req) => {
            const { sessionId } = req.cookies;

            const transactions = await knex("transactions")
                .where("session_id", sessionId)
                .select();

            return {
                transactions,
            };
        },
    );

    app.get(
        "/summary",
        {
            preHandler: [CheckSessionIdExists],
        },
        async (req) => {
            const { sessionId } = req.cookies;

            const summary = await knex("transactions")
                .where("session_id", sessionId)
                .sum("amount", { as: "amount" })
                .first();

            return {
                summary,
            };
        },
    );

    app.get(
        "/:id",
        {
            preHandler: [CheckSessionIdExists],
        },
        async (req) => {
            const getTransactionParamsSchema = z.object({
                id: z.string().uuid(),
            });

            const { id } = getTransactionParamsSchema.parse(req.params);
            const { sessionId } = req.cookies;

            const transaction = await knex("transactions")
                .where({
                    id,
                    session_id: sessionId,
                })
                .first();

            return {
                transaction,
            };
        },
    );

    app.post("/", async (req, res) => {
        const createTransactionBodySchema = z.object({
            title: z.string(),
            amount: z.number(),
            type: z.enum(["credit", "debit"]),
        });

        const { title, amount, type } = createTransactionBodySchema.parse(
            req.body,
        );

        let sessionId = req.cookies.sessionId;
        if (!sessionId) {
            sessionId = randomUUID();

            res.cookie("sessionId", sessionId, {
                path: "/",
                maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
            });
        }

        await knex("transactions").insert({
            id: randomUUID(),
            title,
            amount: type === "credit" ? amount : amount * -1,
            session_id: sessionId,
        });

        return res.status(201).send();
    });
}
