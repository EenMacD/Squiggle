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

// Schema for Folders collection in MongoDB
export const folderSchema = z.object({
  _id: z.string(), // In MongoDB, this will be an ObjectId string representation
  name: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Schema for Folders collection in MongoDB (full document)
export const folderSchema = z.object({
  _id: z.string(), // In MongoDB, this will be an ObjectId string representation
  name: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Schema for Plays collection in MongoDB (full document)
export const playSchema = z.object({
  _id: z.string(), // In MongoDB, this will be an ObjectId string representation
  name: z.string(),
  category: z.string(),
  folderId: z.string().nullable(), // Reference to Folder's _id (ObjectId string representation), or null
  keyframes: z.array(keyFrame),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// --- Input Validation Schemas ---

// Schema for creating a new folder
export const createFolderSchema = z.object({
  name: z.string().min(1, "Folder name cannot be empty"),
});

// Schema for creating a new play
export const createPlaySchema = z.object({
  name: z.string().min(1, "Play name cannot be empty"),
  category: z.string().min(1, "Play category cannot be empty"),
  folderId: z.string().optional(), // ObjectId string, optional. If undefined, play is not in a folder.
  keyframes: z.array(keyFrame),
});

// Schema for updating a folder's name
export const updateFolderSchema = z.object({
  name: z.string().min(1, "Folder name cannot be empty"),
});

// Schema for updating a play's folder
export const updatePlayFolderSchema = z.object({
  folderId: z.string().nullable(), // ObjectId string, or null to remove from folder
});


// --- Inferred Types ---
export type Folder = z.infer<typeof folderSchema>;
export type Play = z.infer<typeof playSchema>;
export type BallState = z.infer<typeof ballState>;
export type KeyFrame = z.infer<typeof keyFrame>;

// Types for input validation schemas (optional, but good practice)
export type CreateFolderInput = z.infer<typeof createFolderSchema>;
export type CreatePlayInput = z.infer<typeof createPlaySchema>;
export type UpdateFolderInput = z.infer<typeof updateFolderSchema>;
export type UpdatePlayFolderInput = z.infer<typeof updatePlayFolderSchema>;

// Note: The main `folderSchema` and `playSchema` represent the shape of documents
// retrieved from the database (including _id, createdAt, updatedAt).
// The "create" and "update" schemas are for validating client input
// before it's processed and before database-managed fields are added/updated.
// `playSchema.folderId` is nullable to allow plays not associated with any folder.
// `createPlaySchema.folderId` is optional: if not provided, the play is created without a folder.
// `updatePlayFolderSchema.folderId` is nullable: can be set to a new folder's ID string or null to remove from folder.