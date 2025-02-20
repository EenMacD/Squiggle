import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertPlaySchema } from "@shared/schema";
import { log } from "./vite";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws',
    clientTracking: true 
  });

  wss.on('connection', (ws) => {
    log('WebSocket client connected');

    ws.on('message', (data) => {
      try {
        // Broadcast game state updates to all clients
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(data);
          }
        });
      } catch (error) {
        log(`WebSocket message error: ${error}`);
      }
    });

    ws.on('error', (error) => {
      log(`WebSocket error: ${error}`);
    });

    ws.on('close', () => {
      log('WebSocket client disconnected');
    });
  });

  wss.on('error', (error) => {
    log(`WebSocket server error: ${error}`);
  });

  app.get("/api/plays", async (_req, res) => {
    try {
      const plays = await storage.getPlays();
      res.json(plays);
    } catch (error) {
      log(`Error getting plays: ${error}`);
      res.status(500).json({ error: "Failed to get plays" });
    }
  });

  app.get("/api/plays/category/:category", async (req, res) => {
    try {
      const plays = await storage.getPlaysByCategory(req.params.category);
      res.json(plays);
    } catch (error) {
      log(`Error getting plays by category: ${error}`);
      res.status(500).json({ error: "Failed to get plays by category" });
    }
  });

  app.post("/api/plays", async (req, res) => {
    try {
      const result = insertPlaySchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      const play = await storage.createPlay(result.data);
      res.json(play);
    } catch (error) {
      log(`Error creating play: ${error}`);
      res.status(500).json({ error: "Failed to create play" });
    }
  });

  app.delete("/api/plays/:id", async (req, res) => {
    try {
      await storage.deletePlay(Number(req.params.id));
      res.status(204).end();
    } catch (error) {
      log(`Error deleting play: ${error}`);
      res.status(500).json({ error: "Failed to delete play" });
    }
  });

  return httpServer;
}