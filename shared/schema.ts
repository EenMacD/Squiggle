import { pgTable, text, serial, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const playerMovement = z.object({
  x: z.number(),
  y: z.number(),
  timestamp: z.number()
});

// Update schema to include keyframes with ball position
export const keyFrame = z.object({
  timestamp: z.number(),
  ballCarrier: z.string(),
  positions: z.record(z.string(), z.object({
    x: z.number(),
    y: z.number()
  }))
});

export const plays = pgTable("plays", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  keyFrames: jsonb("keyframes").notNull().$type<z.infer<typeof keyFrame>[]>(),
});

export const insertPlaySchema = createInsertSchema(plays);

export type InsertPlay = z.infer<typeof insertPlaySchema>;
export type Play = typeof plays.$inferSelect;