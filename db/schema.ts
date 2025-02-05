import { pgTable, text, serial, integer, boolean, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const resumes = pgTable("resumes", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  fileUrl: text("file_url").notNull(),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

export const resumeRelations = relations(resumes, ({ one, many }) => ({
  user: one(users, { fields: [resumes.userId], references: [users.id] }),
  jobOffers: many(jobOffers),
  comments: many(comments),
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

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertResumeSchema = createInsertSchema(resumes);
export const insertJobOfferSchema = createInsertSchema(jobOffers);
export const insertCommentSchema = createInsertSchema(comments);

export type InsertUser = typeof users.$inferInsert;
export type SelectUser = typeof users.$inferSelect;
export type Resume = typeof resumes.$inferSelect;
export type JobOffer = typeof jobOffers.$inferSelect;
export type Comment = typeof comments.$inferSelect;