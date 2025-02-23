import { pgTable, text, serial, jsonb, integer, timestamp } from "drizzle-orm/pg-core";
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

// Database table for folders
export const folders = pgTable("folders", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Database table for storing rugby plays
export const plays = pgTable("plays", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(),
  folderId: integer("folder_id").references(() => folders.id),
  keyframes: jsonb("keyframes").notNull().$type<z.infer<typeof keyFrame>[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Schema for inserting new folders
export const insertFolderSchema = createInsertSchema(folders);

// Schema for inserting new plays
export const insertPlaySchema = createInsertSchema(plays);

// Types for TypeScript
export type InsertFolder = z.infer<typeof insertFolderSchema>;
export type Folder = typeof folders.$inferSelect;
export type InsertPlay = z.infer<typeof insertPlaySchema>;
export type Play = typeof plays.$inferSelect;
export type BallState = z.infer<typeof ballState>;
export type KeyFrame = z.infer<typeof keyFrame>;