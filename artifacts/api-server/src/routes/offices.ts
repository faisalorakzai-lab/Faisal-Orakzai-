import { Router } from "express";
import { db, officesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateOfficeBody, UpdateOfficeBody, UpdateOfficeParams, DeleteOfficeParams } from "@workspace/api-zod";

const router = Router();

router.get("/", async (req, res) => {
  const offices = await db.select().from(officesTable).orderBy(officesTable.id);
  res.json(offices.map(o => ({ ...o, createdAt: o.createdAt.toISOString() })));
});

router.post("/", async (req, res) => {
  const body = CreateOfficeBody.parse(req.body);
  const [office] = await db.insert(officesTable).values({
    city: body.city,
    address: body.address,
    phone: body.phone,
    isHeadquarters: body.isHeadquarters,
    lat: body.lat,
    lng: body.lng,
  }).returning();
  res.status(201).json({ ...office, createdAt: office.createdAt.toISOString() });
});

router.put("/:id", async (req, res) => {
  const { id } = UpdateOfficeParams.parse(req.params);
  const body = UpdateOfficeBody.parse(req.body);
  const [office] = await db.update(officesTable).set({
    city: body.city,
    address: body.address,
    phone: body.phone,
    isHeadquarters: body.isHeadquarters,
    lat: body.lat,
    lng: body.lng,
  }).where(eq(officesTable.id, id)).returning();
  if (!office) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...office, createdAt: office.createdAt.toISOString() });
});

router.delete("/:id", async (req, res) => {
  const { id } = DeleteOfficeParams.parse(req.params);
  const [deleted] = await db.delete(officesTable).where(eq(officesTable.id, id)).returning();
  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
  res.status(204).end();
});

export default router;
