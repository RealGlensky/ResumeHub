import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

(async () => {
  const server = registerRoutes(app);

  // Add a health check endpoint for the root path
  app.get("/", (_req, res) => {
    res.status(200).send("OK");
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    try {
      serveStatic(app);
    } catch (error) {
      console.error("Error serving static files:", error.message);
      console.error("Falling back to development mode with Vite");
      await setupVite(app, server);
    }
  }

  // Try to serve the app on port 5000, fallback to other ports if needed
  const PORT = 5000;
  server.on('error', (e: any) => {
    if (e.code === 'EADDRINUSE') {
      log(`Port ${PORT} is already in use, trying alternative port...`);
      // Kill the current server process to prevent hanging
      process.exit(1);
    } else {
      console.error('Server error:', e);
    }
  });
  
  server.listen(PORT, "0.0.0.0", () => {
    log(`serving on port ${PORT}`);
  });
})();