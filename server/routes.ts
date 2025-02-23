import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertPlaySchema, insertFolderSchema } from "@shared/schema";
import { log } from "./vite";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Initialize WebSocket server
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws',
    clientTracking: true 
  });

  // WebSocket connection handling
  wss.on('connection', (ws) => {
    log('WebSocket client connected');

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());

        // Handle different message types
        switch (message.type) {
          case 'PLAY_START':
            // Broadcast play start to all clients
            wss.clients.forEach((client) => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'PLAY_START',
                  playId: message.playId,
                  timestamp: Date.now()
                }));
              }
            });
            break;

          case 'PLAY_UPDATE':
            // Broadcast position updates to all clients
            wss.clients.forEach((client) => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: 'PLAY_UPDATE',
                  positions: message.positions,
                  timestamp: Date.now()
                }));
              }
            });
            break;
        }
      } catch (error) {
        log(`WebSocket message error: ${error}`);
      }
    });

    ws.on('error', (error) => {
      log(`WebSocket client error: ${error}`);
    });

    ws.on('close', () => {
      log('WebSocket client disconnected');
    });
  });

  // Folder Routes
  app.get("/api/folders", async (_req, res) => {
    try {
      const folders = await storage.getFolders();
      res.json(folders);
    } catch (error) {
      log(`Error getting folders: ${error}`);
      res.status(500).json({ error: "Failed to get folders" });
    }
  });

  app.post("/api/folders", async (req, res) => {
    try {
      const result = insertFolderSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }
      const folder = await storage.createFolder(result.data);
      res.json(folder);
    } catch (error) {
      log(`Error creating folder: ${error}`);
      res.status(500).json({ error: "Failed to create folder" });
    }
  });

  app.delete("/api/folders/:id", async (req, res) => {
    try {
      await storage.deleteFolder(Number(req.params.id));
      res.status(204).end();
    } catch (error) {
      log(`Error deleting folder: ${error}`);
      res.status(500).json({ error: "Failed to delete folder" });
    }
  });

  app.patch("/api/folders/:id", async (req, res) => {
    try {
      const { name } = req.body;
      if (!name?.trim()) {
        return res.status(400).json({ error: "Folder name is required" });
      }
      const folder = await storage.renameFolder(Number(req.params.id), name.trim());
      res.json(folder);
    } catch (error) {
      log(`Error renaming folder: ${error}`);
      res.status(500).json({ error: "Failed to rename folder" });
    }
  });

  // Play Routes
  app.get("/api/plays", async (_req, res) => {
    try {
      const plays = await storage.getPlays();
      res.json(plays);
    } catch (error) {
      log(`Error getting plays: ${error}`);
      res.status(500).json({ error: "Failed to get plays" });
    }
  });

  app.get("/api/plays/:id", async (req, res) => {
    try {
      const plays = await storage.getPlays();
      const play = plays.find(p => p.id === Number(req.params.id));
      if (!play) {
        return res.status(404).json({ error: "Play not found" });
      }
      res.json(play);
    } catch (error) {
      log(`Error getting play: ${error}`);
      res.status(500).json({ error: "Failed to get play" });
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

  app.patch("/api/plays/:id/folder", async (req, res) => {
    try {
      const { folderId } = req.body;
      const play = await storage.updatePlayFolder(Number(req.params.id), folderId);
      res.json(play);
    } catch (error) {
      log(`Error updating play folder: ${error}`);
      res.status(500).json({ error: "Failed to update play folder" });
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