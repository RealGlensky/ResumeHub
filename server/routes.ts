import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { resumes, jobOffers, comments } from "@db/schema";
import { eq } from "drizzle-orm";
import bodyParser from "body-parser";
import crypto from "crypto";
import path from "path";
import fs from "fs";

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export function registerRoutes(app: Express): Server {
  // Configure body-parser to handle payloads up to 5MB
  app.use(bodyParser.json({ limit: '5mb' }));
  app.use(bodyParser.urlencoded({ limit: '5mb', extended: true }));

  setupAuth(app);

  // Set response headers to handle large files
  app.use((req, res, next) => {
    res.setHeader('nginx_client_max_body_size', '5m');
    next();
  });

  // Serve PDF files from uploads directory
  app.get("/uploads/:filename", async (req, res) => {
    const filePath = path.join(uploadsDir, req.params.filename);
    // Basic security check to prevent directory traversal
    if (!filePath.startsWith(uploadsDir)) {
      return res.sendStatus(403);
    }
    res.sendFile(filePath);
  });

  // Resume routes
  app.post("/api/resumes", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { title, fileUrl, isPublic } = req.body;

    try {
      // Convert base64 to file and save
      const base64Data = fileUrl.replace(/^data:application\/pdf;base64,/, "");
      const filename = `${crypto.randomBytes(16).toString('hex')}.pdf`;
      const filePath = path.join(uploadsDir, filename);

      fs.writeFileSync(filePath, base64Data, 'base64');

      const [resume] = await db
        .insert(resumes)
        .values({
          title,
          fileUrl: `/uploads/${filename}`,
          isPublic,
          userId: req.user.id,
        })
        .returning();
      res.json(resume);
    } catch (error) {
      console.error('Error saving PDF:', error);
      res.status(500).json({ error: 'Failed to save PDF file' });
    }
  });

  app.get("/api/resumes", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userResumes = await db
      .select()
      .from(resumes)
      .where(eq(resumes.userId, req.user.id));
    res.json(userResumes);
  });

  app.get("/api/resumes/:id", async (req, res) => {
    const [resume] = await db
      .select()
      .from(resumes)
      .where(eq(resumes.id, req.params.id))
      .limit(1);

    if (!resume) return res.sendStatus(404);
    if (!resume.isPublic && (!req.user || resume.userId !== req.user.id)) {
      return res.sendStatus(403);
    }

    res.json(resume);
  });

  // Job offer routes
  app.post("/api/resumes/:id/offers", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { company, position, status } = req.body;
    const [jobOffer] = await db
      .insert(jobOffers)
      .values({
        resumeId: req.params.id,
        company,
        position,
        status,
      })
      .returning();
    res.json(jobOffer);
  });

  app.get("/api/resumes/:id/offers", async (req, res) => {
    const [resume] = await db
      .select()
      .from(resumes)
      .where(eq(resumes.id, req.params.id))
      .limit(1);

    if (!resume) return res.sendStatus(404);
    if (!resume.isPublic && (!req.user || resume.userId !== req.user.id)) {
      return res.sendStatus(403);
    }

    const offers = await db
      .select()
      .from(jobOffers)
      .where(eq(jobOffers.resumeId, req.params.id));
    res.json(offers);
  });

  // Comment routes
  app.post("/api/resumes/:id/comments", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { content } = req.body;
    const [comment] = await db
      .insert(comments)
      .values({
        resumeId: req.params.id,
        userId: req.user.id,
        content,
      })
      .returning();
    res.json(comment);
  });

  app.get("/api/resumes/:id/comments", async (req, res) => {
    const [resume] = await db
      .select()
      .from(resumes)
      .where(eq(resumes.id, req.params.id))
      .limit(1);

    if (!resume) return res.sendStatus(404);
    if (!resume.isPublic && (!req.user || resume.userId !== req.user.id)) {
      return res.sendStatus(403);
    }

    const resumeComments = await db
      .select()
      .from(comments)
      .where(eq(comments.resumeId, req.params.id));
    res.json(resumeComments);
  });

  const httpServer = createServer(app);
  return httpServer;
}