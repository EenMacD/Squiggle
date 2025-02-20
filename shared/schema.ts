import { pgTable, text, serial, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const playerMovement = z.object({
  x: z.number(),
  y: z.number(),
  timestamp: z.number()
});

export const plays = pgTable("plays", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  movements: jsonb("movements").notNull().$type<{
    team1: Record<string, playerMovement[]>,
    team2: Record<string, playerMovement[]>
  }>(),
});

export const insertPlaySchema = createInsertSchema(plays);

export type InsertPlay = z.infer<typeof insertPlaySchema>;
export type Play = typeof plays.$inferSelect;
