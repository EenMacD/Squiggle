import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { 
  createFolderSchema, 
  createPlaySchema, 
  updateFolderSchema,
  updatePlayFolderSchema 
} from "@shared/schema";
import { log } from "./vite"; // Assuming log is a generic logger

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
        log(`WebSocket message error: ${error instanceof Error ? error.message : String(error)}`);
      }
    });

    ws.on('error', (error) => {
      log(`WebSocket client error: ${error.message}`);
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
      log(`Error getting folders: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
      res.status(500).json({ error: "Failed to get folders" });
    }
  });

  app.post("/api/folders", async (req, res) => {
    try {
      const result = createFolderSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.flatten() });
      }
      const folder = await storage.createFolder(result.data);
      res.status(201).json(folder);
    } catch (error) {
      log(`Error creating folder: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
      res.status(500).json({ error: "Failed to create folder" });
    }
  });

  app.delete("/api/folders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteFolder(id);
      res.status(204).end();
    } catch (error) {
      log(`Error deleting folder: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
      res.status(500).json({ error: "Failed to delete folder" });
    }
  });

  app.patch("/api/folders/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const result = updateFolderSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.flatten() });
      }
      const folder = await storage.renameFolder(id, result.data);
      if (!folder) {
        return res.status(404).json({ error: "Folder not found or failed to update" });
      }
      res.json(folder);
    } catch (error) {
      log(`Error renaming folder: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
      res.status(500).json({ error: "Failed to rename folder" });
    }
  });

  // Play Routes
  app.get("/api/plays", async (_req, res) => {
    try {
      const plays = await storage.getPlays();
      res.json(plays);
    } catch (error) {
      log(`Error getting plays: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
      res.status(500).json({ error: "Failed to get plays" });
    }
  });

  app.get("/api/plays/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const play = await storage.getPlayById(id);
      if (!play) {
        return res.status(404).json({ error: "Play not found" });
      }
      res.json(play);
    } catch (error) {
      log(`Error getting play by ID: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
      res.status(500).json({ error: "Failed to get play" });
    }
  });

  app.get("/api/plays/category/:category", async (req, res) => {
    try {
      const { category } = req.params;
      const plays = await storage.getPlaysByCategory(category);
      res.json(plays);
    } catch (error) {
      log(`Error getting plays by category: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
      res.status(500).json({ error: "Failed to get plays by category" });
    }
  });

  app.post("/api/plays", async (req, res) => {
    try {
      const result = createPlaySchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.flatten() });
      }
      const play = await storage.createPlay(result.data);
      res.status(201).json(play);
    } catch (error) {
      log(`Error creating play: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
      res.status(500).json({ error: "Failed to create play" });
    }
  });

  app.patch("/api/plays/:id/folder", async (req, res) => {
    try {
      const { id } = req.params;
      const result = updatePlayFolderSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: result.error.flatten() });
      }
      const play = await storage.updatePlayFolder(id, result.data);
      if (!play) {
        return res.status(404).json({ error: "Play not found or failed to update" });
      }
      res.json(play);
    } catch (error) {
      log(`Error updating play folder: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
      res.status(500).json({ error: "Failed to update play folder" });
    }
  });

  app.delete("/api/plays/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deletePlay(id);
      res.status(204).end();
    } catch (error) {
      log(`Error deleting play: ${error instanceof Error ? error.message : JSON.stringify(error)}`);
      res.status(500).json({ error: "Failed to delete play" });
    }
  });

  return httpServer;
}