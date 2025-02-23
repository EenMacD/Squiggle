import { plays, folders, type Play, type InsertPlay, type Folder, type InsertFolder } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Folder operations
  getFolders(): Promise<Folder[]>;
  createFolder(folder: InsertFolder): Promise<Folder>;
  deleteFolder(id: number): Promise<void>;
  renameFolder(id: number, name: string): Promise<Folder>;

  // Play operations
  getPlays(): Promise<Play[]>;
  getPlaysByFolder(folderId: number): Promise<Play[]>;
  getPlaysByCategory(category: string): Promise<Play[]>;
  createPlay(play: InsertPlay): Promise<Play>;
  deletePlay(id: number): Promise<void>;
  updatePlayFolder(playId: number, folderId: number | null): Promise<Play>;
}

export class DatabaseStorage implements IStorage {
  async getFolders(): Promise<Folder[]> {
    return await db
      .select()
      .from(folders)
      .orderBy(desc(folders.createdAt));
  }

  async createFolder(insertFolder: InsertFolder): Promise<Folder> {
    const now = new Date();
    const [folder] = await db
      .insert(folders)
      .values({
        name: insertFolder.name,
        createdAt: now,
        updatedAt: now
      })
      .returning();
    return folder;
  }

  async renameFolder(id: number, name: string): Promise<Folder> {
    const [folder] = await db
      .update(folders)
      .set({ 
        name,
        updatedAt: new Date()
      })
      .where(eq(folders.id, id))
      .returning();
    return folder;
  }

  async deleteFolder(id: number): Promise<void> {
    // First, update all plays in this folder to have no folder
    await db
      .update(plays)
      .set({ folderId: null })
      .where(eq(plays.folderId, id));

    // Then delete the folder
    await db
      .delete(folders)
      .where(eq(folders.id, id));
  }

  async getPlays(): Promise<Play[]> {
    return await db
      .select()
      .from(plays)
      .orderBy(desc(plays.createdAt));
  }

  async getPlaysByFolder(folderId: number): Promise<Play[]> {
    return await db
      .select()
      .from(plays)
      .where(eq(plays.folderId, folderId))
      .orderBy(desc(plays.createdAt));
  }

  async getPlaysByCategory(category: string): Promise<Play[]> {
    return await db
      .select()
      .from(plays)
      .where(eq(plays.category, category))
      .orderBy(desc(plays.createdAt));
  }

  async createPlay(insertPlay: InsertPlay): Promise<Play> {
    const now = new Date();
    const [play] = await db
      .insert(plays)
      .values({
        name: insertPlay.name,
        category: insertPlay.category,
        folderId: insertPlay.folderId,
        keyframes: insertPlay.keyframes,
        createdAt: now,
        updatedAt: now
      })
      .returning();
    return play;
  }

  async deletePlay(id: number): Promise<void> {
    await db
      .delete(plays)
      .where(eq(plays.id, id));
  }

  async updatePlayFolder(playId: number, folderId: number | null): Promise<Play> {
    const [play] = await db
      .update(plays)
      .set({ 
        folderId,
        updatedAt: new Date()
      })
      .where(eq(plays.id, playId))
      .returning();
    return play;
  }
}

export const storage = new DatabaseStorage();