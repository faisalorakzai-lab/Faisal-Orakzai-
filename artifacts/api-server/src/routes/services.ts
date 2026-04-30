import { Router } from "express";
import { db, servicesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateServiceBody, UpdateServiceBody, GetServiceParams, UpdateServiceParams, DeleteServiceParams } from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  const services = await db.select().from(servicesTable).orderBy(servicesTable.id);
  res.json(services.map(s => ({ ...s, createdAt: s.createdAt.toISOString() })));
});

router.post("/", async (req, res) => {
  const body = CreateServiceBody.parse(req.body);
  const [service] = await db.insert(servicesTable).values(body).returning();
  res.status(201).json({ ...service, createdAt: service.createdAt.toISOString() });
});

router.get("/:id", async (req, res) => {
  const { id } = GetServiceParams.parse(req.params);
  const [service] = await db.select().from(servicesTable).where(eq(servicesTable.id, id));
  if (!service) return res.status(404).json({ error: "Not found" });
  res.json({ ...service, createdAt: service.createdAt.toISOString() });
});

router.put("/:id", async (req, res) => {
  const { id } = UpdateServiceParams.parse(req.params);
  const body = UpdateServiceBody.parse(req.body);
  const [service] = await db.update(servicesTable).set(body).where(eq(servicesTable.id, id)).returning();
  if (!service) return res.status(404).json({ error: "Not found" });
  res.json({ ...service, createdAt: service.createdAt.toISOString() });
});

router.delete("/:id", async (req, res) => {
  const { id } = DeleteServiceParams.parse(req.params);
  const [deleted] = await db.delete(servicesTable).where(eq(servicesTable.id, id)).returning();
  if (!deleted) return res.status(404).json({ error: "Not found" });
  res.status(204).end();
});

export default router;
