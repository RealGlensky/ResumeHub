import { eq } from "drizzle-orm";
import { db } from "../db";
import { resumes, users } from "../db/schema";
import { objectExists } from "../server/storage";

function keyFromApiFilesUrl(url: string): string | null {
  return url.startsWith('/api/files/') ? url.replace('/api/files/', '') : null;
}

async function main() {
  let missing = 0;

  const resumesWithOwner = await db
    .select({
      id: resumes.id,
      title: resumes.title,
      fileUrl: resumes.fileUrl,
      ownerUsername: users.username,
      ownerEmail: users.email,
    })
    .from(resumes)
    .leftJoin(users, eq(resumes.userId, users.id));

  for (const resume of resumesWithOwner) {
    const key = resume.fileUrl && keyFromApiFilesUrl(resume.fileUrl);
    if (!key) continue;
    if (!(await objectExists(key))) {
      missing++;
      console.log(
        `MISSING FILE - resume ${resume.id} ("${resume.title}"), owner ${resume.ownerUsername} <${resume.ownerEmail}>: ${resume.fileUrl}`
      );
    }
  }

  const allUsers = await db.select().from(users);
  for (const user of allUsers) {
    const key = user.profilePictureUrl && keyFromApiFilesUrl(user.profilePictureUrl);
    if (!key) continue;
    if (!(await objectExists(key))) {
      missing++;
      console.log(
        `MISSING FILE - user ${user.username} <${user.email}> profile picture: ${user.profilePictureUrl}`
      );
    }
  }

  console.log(missing === 0 ? "All good - every referenced file exists in Object Storage." : `Found ${missing} missing file(s). Affected users need to re-upload.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Health check failed:", error);
    process.exit(1);
  });
