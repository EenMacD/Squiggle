import { plays, type Play, type InsertPlay } from "@shared/schema";

export interface IStorage {
  getPlays(): Promise<Play[]>;
  getPlaysByCategory(category: string): Promise<Play[]>;
  createPlay(play: InsertPlay): Promise<Play>;
  deletePlay(id: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private plays: Map<number, Play>;
  private currentId: number;

  constructor() {
    this.plays = new Map();
    this.currentId = 1;
  }

  async getPlays(): Promise<Play[]> {
    return Array.from(this.plays.values());
  }

  async getPlaysByCategory(category: string): Promise<Play[]> {
    return Array.from(this.plays.values()).filter(
      (play) => play.category === category
    );
  }

  async createPlay(insertPlay: InsertPlay): Promise<Play> {
    const id = this.currentId++;
    const play = { ...insertPlay, id };
    this.plays.set(id, play);
    return play;
  }

  async deletePlay(id: number): Promise<void> {
    this.plays.delete(id);
  }
}

export const storage = new MemStorage();
