import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { resumes, jobOffers, comments, networkInvitations, networkConnections, users } from "@db/schema";
import { eq, and, or, desc } from "drizzle-orm";
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
      .where(eq(resumes.userId, req.user.id))
      .orderBy(desc(resumes.createdAt));
    res.json(userResumes);
  });

  app.get("/api/resumes/:id", async (req, res) => {
    const [resume] = await db
      .select()
      .from(resumes)
      .where(eq(resumes.id, req.params.id))
      .limit(1);

    if (!resume) return res.sendStatus(404);

    // Check if user has access to the resume
    if (!resume.isPublic && (!req.user || resume.userId !== req.user.id)) {
      // If not public, check if users are connected
      if (!req.user) return res.sendStatus(403);

      const [connection] = await db
        .select()
        .from(networkConnections)
        .where(
          or(
            and(
              eq(networkConnections.userId1, req.user.id),
              eq(networkConnections.userId2, resume.userId)
            ),
            and(
              eq(networkConnections.userId1, resume.userId),
              eq(networkConnections.userId2, req.user.id)
            )
          )
        )
        .limit(1);

      if (!connection) return res.sendStatus(403);
    }

    res.json(resume);
  });

  // Add new route for toggling resume mode
  app.patch("/api/resumes/:id/mode", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const { mode } = req.body;
    if (!['share', 'collaborate'].includes(mode)) {
      return res.status(400).json({ error: 'Invalid mode' });
    }

    // Verify ownership
    const [resume] = await db
      .select()
      .from(resumes)
      .where(eq(resumes.id, req.params.id))
      .limit(1);

    if (!resume) return res.sendStatus(404);
    if (resume.userId !== req.user.id) return res.sendStatus(403);

    const [updatedResume] = await db
      .update(resumes)
      .set({ 
        mode,
        updatedAt: resume.updatedAt 
      })
      .where(eq(resumes.id, req.params.id))
      .returning();

    res.json(updatedResume);
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

    // Check if user has access to comment
    const [resume] = await db
      .select()
      .from(resumes)
      .where(eq(resumes.id, req.params.id))
      .limit(1);

    if (!resume) return res.sendStatus(404);

    // Only allow comments if user is owner or resume is in collaborate mode
    if (resume.userId !== req.user.id && resume.mode !== 'collaborate') {
      return res.sendStatus(403);
    }

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

  app.patch("/api/resumes/:resumeId/comments/:commentId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const { content } = req.body;
    const commentId = parseInt(req.params.commentId);

    // First check if the comment exists and belongs to the user
    const [existingComment] = await db
      .select()
      .from(comments)
      .where(eq(comments.id, commentId))
      .limit(1);

    if (!existingComment) return res.sendStatus(404);
    if (existingComment.userId !== req.user.id) return res.sendStatus(403);

    const [updatedComment] = await db
      .update(comments)
      .set({ content })
      .where(eq(comments.id, commentId))
      .returning();

    res.json(updatedComment);
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

  // Network routes
  app.post("/api/network/invite", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const { receiverId } = req.body;
    if (!receiverId) return res.status(400).json({ error: 'Receiver ID is required' });

    // Check if invitation already exists
    const [existingInvitation] = await db
      .select()
      .from(networkInvitations)
      .where(
        and(
          eq(networkInvitations.senderId, req.user.id),
          eq(networkInvitations.receiverId, receiverId),
          eq(networkInvitations.status, 'pending')
        )
      )
      .limit(1);

    if (existingInvitation) {
      return res.status(400).json({ error: 'Invitation already sent' });
    }

    const [invitation] = await db
      .insert(networkInvitations)
      .values({
        senderId: req.user.id,
        receiverId: receiverId,
      })
      .returning();

    res.json(invitation);
  });

  app.get("/api/network/invitations", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      // Get both sent and received invitations with proper joins
      const result = await db.execute(
        `SELECT 
          ni.id,
          ni.status,
          ni.created_at as "createdAt",
          ni.sender_id as "senderId",
          ni.receiver_id as "receiverId",
          sender.id as "sender.id",
          sender.username as "sender.username",
          receiver.id as "receiver.id",
          receiver.username as "receiver.username"
        FROM network_invitations ni
        LEFT JOIN users sender ON ni.sender_id = sender.id
        LEFT JOIN users receiver ON ni.receiver_id = receiver.id
        WHERE ni.sender_id = ${req.user.id} OR ni.receiver_id = ${req.user.id}
        ORDER BY ni.created_at DESC`
      );

      // Transform the flat results into nested objects
      const transformedInvitations = result.rows.map((row: any) => ({
        id: row.id,
        status: row.status,
        createdAt: row.createdAt,
        senderId: row.senderId,
        receiverId: row.receiverId,
        sender: {
          id: row["sender.id"],
          username: row["sender.username"],
        },
        receiver: {
          id: row["receiver.id"],
          username: row["receiver.username"],
        },
        type: row.senderId === req.user.id ? 'sent' : 'received'
      }));

      res.json(transformedInvitations);
    } catch (error) {
      console.error('Error fetching network invitations:', error);
      res.status(500).json({ error: 'Failed to fetch network invitations' });
    }
  });

  app.post("/api/network/invitations/:id/:action", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const { id, action } = req.params;
    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    // Get the invitation and check if user is the receiver
    const [invitation] = await db
      .select()
      .from(networkInvitations)
      .where(
        and(
          eq(networkInvitations.id, parseInt(id)),
          eq(networkInvitations.receiverId, req.user.id),
          eq(networkInvitations.status, 'pending')
        )
      )
      .limit(1);

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (action === 'accept') {
      // Create network connection
      await db
        .insert(networkConnections)
        .values({
          userId1: invitation.senderId,
          userId2: invitation.receiverId,
        });
    }

    // Update invitation status
    const [updatedInvitation] = await db
      .update(networkInvitations)
      .set({ status: action === 'accept' ? 'accepted' : 'rejected' })
      .where(eq(networkInvitations.id, invitation.id))
      .returning();

    res.json(updatedInvitation);
  });

  app.get("/api/network/connections", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    // Get all connections where the user is either userId1 or userId2
    const connections = await db
      .select({
        id: networkConnections.id,
        createdAt: networkConnections.createdAt,
        connectedUser: {
          id: users.id,
          username: users.username,
        },
      })
      .from(networkConnections)
      .leftJoin(
        users,
        and(
          or(
            eq(networkConnections.userId1, req.user.id),
            eq(networkConnections.userId2, req.user.id)
          ),
          or(
            and(
              eq(networkConnections.userId1, req.user.id),
              eq(users.id, networkConnections.userId2)
            ),
            and(
              eq(networkConnections.userId2, req.user.id),
              eq(users.id, networkConnections.userId1)
            )
          )
        )
      )
      .where(
        or(
          eq(networkConnections.userId1, req.user.id),
          eq(networkConnections.userId2, req.user.id)
        )
      );

    res.json(connections);
  });

  app.get("/api/users/search", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const { query } = req.query;
    if (!query || typeof query !== "string") {
      return res.status(400).json({ error: "Search query is required" });
    }

    // Search for users by username, excluding the current user
    const searchResults = await db
      .select({
        id: users.id,
        username: users.username,
      })
      .from(users)
      .where(eq(users.username, query))
      .limit(10);

    res.json(searchResults.filter(user => user.id !== req.user.id));
  });


  const httpServer = createServer(app);
  return httpServer;
}