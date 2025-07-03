import path from "path";
import { db } from "../database/db_controller.mjs";
export default async function getfileId(targetDir, filename, ownerId) {
  try {
    const fileInfo = await new Promise((resolve, reject) => {
      db.get(
        "SELECT file_id FROM files WHERE filepath = ? AND owner_id = ?",
        [path.join(targetDir, filename), ownerId],
        (dbErr, row) => {
          if (dbErr) {
            reject(dbErr);
          } else {
            resolve(row ? row.file_id : null);
          }
        }
      );
    });
    return fileInfo;
  } catch (error) {
    console.error("Error fetching file ID:", error);
    return null;
  }
}
