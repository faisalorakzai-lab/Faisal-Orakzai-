import { Router } from "express";
import { db, contactsTable } from "@workspace/db";
import { SubmitContactBody } from "@workspace/api-zod";

const router = Router();

router.post("/", async (req, res) => {
  const body = SubmitContactBody.parse(req.body);
  const [contact] = await db.insert(contactsTable).values({
    name: body.name,
    email: body.email,
    phone: body.phone,
    service: body.service ?? null,
    message: body.message,
  }).returning();
  res.status(201).json({ ...contact, createdAt: contact.createdAt.toISOString() });
});

router.get("/submissions", async (req, res) => {
  const submissions = await db.select().from(contactsTable).orderBy(contactsTable.createdAt);
  res.json(submissions.map(s => ({ ...s, createdAt: s.createdAt.toISOString() })));
});

export default router;
