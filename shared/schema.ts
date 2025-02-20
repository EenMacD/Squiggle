import { pgTable, text, serial, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Position schema for x,y coordinates
export const position = z.object({
  x: z.number(),
  y: z.number()
});

// Ball state schema
export const ballState = z.object({
  position: position,
  possessionPlayerId: z.string().nullable()
});

// Keyframe schema for storing player positions and ball state at a specific time
export const keyFrame = z.object({
  timestamp: z.number(),
  positions: z.record(z.string(), position),
  ball: ballState
});

// Database table for storing rugby plays
export const plays = pgTable("plays", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  keyframes: jsonb("keyframes").notNull().$type<z.infer<typeof keyFrame>[]>()
});

// Schema for inserting new plays
export const insertPlaySchema = createInsertSchema(plays);

// Types for TypeScript
export type InsertPlay = z.infer<typeof insertPlaySchema>;
export type Play = typeof plays.$inferSelect;
export type BallState = z.infer<typeof ballState>;
export type KeyFrame = z.infer<typeof keyFrame>;