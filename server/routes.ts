import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { resumes, jobOffers, comments } from "@db/schema";
import { eq } from "drizzle-orm";
import bodyParser from "body-parser";

export function registerRoutes(app: Express): Server {
  // Configure body-parser to handle payloads up to 5MB
  app.use(bodyParser.json({ limit: '5mb' }));
  app.use(bodyParser.urlencoded({ limit: '5mb', extended: true }));

  setupAuth(app);

  // Resume routes
  app.post("/api/resumes", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { title, fileUrl, isPublic } = req.body;
    const [resume] = await db
      .insert(resumes)
      .values({
        title,
        fileUrl,
        isPublic,
        userId: req.user.id,
      })
      .returning();
    res.json(resume);
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