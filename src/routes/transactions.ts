import { FastifyInstance } from "fastify";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { knex } from "../database";

export async function transactionsRoutes(app: FastifyInstance) {
    app.get("/", async () => {
        const transactions = await knex("transactions").select();

        return {
            transactions,
        };
    });

    app.get("/summary", async () => {
        const summary = await knex("transactions")
            .sum("amount", { as: "amount" })
            .first();

        return {
            summary,
        };
    });

    app.get("/:id", async (req, res) => {
        const getTransactionParamsSchema = z.object({
            id: z.string().uuid(),
        });

        const { id } = getTransactionParamsSchema.parse(req.params);

        const transaction = await knex("transactions").where("id", id).first();

        return {
            transaction,
        };
    });

    app.post("/", async (req, res) => {
        const createTransactionBodySchema = z.object({
            title: z.string(),
            amount: z.number(),
            type: z.enum(["credit", "debit"]),
        });

        const { title, amount, type } = createTransactionBodySchema.parse(
            req.body,
        );

        await knex("transactions").insert({
            id: randomUUID(),
            title,
            amount: type === "credit" ? amount : amount * -1,
        });

        return res.status(201).send();
    });
}
