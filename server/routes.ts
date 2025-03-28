import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { resumes, jobOffers, comments, networkInvitations, networkConnections, users } from "@db/schema";
import { eq, and, or, desc, inArray, not, ilike, exists } from "drizzle-orm";
import bodyParser from "body-parser";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";
import { comparePasswords, hashPassword } from './auth';
import { log } from './vite';

// Configure multer for handling image uploads
const imageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(process.cwd(), 'uploads', 'profile-pictures');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// Update the multer configuration for profile pictures
const imageUpload = multer({
  storage: imageStorage,
  limits: {
    fileSize: 20 * 1024 * 1024 // Increased to 20MB limit
  },
  fileFilter: function (req, file, cb) {
    // More permissive mime type checking
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

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
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

      const { title, isPublic, isVisible } = req.body;
      if (!title) return res.status(400).json({ error: 'Title is required' });

      // Generate the file URL
      const fileUrl = `/uploads/${req.file.filename}`;

      const [resume] = await db
        .insert(resumes)
        .values({
          title,
          fileUrl,
          isPublic: isPublic === 'true',
          isVisible: isVisible === 'true',
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
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
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

    // Case 1: Resume is public - anyone can view
    if (resume.isPublic) {
      return res.json(resume);
    }
    
    // Case 2: User is the owner - always has access
    if (req.user && resume.userId === req.user.id) {
      return res.json(resume);
    }
    
    // Case 3: Private resume - check if user is authenticated, connected, and resume is visible
    if (!req.user) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    
    // If resume is not visible to connections, deny access
    if (!resume.isVisible) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    
    // Check if users are connected
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

    if (!connection) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    res.json(resume);
  });

  // Add correct type annotation for the resume id
  app.delete("/api/resumes/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

    try {
      const resumeId = req.params.id;
      if (!resumeId) {
        return res.status(400).json({ error: "Resume ID is required" });
      }

      // Verify ownership
      const [resume] = await db
        .select()
        .from(resumes)
        .where(eq(resumes.id, resumeId))
        .limit(1);

      if (!resume) return res.status(404).json({ error: "Resume not found" });
      if (resume.userId !== req.user.id) return res.status(403).json({ error: "Unauthorized" });

      // Delete the resume file if it exists
      if (resume.fileUrl) {
        const filePath = path.join(process.cwd(), resume.fileUrl.substring(1)); //remove leading slash
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            log(`Successfully deleted resume file: ${filePath}`);
          }
        } catch (fileError) {
          console.error('Error deleting resume file:', fileError);
          // Continue with database deletion even if file deletion fails
        }
      }

      // Delete all comments associated with the resume first
      await db
        .delete(comments)
        .where(eq(comments.resumeId, resumeId));

      // Delete all job offers associated with the resume
      await db
        .delete(jobOffers)
        .where(eq(jobOffers.resumeId, resumeId));

      // Delete the resume from database
      await db
        .delete(resumes)
        .where(eq(resumes.id, resumeId));

      log(`Successfully deleted resume with ID: ${resumeId}`);
      res.json({ message: "Resume deleted successfully" });
    } catch (error) {
      console.error('Error deleting resume:', error);
      res.status(500).json({ error: 'Failed to delete resume' });
    }
  });

  // Route for toggling public/private status
  app.patch("/api/resumes/:id/visibility", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

    const { isPublic } = req.body;
    if (typeof isPublic !== 'boolean') {
      return res.status(400).json({ error: 'isPublic must be a boolean' });
    }

    // Verify ownership
    const [resume] = await db
      .select()
      .from(resumes)
      .where(eq(resumes.id, req.params.id))
      .limit(1);

    if (!resume) return res.sendStatus(404);
    if (resume.userId !== req.user.id) return res.status(403).json({ error: "Unauthorized" });

    const [updatedResume] = await db
      .update(resumes)
      .set({
        isPublic,
      })
      .where(eq(resumes.id, req.params.id))
      .returning();

    res.json(updatedResume);
  });
  
  // Route for toggling network visibility (visible to connections)
  app.patch("/api/resumes/:id/network-visibility", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

    const { isVisible } = req.body;
    if (typeof isVisible !== 'boolean') {
      return res.status(400).json({ error: 'isVisible must be a boolean' });
    }

    // Verify ownership
    const [resume] = await db
      .select()
      .from(resumes)
      .where(eq(resumes.id, req.params.id))
      .limit(1);

    if (!resume) return res.sendStatus(404);
    if (resume.userId !== req.user.id) return res.status(403).json({ error: "Unauthorized" });

    const [updatedResume] = await db
      .update(resumes)
      .set({
        isVisible,
      })
      .where(eq(resumes.id, req.params.id))
      .returning();

    res.json(updatedResume);
  });


  // Add back the mode toggle endpoint
  app.patch("/api/resumes/:id/mode", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

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
    if (resume.userId !== req.user.id) return res.status(403).json({ error: "Unauthorized" });

    const [updatedResume] = await db
      .update(resumes)
      .set({
        mode,
      })
      .where(eq(resumes.id, req.params.id))
      .returning();

    res.json(updatedResume);
  });
  
  // Add public toggle endpoint
  app.patch("/api/resumes/:id/visibility", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

    const { isPublic } = req.body;
    if (typeof isPublic !== 'boolean') {
      return res.status(400).json({ error: 'isPublic must be a boolean value' });
    }

    // Verify ownership
    const [resume] = await db
      .select()
      .from(resumes)
      .where(eq(resumes.id, req.params.id))
      .limit(1);

    if (!resume) return res.sendStatus(404);
    if (resume.userId !== req.user.id) return res.status(403).json({ error: "Unauthorized" });

    const [updatedResume] = await db
      .update(resumes)
      .set({
        isPublic,
      })
      .where(eq(resumes.id, req.params.id))
      .returning();

    res.json(updatedResume);
  });
  
  // Add network visibility toggle endpoint
  app.patch("/api/resumes/:id/network-visibility", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

    const { isVisible } = req.body;
    if (typeof isVisible !== 'boolean') {
      return res.status(400).json({ error: 'isVisible must be a boolean value' });
    }

    // Verify ownership
    const [resume] = await db
      .select()
      .from(resumes)
      .where(eq(resumes.id, req.params.id))
      .limit(1);

    if (!resume) return res.sendStatus(404);
    if (resume.userId !== req.user.id) return res.status(403).json({ error: "Unauthorized" });

    const [updatedResume] = await db
      .update(resumes)
      .set({
        isVisible,
      })
      .where(eq(resumes.id, req.params.id))
      .returning();

    res.json(updatedResume);
  });

  // Add this route after the existing user routes
  app.patch("/api/user/profile", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

    const { firstName, lastName, email, linkedinUrl, jobTitle, profileDescription, city, state, country } = req.body;

    try {
      // Check if email is already taken by another user
      if (email !== req.user.email) {
        const [existingUser] = await db
          .select()
          .from(users)
          .where(and(
            eq(users.email, email),
            not(eq(users.id, req.user.id))
          ))
          .limit(1);

        if (existingUser) {
          return res.status(400).json({ message: "Email already in use" });
        }
      }

      // Update user profile
      const [updatedUser] = await db
        .update(users)
        .set({
          firstName,
          lastName,
          email,
          linkedinUrl,
          jobTitle,
          profileDescription,
          city,
          state,
          country,
        })
        .where(eq(users.id, req.user.id))
        .returning();

      // Update the session with new user data
      req.user = updatedUser;

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Update the profile endpoint to handle profile picture updates
  app.post("/api/user/profile-picture", imageUpload.single('profilePicture'), async (req, res) => {
    try {
      if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

      const fileUrl = `/uploads/profile-pictures/${req.file.filename}`;

      // Delete old profile picture if it exists
      if (req.user.profilePictureUrl) {
        const oldFilePath = path.join(process.cwd(), req.user.profilePictureUrl.substring(1));
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }
      }

      const [updatedUser] = await db
        .update(users)
        .set({
          profilePictureUrl: fileUrl,
        })
        .where(eq(users.id, req.user.id))
        .returning();

      // Update the session with new user data
      req.user = updatedUser;
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating profile picture:", error);
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File is too large. Maximum size is 20MB.' }); // Updated error message
        }
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to update profile picture' });
    }
  });

  // Add password validation to the routes
  app.patch("/api/user/password", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Both current and new password are required' });
    }

    try {
      // Get user's current password hash
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.user.id))
        .limit(1);

      // Verify current password
      const isValid = await comparePasswords(currentPassword, user.password);
      if (!isValid) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      // Hash and update new password
      const hashedPassword = await hashPassword(newPassword);
      await db
        .update(users)
        .set({
          password: hashedPassword,
        })
        .where(eq(users.id, req.user.id));

      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      console.error('Error updating password:', error);
      res.status(500).json({ error: 'Failed to update password' });
    }
  });

  // Job offer routes
  app.post("/api/resumes/:id/offers", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });
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
    
    // Case 1: Resume is public - anyone can view
    if (resume.isPublic) {
      const offers = await db
        .select()
        .from(jobOffers)
        .where(eq(jobOffers.resumeId, req.params.id));
      return res.json(offers);
    }
    
    // Case 2: User is the owner - always has access
    if (req.user && resume.userId === req.user.id) {
      const offers = await db
        .select()
        .from(jobOffers)
        .where(eq(jobOffers.resumeId, req.params.id));
      return res.json(offers);
    }
    
    // Case 3: Private resume - check if user is authenticated, connected, and resume is visible
    if (!req.user) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    
    // If resume is not visible to connections, deny access
    if (!resume.isVisible) {
      return res.status(403).json({ error: "Unauthorized" });
    }
    
    // Check if users are connected
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

    if (!connection) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const offers = await db
      .select()
      .from(jobOffers)
      .where(eq(jobOffers.resumeId, req.params.id));
    res.json(offers);
  });

  // Comment routes
  app.post("/api/resumes/:id/comments", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

    // Check if user has access to comment
    const [resume] = await db
      .select()
      .from(resumes)
      .where(eq(resumes.id, req.params.id))
      .limit(1);

    if (!resume) return res.sendStatus(404);

    // Only allow comments if user is owner or resume is in collaborate mode
    if (resume.userId !== req.user.id && resume.mode !== 'collaborate') {
      return res.status(403).json({ error: "Unauthorized" });
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
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

    const { content } = req.body;
    const commentId = parseInt(req.params.commentId);

    // First check if the comment exists and belongs to the user
    const [existingComment] = await db
      .select()
      .from(comments)
      .where(eq(comments.id, commentId))
      .limit(1);

    if (!existingComment) return res.sendStatus(404);
    if (existingComment.userId !== req.user.id) return res.status(403).json({ error: "Unauthorized" });

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
    
    // Case 1: Resume is public - anyone can view
    if (resume.isPublic) {
      // Allow access to comments
    }
    // Case 2: User is the owner - always has access
    else if (req.user && resume.userId === req.user.id) {
      // Allow access to comments
    }
    // Case 3: Private resume - check if user is authenticated, connected, and resume is visible
    else {
      if (!req.user) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      // If resume is not visible to connections, deny access
      if (!resume.isVisible) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      
      // Check if users are connected
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

      if (!connection) {
        return res.status(403).json({ error: "Unauthorized" });
      }
    }

    // Fetch comments with their replies and profile pictures
    const allComments = await db
      .select({
        id: comments.id,
        content: comments.content,
        userId: comments.userId,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        profilePictureUrl: users.profilePictureUrl,
        parentId: comments.parentId,
        createdAt: comments.createdAt,
      })
      .from(comments)
      .leftJoin(users, eq(comments.userId, users.id))
      .where(eq(comments.resumeId, req.params.id))
      .orderBy(comments.createdAt);

    // Organize comments into threads
    const threadedComments = allComments.reduce((acc: any, comment) => {
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
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

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
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

    try {
      const result = await db.execute(
        `SELECT 
          ni.id,
          ni.status,
          ni.created_at as "createdAt",
          ni.sender_id as "senderId",
          ni.receiver_id as "receiverId",
          sender.id as "sender.id",
          sender.username as "sender.username",
          sender.first_name as "sender.firstName",
          sender.last_name as "sender.lastName",
          sender.email as "sender.email",
          sender.profile_picture_url as "sender.profilePictureUrl",
          sender.job_title as "sender.jobTitle",
          sender.city as "sender.city",
          sender.state as "sender.state",
          sender.country as "sender.country",
          receiver.id as "receiver.id",
          receiver.username as "receiver.username",
          receiver.first_name as "receiver.firstName",
          receiver.last_name as "receiver.lastName",
          receiver.email as "receiver.email",
          receiver.profile_picture_url as "receiver.profilePictureUrl",
          receiver.job_title as "receiver.jobTitle",
          receiver.city as "receiver.city",
          receiver.state as "receiver.state",
          receiver.country as "receiver.country",
          CASE 
            WHEN ni.sender_id = ${req.user.id} THEN 'sent'
            WHEN ni.receiver_id = ${req.user.id} THEN 'received'
          END as type
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
        type: row.type,
        sender: {
          id: row["sender.id"],
          username: row["sender.username"],
          firstName: row["sender.firstName"],
          lastName: row["sender.lastName"],
          email: row["sender.email"],
          profilePictureUrl: row["sender.profilePictureUrl"],
          jobTitle: row["sender.jobTitle"],
          city: row["sender.city"],
          state: row["sender.state"],
          country: row["sender.country"],
        },
        receiver: {
          id: row["receiver.id"],
          username: row["receiver.username"],
          firstName: row["receiver.firstName"],
          lastName: row["receiver.lastName"],
          email: row["receiver.email"],
          profilePictureUrl: row["receiver.profilePictureUrl"],
          jobTitle: row["receiver.jobTitle"],
          city: row["receiver.city"],
          state: row["receiver.state"],
          country: row["receiver.country"],
        }
      }));

      res.json(transformedInvitations);
    } catch (error) {
      console.error('Error fetching network invitations:', error);
      res.status(500).json({ error: 'Failed to fetch network invitations' });
    }
  });

  // Add route for canceling/removing a sent invitation
  app.delete("/api/network/invitations/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

    try {
      // Get the invitation and check if user is the sender
      const [invitation] = await db
        .select()
        .from(networkInvitations)
        .where(
          and(
            eq(networkInvitations.id, parseInt(req.params.id)),
            eq(networkInvitations.senderId, req.user.id),
            eq(networkInvitations.status, 'pending')
          )
        )
        .limit(1);

      if (!invitation) {
        return res.status(404).json({ error: 'Invitation not found' });
      }

      // Delete the invitation
      await db
        .delete(networkInvitations)
        .where(eq(networkInvitations.id, invitation.id));

      res.sendStatus(200);
    } catch (error) {
      console.error('Error canceling invitation:', error);
      res.status(500).json({ error: 'Failed to cancel invitation' });
    }
  });

  app.post("/api/network/invitations/:id/:action", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

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

    try {
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
    } catch (error) {
      console.error('Error processing invitation:', error);
      res.status(500).json({ error: 'Failed to process invitation' });
    }
  });

  // Update the network connections endpoint to include all user fields
  app.get("/api/network/connections", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

    // Get all connections where the user is either userId1 or userId2
    const connections = await db
      .select({
        id: networkConnections.id,
        createdAt: networkConnections.createdAt,
        connectedUser: {
          id: users.id,
          username: users.username,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          profilePictureUrl: users.profilePictureUrl,
          jobTitle: users.jobTitle,
          city: users.city,
          state: users.state,
          country: users.country,
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

  // Update the user search endpoint to include location fields
  app.get("/api/users/search", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

    const { query } = req.query;
    if (!query || typeof query !== "string") {
      return res.status(400).json({ error: "Search query is required" });
    }

    // Search for users by username, email, or name, excluding the current user
    const searchResults = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        profilePictureUrl: users.profilePictureUrl,
        jobTitle: users.jobTitle,
        city: users.city,
        state: users.state,
        country: users.country,
      })
      .from(users)
      .where(
        or(
          ilike(users.username, `%${query}%`),
          ilike(users.email, `%${query}%`),
          ilike(users.firstName, `%${query}%`),
          ilike(users.lastName, `%${query}%`)
        )
      )
      .limit(10);

    // Filter out sensitive information and current user
    const filteredResults = searchResults
      .filter(user => user.id !== req.user.id)
      .map(({ email, ...user }) => ({
        ...user,
        // Only include email if it exactly matches the search query
        email: email.toLowerCase() === query.toLowerCase() ? email : undefined
      }));

    res.json(filteredResults);
  });

  // Add route for public resumes (accessible to anyone)
  app.get("/api/public-resumes", async (req, res) => {
    try {
      // Get all public resumes
      const publicResumes = await db
        .select({
          ...resumes,
          owner: {
            id: users.id,
            username: users.username,
          },
        })
        .from(resumes)
        .leftJoin(users, eq(resumes.userId, users.id))
        .where(eq(resumes.isPublic, true))
        .orderBy(desc(resumes.createdAt));

      res.json(publicResumes);
    } catch (error) {
      console.error('Error fetching public resumes:', error);
      res.status(500).json({ error: 'Failed to fetch public resumes' });
    }
  });

  // Add route for network resumes
  app.get("/api/network/resumes", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

    try {
      // Get all connections where the user is either userId1 or userId2
      const networkUsers = await db
        .select({
          connectedUserId: users.id,
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

      // Get both public resumes and resumes from network
      const networkResumes = await db
        .select({
          ...resumes,
          owner: {
            id: users.id,
            username: users.username,
          },
        })
        .from(resumes)
        .leftJoin(users, eq(resumes.userId, users.id))
        .where(
          or(
            // Public resumes from anyone
            eq(resumes.isPublic, true),
            // Or private but visible resumes from connections
            and(
              eq(resumes.isPublic, false),
              eq(resumes.isVisible, true),
              inArray(
                resumes.userId,
                networkUsers.map((user) => user.connectedUserId)
              )
            )
          )
        )
        .orderBy(desc(resumes.createdAt));

      res.json(networkResumes);
    } catch (error) {
      console.error('Error fetching network resumes:', error);
      res.status(500).json({ error: 'Failed to fetch network resumes' });
    }
  });

  // Add new route for removing connections
  app.delete("/api/network/connections/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ error: "Unauthorized" });

    try {
      // Verify the connection exists and user is part of it
      const [connection] = await db
        .select()
        .from(networkConnections)
        .where(
          and(
            eq(networkConnections.id, parseInt(req.params.id)),
            or(
              eq(networkConnections.userId1, req.user.id),
              eq(networkConnections.userId2, req.user.id)            )
          )
        )
        .limit(1);

      if (!connection) {
        return res.status(404).json({ error: 'Connection not found' });
      }

      // Get the other user's ID
      const otherUserId = connection.userId1 === req.user.id
        ? connection.userId2
        : connection.userId1;

      // Get all resumes by both users
      const userResumes = await db
        .select()
        .from(resumes)
        .where(
          or(
            eq(resumes.userId, req.user.id),
            eq(resumes.userId, otherUserId)
          )
        );

      // Delete comments in two steps to avoid recursion issues
      // Step 1: Delete all direct comments between the two users
      await db
        .delete(comments)
        .where(
          or(
            // Comments made by otherUser on currentUser's resumes
            and(
              eq(comments.userId, otherUserId),
              inArray(comments.resumeId,
                userResumes
                  .filter(resume => resume.userId === req.user.id)
                  .map(resume => resume.id)
              )
            ),
            // Comments made by currentUser on otherUser's resumes
            and(
              eq(comments.userId, req.user.id),
              inArray(
                comments.resumeId,
                userResumes
                  .filter(resume => resume.userId === otherUserId)
                  .map(resume => resume.id)
              )
            )
          )
        );

      // Step 2: Delete orphaned replies
      await db
        .delete(comments)
        .where(
          and(
            not(eq(comments.parentId, null)),
            not(
              exists(
                db
                  .select()
                  .from(comments)
                  .where(eq(comments.id, comments.parentId))
              )
            )
          )
        );

      // Delete the connection
      await db
        .delete(networkConnections)
        .where(eq(networkConnections.id, parseInt(req.params.id)));

      res.sendStatus(200);
    } catch (error) {
      console.error('Error removing connection:', error);
      res.status(500).json({ error: 'Failed to remove connection' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}