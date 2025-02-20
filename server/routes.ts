import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { storage } from "./storage";
import { insertPlaySchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  app.get("/api/plays", async (_req, res) => {
    const plays = await storage.getPlays();
    res.json(plays);
  });

  app.get("/api/plays/category/:category", async (req, res) => {
    const plays = await storage.getPlaysByCategory(req.params.category);
    res.json(plays);
  });

  app.post("/api/plays", async (req, res) => {
    const result = insertPlaySchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    const play = await storage.createPlay(result.data);
    res.json(play);
  });

  app.delete("/api/plays/:id", async (req, res) => {
    await storage.deletePlay(Number(req.params.id));
    res.status(204).end();
  });

  wss.on('connection', (ws) => {
    ws.on('message', (data) => {
      // Broadcast game state updates to all clients
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(data);
        }
      });
    });
  });

  return httpServer;
}
