import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add CORS middleware for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Function to handle graceful shutdown
function gracefulShutdown(server: any) {
  return () => {
    log('Received shutdown signal. Closing server...');
    server.close(() => {
      log('Server closed. Exiting process.');
      process.exit(0);
    });
  };
}

(async () => {
  try {
    log('Initializing server...');
    const server = await registerRoutes(app);

    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      log(`Error: ${status} - ${message}`);
      res.status(status).json({ message });
    });

    // Set up Vite or static serving based on environment
    if (process.env.NODE_ENV !== "production") {
      log('Setting up Vite middleware...');
      await setupVite(app, server);
      log('Vite middleware setup complete');
    } else {
      log('Setting up static file serving...');
      serveStatic(app);
    }

    const PORT = Number(process.env.PORT) || 5000; // Changed fallback port to 5000
    log(`Starting server on port ${PORT}...`);

    server.listen(PORT, "0.0.0.0", () => {
      log(`Server listening on port ${PORT}`);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', gracefulShutdown(server));
    process.on('SIGINT', gracefulShutdown(server));

  } catch (error) {
    log(`Failed to start server: ${error}`);
    process.exit(1);
  }
})();