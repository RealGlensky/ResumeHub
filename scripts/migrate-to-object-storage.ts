import fs from "fs";
import path from "path";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { resumes, users } from "../db/schema";
import { uploadBuffer } from "../server/storage";

// Tracks which local files were actually found and uploaded this run, so
// we only repoint a DB row at Object Storage once its bytes are confirmed
// to be there -- otherwise a row referencing a file this workspace never
// had on disk (e.g. uploaded through a since-recycled Autoscale deployment)
// would end up pointing at nothing instead of just staying broken as-is.
const uploadedFilenames = new Set<string>();

async function uploadDirectory(dir: string, label: string) {
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir).filter((f) => fs.statSync(path.join(dir, f)).isFile());
  for (const filename of files) {
    const buffer = fs.readFileSync(path.join(dir, filename));
    await uploadBuffer(filename, buffer);
    uploadedFilenames.add(filename);
    console.log(`Uploaded ${label}: ${filename}`);
  }
}

async function migrateResumes() {
  const allResumes = await db.select().from(resumes);
  for (const resume of allResumes) {
    if (resume.fileUrl?.startsWith('/uploads/')) {
      const filename = resume.fileUrl.replace('/uploads/', '');
      if (!uploadedFilenames.has(filename)) {
        console.log(`SKIPPED resume ${resume.id} ("${resume.title}") - ${filename} was not found on local disk, leaving fileUrl as-is`);
        continue;
      }
      const newUrl = `/api/files/${filename}`;
      await db.update(resumes).set({ fileUrl: newUrl }).where(eq(resumes.id, resume.id));
      console.log(`Updated resume ${resume.id}: ${resume.fileUrl} -> ${newUrl}`);
    }
  }
}

async function migrateProfilePictures() {
  const allUsers = await db.select().from(users);
  for (const user of allUsers) {
    if (user.profilePictureUrl?.startsWith('/uploads/profile-pictures/')) {
      const filename = user.profilePictureUrl.replace('/uploads/profile-pictures/', '');
      if (!uploadedFilenames.has(filename)) {
        console.log(`SKIPPED user ${user.id} (${user.username}) profile picture - ${filename} was not found on local disk, leaving profilePictureUrl as-is`);
        continue;
      }
      const newUrl = `/api/files/${filename}`;
      await db.update(users).set({ profilePictureUrl: newUrl }).where(eq(users.id, user.id));
      console.log(`Updated user ${user.id} profile picture: ${user.profilePictureUrl} -> ${newUrl}`);
    }
  }
}

async function main() {
  const uploadsDir = path.join(process.cwd(), "uploads");
  const profilePicsDir = path.join(uploadsDir, "profile-pictures");

  const resumeFiles = fs.existsSync(uploadsDir)
    ? fs.readdirSync(uploadsDir).filter((f) => fs.statSync(path.join(uploadsDir, f)).isFile())
    : [];
  for (const filename of resumeFiles) {
    const buffer = fs.readFileSync(path.join(uploadsDir, filename));
    await uploadBuffer(filename, buffer);
    uploadedFilenames.add(filename);
    console.log(`Uploaded resume file: ${filename}`);
  }

  await uploadDirectory(profilePicsDir, "profile picture");

  await migrateResumes();
  await migrateProfilePictures();

  console.log("Migration complete.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
