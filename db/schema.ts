import { pgTable, text, serial, integer, boolean, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").unique().notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  linkedinUrl: text("linkedin_url"),
  jobTitle: text("job_title"),
  profileDescription: text("profile_description"),
  city: text("city"),
  state: text("state"),
  country: text("country"),
  profilePictureUrl: text("profile_picture_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const resumes = pgTable("resumes", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  fileUrl: text("file_url").notNull(),
  isPublic: boolean("is_public").default(false),
  mode: text("mode").notNull().default('share'), // 'share' or 'collaborate'
  accessType: text("access_type").notNull().default('connections'), // 'connections' or 'everyone'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const networkInvitations = pgTable("network_invitations", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").notNull().references(() => users.id),
  receiverId: integer("receiver_id").notNull().references(() => users.id),
  status: text("status").notNull().default('pending'), // pending, accepted, rejected
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const networkConnections = pgTable("network_connections", {
  id: serial("id").primaryKey(),
  userId1: integer("user_id_1").notNull().references(() => users.id),
  userId2: integer("user_id_2").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const jobOffers = pgTable("job_offers", {
  id: serial("id").primaryKey(),
  resumeId: uuid("resume_id").notNull().references(() => resumes.id),
  company: text("company").notNull(),
  position: text("position").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  resumeId: uuid("resume_id").notNull().references(() => resumes.id),
  userId: integer("user_id").notNull().references(() => users.id),
  parentId: integer("parent_id").references(() => comments.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Update user relations to include network connections
export const userRelations = relations(users, ({ many }) => ({
  resumes: many(resumes),
  sentInvitations: many(networkInvitations, { relationName: "sender_invitations", references: [users.id], foreignKey: networkInvitations.senderId }),
  receivedInvitations: many(networkInvitations, { relationName: "receiver_invitations", references: [users.id], foreignKey: networkInvitations.receiverId }),
  connections1: many(networkConnections, { relationName: "user_connections_1", references: [users.id], foreignKey: networkConnections.userId1 }),
  connections2: many(networkConnections, { relationName: "user_connections_2", references: [users.id], foreignKey: networkConnections.userId2 }),
}));

export const resumeRelations = relations(resumes, ({ one, many }) => ({
  user: one(users, { fields: [resumes.userId], references: [users.id] }),
  jobOffers: many(jobOffers),
  comments: many(comments),
}));

export const networkInvitationRelations = relations(networkInvitations, ({ one }) => ({
  sender: one(users, { fields: [networkInvitations.senderId], references: [users.id] }),
  receiver: one(users, { fields: [networkInvitations.receiverId], references: [users.id] }),
}));

export const networkConnectionRelations = relations(networkConnections, ({ one }) => ({
  user1: one(users, { fields: [networkConnections.userId1], references: [users.id] }),
  user2: one(users, { fields: [networkConnections.userId2], references: [users.id] }),
}));

export const jobOfferRelations = relations(jobOffers, ({ one }) => ({
  resume: one(resumes, { fields: [jobOffers.resumeId], references: [resumes.id] }),
}));

export const commentRelations = relations(comments, ({ one, many }) => ({
  user: one(users, { fields: [comments.userId], references: [users.id] }),
  resume: one(resumes, { fields: [comments.resumeId], references: [resumes.id] }),
  parent: one(comments, {
    fields: [comments.parentId],
    references: [comments.id],
  }),
  replies: many(comments, {
    relationName: "comment_replies",
  }),
}));

// Custom password validation
const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

// Update the user schema with new fields and password validation
export const insertUserSchema = createInsertSchema(users, {
  password: passwordSchema,
  email: z.string().email("Invalid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

export const selectUserSchema = createSelectSchema(users);

export const insertResumeSchema = createInsertSchema(resumes);
export const insertJobOfferSchema = createInsertSchema(jobOffers);
export const insertCommentSchema = createInsertSchema(comments);
export const insertNetworkInvitationSchema = createInsertSchema(networkInvitations);
export const insertNetworkConnectionSchema = createInsertSchema(networkConnections);
export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens);

// Type definitions
export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;
export type Resume = typeof resumes.$inferSelect;
export type JobOffer = typeof jobOffers.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type NetworkInvitation = typeof networkInvitations.$inferSelect;
export type NetworkConnection = typeof networkConnections.$inferSelect;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;