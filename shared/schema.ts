import { pgTable, text, serial, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Basic position schema
export const position = z.object({
  x: z.number(),
  y: z.number()
});

// Keyframe schema without ball carrier
export const keyFrame = z.object({
  timestamp: z.number(),
  positions: z.record(z.string(), position)
});

export const plays = pgTable("plays", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  keyframes: jsonb("keyframes").notNull().$type<z.infer<typeof keyFrame>[]>(),
});

export const insertPlaySchema = createInsertSchema(plays);

export type InsertPlay = z.infer<typeof insertPlaySchema>;
export type Play = typeof plays.$inferSelect;