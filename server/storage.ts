import { plays, type Play, type InsertPlay } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getPlays(): Promise<Play[]>;
  getPlaysByCategory(category: string): Promise<Play[]>;
  createPlay(play: InsertPlay): Promise<Play>;
  deletePlay(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getPlays(): Promise<Play[]> {
    return await db.select().from(plays);
  }

  async getPlaysByCategory(category: string): Promise<Play[]> {
    return await db
      .select()
      .from(plays)
      .where(eq(plays.category, category));
  }

  async createPlay(insertPlay: InsertPlay): Promise<Play> {
    const [play] = await db
      .insert(plays)
      .values([insertPlay])
      .returning();
    return play;
  }

  async deletePlay(id: number): Promise<void> {
    await db
      .delete(plays)
      .where(eq(plays.id, id));
  }
}

export const storage = new DatabaseStorage();