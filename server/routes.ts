import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { resumes, jobOffers, comments } from "@db/schema";
import { eq } from "drizzle-orm";
import bodyParser from "body-parser";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";

// Configure multer for handling file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(process.cwd(), 'uploads');
    // Ensure uploads directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed'));
    }
    cb(null, true);
  }
});

export function registerRoutes(app: Express): Server {
  // Configure body-parser to handle larger payloads
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

  // Serve uploaded files statically
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  setupAuth(app);

  // Resume routes
  app.post("/api/resumes", upload.single('file'), async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.sendStatus(401);
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

      const { title, isPublic } = req.body;
      if (!title) return res.status(400).json({ error: 'Title is required' });

      // Generate the file URL
      const fileUrl = `/uploads/${req.file.filename}`;

      const [resume] = await db
        .insert(resumes)
        .values({
          title,
          fileUrl,
          isPublic: isPublic === 'true',
          userId: req.user.id,
        })
        .returning();

      res.json(resume);
    } catch (error) {
      console.error('Error uploading resume:', error);
      res.status(500).json({ error: 'Failed to upload resume' });
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
    const { content, parentId } = req.body;
    const [comment] = await db
      .insert(comments)
      .values({
        resumeId: req.params.id,
        userId: req.user.id,
        content,
        parentId: parentId || null,
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

    // Fetch comments with their replies
    const allComments = await db
      .select({
        id: comments.id,
        content: comments.content,
        userId: comments.userId,
        parentId: comments.parentId,
        createdAt: comments.createdAt,
      })
      .from(comments)
      .where(eq(comments.resumeId, req.params.id))
      .orderBy(comments.createdAt);

    // Organize comments into threads
    const threadedComments = allComments.reduce((acc, comment) => {
      if (!comment.parentId) {
        // This is a root comment
        acc[comment.id] = {
          ...comment,
          replies: [],
        };
      } else if (acc[comment.parentId]) {
        // This is a reply
        acc[comment.parentId].replies.push(comment);
      }
      return acc;
    }, {});

    // Convert to array and only return root comments with their replies
    const rootComments = Object.values(threadedComments);

    res.json(rootComments);
  });

  const httpServer = createServer(app);
  return httpServer;
}