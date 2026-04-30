import { pgTable, serial, text, boolean, timestamp, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const officesTable = pgTable("offices", {
  id: serial("id").primaryKey(),
  city: text("city").notNull(),
  address: text("address").notNull(),
  phone: text("phone").notNull(),
  isHeadquarters: boolean("is_headquarters").notNull().default(false),
  lat: doublePrecision("lat").notNull(),
  lng: doublePrecision("lng").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOfficeSchema = createInsertSchema(officesTable).omit({ id: true, createdAt: true });
export type InsertOffice = z.infer<typeof insertOfficeSchema>;
export type Office = typeof officesTable.$inferSelect;
