import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import cors from "cors";
import morgan from "morgan";
import winston from "winston";
import crypto from "crypto";
import getfileId from "./services/file_service.mjs";
import { db, userdb } from "./database/db_controller.mjs";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
// import cookieParser from "cookie-parser";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = 3001;
const JWT_SECRET = "cloud_cyclone_storage";

// Setup middleware
app.use(
  cors({
    origin: "*", // Change this to match your frontend's URL
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Use cookieParser with a secret to sign cookies
// app.use(cookieParser(JWT_SECRET));

// Rate limiting for API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message:
    "Too many requests from this IP, please try again later after 15 minutes.",
});
app.use("/api/", apiLimiter);
app.use("/gsl", apiLimiter);

// ---------------------
// Ensure Required Directories Exist
// ---------------------
const LOGS_FOLDER = path.join(__dirname, "logs");
if (!fs.existsSync(LOGS_FOLDER)) {
  fs.mkdirSync(LOGS_FOLDER);
}

const UPLOADS_FOLDER = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOADS_FOLDER)) {
  fs.mkdirSync(UPLOADS_FOLDER);
}

// ---------------------
// Configure Winston Logger
// ---------------------
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(
      ({ timestamp, level, message }) =>
        `${timestamp} [${level.toUpperCase()}]: ${message}`
    )
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: path.join(LOGS_FOLDER, "server.log"),
    }),
  ],
});

// ---------------------
// Configure Morgan for HTTP Request Logging
// ---------------------
app.use(
  morgan("combined", {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);

// ---------------------
// Sample User Insertion with hashed password (if not exists)
// ---------------------

async function addAdminIfNotExists(username, email, password) {
  try {
    const hash = await bcrypt.hash(password, 10);
    const role = "admin";

    return new Promise((resolve, reject) => {
      userdb.run(
        "INSERT INTO users (user_name, user_email, user_password, role) SELECT ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM users WHERE role = ?)",
        [username, email, hash, role, role],
        (err) => {
          if (err) {
            logger.error("Error inserting user: " + err.message);
            return reject(err);
          }
          logger.info("Admin user Created Successfully.");
          resolve(true);
        }
      );
    });
  } catch (err) {
    logger.error("Error hashing password: " + err.message);
    throw err;
  }
}

// ---------------------
// JWT Authentication Middleware (using signed cookie)
// ---------------------
function authenticateToken(req, res, next) {
  console.log(req.file);
  const accessToken = req.body.accessToken || req.accessToken;
  const device_name = req.body.device_name || req.device_name;
  console.log("access Token:", accessToken, "Device Name:", device_name);
  if (!accessToken || !device_name) {
    logger.warn("Missing JWT token or device name");
    return res
      .status(401)
      .json({ error: "Missing token or device information" });
  }

  // Assuming you are storing access tokens (not refresh tokens) with device info
  userdb.get(
    "SELECT * FROM session_token WHERE actoken = ? AND device_name = ?",
    [accessToken, device_name],
    (err, row) => {
      if (err) {
        logger.error("Error querying session token:", err);
        return res.status(500).json({ error: "Internal server error" });
      }
      if (!row) {
        logger.warn("Invalid or used access token for this device");
        return res.status(403).json({ error: "Invalid token for this device" });
      }

      jwt.verify(accessToken, JWT_SECRET, (err, user) => {
        if (err) {
          if (err.name === "TokenExpiredError") {
            return res.status(401).json({ error: "Token expired" });
          }
          logger.warn("Invalid JWT token - Verification failed:", err);
          return res.status(403).json({ error: "Invalid token" });
        }
        req.user = user;
        next();
      });
    }
  );
}

// ---------------------
// Configure Multer for User-Specific File Uploads with validation
// ---------------------
const fileFilter = (req, file, cb) => {
  // Disallow potentially dangerous file types
  const disallowedExtensions = [".exe", ".sh", ".bat", ".msi", ".dll"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (disallowedExtensions.includes(ext)) {
    return cb(new Error("Executable files are not allowed"), false);
  }
  cb(null, true);
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Use authenticated user id

    const owner_id = req.owner_id || req.body.owner_id;
    const folder = req.body.folder || "";
    if (!owner_id) {
      return cb(new Error("Missing owner_id in request"), null);
    }
    const userFolder = path.join(UPLOADS_FOLDER, String(owner_id), folder);
    if (!fs.existsSync(userFolder)) {
      fs.mkdirSync(userFolder, { recursive: true });
    }
    cb(null, userFolder);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 35 * 1024 * 1024 * 1024 }, // 35GB limit per file
  fileFilter,
});

// ---------------------
// User Registration Endpoint
// ---------------------
// app.post("/api/register", (req, res) => {
//   const { user_name, user_email, user_password } = req.body;
//   if (!user_name || !user_email || !user_password) {
//     logger.warn("Missing registration fields");
//     return res.status(400).json({ error: "Missing registration fields" });
//   }
//   bcrypt.hash(user_password, 10, (err, hash) => {
//     if (err) {
//       logger.error(
//         "Error hashing password during registration: " + err.message
//       );
//       return res.status(500).json({ error: "Server error" });
//     }
//     userdb.run(
//       "INSERT INTO users (user_name, user_email, user_password) VALUES (?, ?, ?)",
//       [user_name, user_email, hash],
//       function (err) {
//         if (err) {
//           logger.error("Error registering user: " + err.message);
//           return res.status(500).json({ error: "Database error" });
//         }
//         logger.info(`User registered: ${user_email}`);
//         res.json({ message: "Registration successful" });
//       }
//     );
//   });
// });

// ---------------------
// User Login Endpoint with JWT in Secure Cookie
// ---------------------
app.post("/api/login", async (req, res) => {
  const { user_email, user_password, device_name } = req.body;

  if (!user_email || !user_password || !device_name) {
    logger.warn("Missing required login fields");
    return res.status(400).json({ error: "Missing email or password" });
  }

  try {
    // Check if any user exists
    const userCount = await new Promise((resolve, reject) => {
      userdb.get("SELECT COUNT(*) AS count FROM users", [], (err, row) => {
        if (err) {
          logger.error("Error counting users: " + err.message);
          return reject(err);
        }
        resolve(row.count);
      });
    });

    if (userCount === 0) {
      logger.warn("No users found in the database, creating admin user.");
      await addAdminIfNotExists("admin", user_email, user_password);
    }

    // Now proceed to check user credentials
    userdb.get(
      "SELECT * FROM users WHERE user_email = ?",
      [user_email],
      (err, userRow) => {
        if (err) {
          logger.error("Error querying user: " + err.message);
          return res.status(500).json({ error: "Database error" });
        }
        if (!userRow) {
          logger.warn(`Login failed. User not found: ${user_email}`);
          return res.status(401).json({ error: "Invalid email or password" });
        }

        // Compare passwords
        bcrypt.compare(user_password, userRow.user_password, (err, result) => {
          if (err || !result) {
            logger.warn(`Login failed. Incorrect password for: ${user_email}`);
            return res.status(401).json({ error: "Invalid email or password" });
          }

          // Generate JWT tokens
          const accessToken = jwt.sign(
            { user_id: userRow.user_id },
            JWT_SECRET,
            { expiresIn: "15m" }
          );

          const refreshToken = jwt.sign(
            { user_id: userRow.user_id },
            JWT_SECRET,
            { expiresIn: "7d" } // 7 days expiry
          );

          // Store new refresh token in the database
          userdb.run(
            "INSERT INTO session_token (user_id, retoken, actoken, device_name,  token_timeout) VALUES (?, ?, ?, ?, ?)",
            [
              userRow.user_id,
              refreshToken,
              accessToken,
              device_name,
              new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            ]
          );
          logger.info(`User logged in successfully: ${user_email}`);
          // A new security system

          // res.json({
          //   message: "Login successful",
          //   data: jwt.sign(
          //     {
          //       refreshToken: refreshToken,
          //       accessToken: accessToken,
          //       key: key, //Key assigned to each user after each successful login attempt and used in further decyphering data locally
          //       user: {
          //         user_id: userRow.user_id,
          //         user_name: userRow.user_name,
          //         user_email: userRow.user_email,
          //       },
          //     },
          //     global_key // A secrete key built into the app for just decyphering the login data which changes after each app update
          //   ),
          // });

          res.json({
            message: "Login successful",
            refreshToken: refreshToken,
            accessToken: accessToken,
            user: {
              user_id: userRow.user_id,
              user_name: userRow.user_name,
              user_email: userRow.user_email,
            },
          });
        });
      }
    );
  } catch (error) {
    logger.error("Unexpected error in login: " + error.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------
// Refresh the access token Endpoint (creates a new access token with the help of refresh token)
// ---------------------
app.post("/api/refresh", (req, res) => {
  const { refreshToken, device_name } = req.body;
  if (!refreshToken || !device_name) {
    return res.status(401).json({ error: "Missing Field" });
  }

  userdb.get(
    "SELECT * FROM session_token WHERE token = ? AND device_name=?",
    [refreshToken, device_name],
    (err, row) => {
      if (err) {
        logger.error("Error querying session token:", err);
        return res.status(500).json({ error: "Internal server error" });
      }
      if (!row || row.used_stat === 1) {
        logger.warn("Invalid or used refresh token");
        return res.status(403).json({ error: "Invalid token" });
      }

      jwt.verify(refreshToken, JWT_SECRET, (err, user) => {
        if (err) {
          if (err.name === "TokenExpiredError") {
            return res.status(401).json({ error: "Token expired" });
          }
          logger.warn("Invalid JWT token");
          return res.status(403).json({ error: "Invalid token" });
        }

        // Generate a new Access Token
        const newAccessToken = jwt.sign({ user_id: user.user_id }, JWT_SECRET, {
          expiresIn: "15m",
        });

        // Generate a new Refresh Token
        const newRefreshToken = jwt.sign(
          { user_id: user.user_id },
          JWT_SECRET,
          { expiresIn: "7d" }
        );

        // Remove the old refresh token
        userdb.run(
          "DELETE FROM session_token WHERE token = ?",
          [refreshToken],
          (deleteErr) => {
            if (deleteErr) {
              logger.error("Error deleting old refresh token:", deleteErr);
              return res.status(500).json({ error: "Internal server error" });
            }

            // Store new refresh token in the database
            userdb.run(
              "INSERT INTO session_token (user_id, retoken, actoken, device_name, token_timeout) VALUES (?, ?, ?, ?, ?)",
              [
                user.user_id,
                newRefreshToken,
                newAccessToken,
                device_name,
                new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              ],
              (insertErr) => {
                if (insertErr) {
                  logger.error("Error storing new refresh token:", insertErr);
                  return res
                    .status(500)
                    .json({ error: "Internal server error" });
                }
                //TODO: Improved security system

                // res.json({
                //   message: "New Auth created",
                //   data: jwt.sign(
                //     {
                //       accessToken: newAccessToken,
                //       refreshToken: newRefreshToken,
                //     },
                //     key // Key assigned to each user during login procedure after the login is success
                //   ),
                // });

                res.json({
                  message: "Token refreshed successfully",
                  accessToken: newAccessToken,
                  refreshToken: newRefreshToken,
                });
              }
            );
          }
        );
      });
    }
  );
});

// ---------------------
// Logout Endpoint (clears the auth cookie)
// ---------------------
app.post("/api/logout", (req, res) => {
  res.clearCookie("token");
  res.clearCookie("refreshToken");
  res.json({ message: "Logout successful" });
});

// ---------------------
// List Files for a User
// ---------------------
var BASE_DIR = path.join(__dirname, "uploads");
app.post("/api/files", authenticateToken, async (req, res) => {
  // Use folder from query, default to an empty string
  const folderName = req.body.folder || "";
  const targetDir = path.join(BASE_DIR, String(req.user.user_id), folderName);
  const ownerId = req.user.user_id; // Assuming user info is attached to req by authenticateToken

  // Security: ensure targetDir is within BASE_DIR
  if (!targetDir.startsWith(BASE_DIR)) {
    return res.status(400).json({ error: "Invalid folder path" });
  }

  try {
    const items = await fs.promises.readdir(targetDir, { withFileTypes: true });

    if (items.length === 0) {
      return res.json({ path: folderName, items: [], isEmpty: true });
    }

    const result = await Promise.all(
      items.map(async (item) => {
        const name = item.name;
        const type = item.isDirectory() ? "folder" : "file";
        let fileid = null;

        if (type === "file") {
          fileid = await getfileId(folderName, name, ownerId);
        }

        return {
          name: name,
          type: type,
          file_id: fileid,
        };
      })
    );

    res.json({ path: folderName, items: result, isEmpty: false });
  } catch (err) {
    logger.error("Error listing directory:", err);
    return res.status(500).json({
      error: "Could not list directory contents",
      details: err.message,
    });
  }
});

// ---------------------
// Upload Files Endpoint
// ---------------------
// ---------------------
// Upload Endpoint (Updated to store file path)
// ---------------------
app.post(
  "/api/upload",
  upload.array("files", 50),
  authenticateToken,
  (req, res) => {
    const owner_id = req.user.user_id;

    // Retrieve folder from the request body; if not provided, default to a folder named "default" (or you could use owner_id)
    const folder = req.body.folder || "";
    console.log(folder);
    if (!req.files || req.files.length === 0) {
      logger.warn("No files uploaded");
      return res.status(400).json({ error: "No files uploaded" });
    }

    db.serialize(() => {
      db.run("BEGIN TRANSACTION");
      // Include the folder column in the INSERT statement.
      const stmt = db.prepare(
        "INSERT INTO files (filename, originalname, owner_id, filepath, folder) VALUES (?, ?, ?, ?, ?)"
      );

      req.files.forEach((file) => {
        // Compute the file path using the folder (e.g., "folder/filename")
        const filePath = `${folder}/${file.filename}`;
        stmt.run(
          file.filename,
          file.originalname,
          owner_id,
          filePath,
          folder,
          (err) => {
            if (err) {
              logger.error("Error inserting file data: " + err.message);
            }
          }
        );
      });

      stmt.finalize();
      db.run("COMMIT", (err) => {
        if (err) {
          logger.error("Error committing transaction: " + err.message);
          return res.status(500).json({ error: "Database error" });
        }
        logger.info(
          `${req.files.length} file(s) uploaded successfully for owner_id ${owner_id} in folder ${folder}`
        );
        res.json({
          message: "Files uploaded successfully",
          files: req.files,
          folder: folder,
        });
      });
    });
  }
);

// ---------------------
// Download a File Endpoint
// ---------------------
app.get("/api/files/:filename/download", (req, res) => {
  const { filename } = req.params;
  // Look up file metadata in the DB to determine the owner folder.
  db.get(
    "SELECT * FROM files WHERE filename = ?",
    [filename],
    (err, fileRow) => {
      if (err) {
        logger.error("Database error: " + err.message);
        return res.status(500).json({ error: "Database error" });
      }
      if (!fileRow) {
        logger.warn("File not found in DB: " + filename);
        return res.status(404).json({ error: "File not found" });
      }
      const filePath = path.join(
        UPLOADS_FOLDER,
        String(fileRow.owner_id),
        fileRow.filename
      );
      res.download(
        filePath,
        fileRow.originalname || fileRow.filename,
        (err) => {
          if (err) {
            logger.error(`Error downloading file: ${filename}`);
            res.status(500).json({ error: "Error in downloading the file." });
          } else {
            logger.info(`File downloaded: ${filename}`);
          }
        }
      );
    }
  );
});

// ---------------------
// Rename a File Endpoint
// ---------------------
app.put("/api/files/:filename/rename", authenticateToken, (req, res) => {
  const { filename } = req.params;
  let { newName } = req.body;
  const owner_id = req.user.user_id;

  if (!newName) {
    logger.warn("New name not provided for file rename");
    return res.status(400).json({ error: "New name not provided" });
  }
  // Sanitize newName to prevent directory traversal
  newName = path.basename(newName);

  const oldPath = path.join(UPLOADS_FOLDER, String(owner_id), filename);
  const newPath = path.join(UPLOADS_FOLDER, String(owner_id), newName);
  fs.rename(oldPath, newPath, (err) => {
    if (err) {
      logger.error(`Could not rename file on filesystem: ${filename}`);
      return res
        .status(500)
        .json({ error: "Could not rename file on filesystem" });
    }
    db.run(
      "UPDATE files SET filename = ? WHERE filename = ? AND owner_id = ?",
      [newName, filename, owner_id],
      function (err) {
        if (err) {
          logger.error(`Database error renaming file record: ${err.message}`);
          return res
            .status(500)
            .json({ error: "Database error renaming file record" });
        }
        logger.info(
          `File renamed from ${filename} to ${newName} for owner ${owner_id}`
        );
        res.json({
          message: "File renamed successfully",
          oldName: filename,
          newName,
        });
      }
    );
  });
});

// ---------------------
// Create a new folder Endpoint
// ---------------------
app.post("/api/create-folder", authenticateToken, (req, res) => {
  const ownerId = req.user.user_id;
  const { currentFolder, newFolder } = req.body;

  // Validate input: newFolder must be provided.
  if (!newFolder || typeof newFolder !== "string") {
    return res
      .status(400)
      .json({ error: "New folder name is required and must be a string." });
  }

  // Define the base folder for this user (e.g., uploads folder for the user)
  const userBaseFolder = path.join(UPLOADS_FOLDER, String(ownerId));
  const folderPath = path.join(currentFolder, newFolder);
  // Build the target folder path:
  // If a currentFolder is provided, create new folder inside it; otherwise, use the base folder.
  const targetFolder =
    currentFolder &&
    typeof currentFolder === "string" &&
    currentFolder.trim() !== ""
      ? path.join(userBaseFolder, currentFolder, newFolder)
      : path.join(userBaseFolder, newFolder);

  // Create the new folder (recursive in case intermediate directories don't exist)
  fs.mkdir(targetFolder, { recursive: true }, (err) => {
    if (err) {
      logger.error(`Error creating folder at ${targetFolder}: ${err.message}`);
      return res.status(500).json({ error: "Error creating folder" });
    }
    logger.info(
      `Folder created successfully at ${targetFolder} for owner_id ${ownerId}`
    );
    res.json({
      message: "Folder created successfully",
      folderPath: folderPath,
    });
  });
});

// ---------------------
// Delete a File Endpoint
// ---------------------
app.delete("/api/files/:fileId", authenticateToken, (req, res) => {
  const fileId = req.params.fileId;
  const owner_id = req.user.user_id;
  logger.warn(owner_id);
  logger.warn(fileId);

  db.get(
    "SELECT * FROM files WHERE file_id = ? AND owner_id = ?",
    [fileId, owner_id],
    (err, row) => {
      if (err) {
        logger.error("Database error: " + err.message);
        return res.status(500).json({ error: "Database error" });
      }
      if (!row) {
        logger.warn("File metadata not found for fileId: " + fileId);
        return res.status(404).json({ error: "File not found" });
      }
      const filename = row.filename;
      const filePath = path.join(UPLOADS_FOLDER, String(owner_id), filename);

      fs.unlink(filePath, (err) => {
        if (err) {
          if (err.code === "ENOENT") {
            logger.warn(
              `File not found on disk: ${filename}, proceeding with DB deletion.`
            );
          } else {
            logger.error(`Could not delete file: ${filename} - ${err.message}`);
            return res.status(500).json({ error: "Could not delete file" });
          }
        }
        db.serialize(() => {
          db.run("BEGIN TRANSACTION");
          db.run(
            "DELETE FROM files WHERE file_id = ? AND owner_id = ?",
            [fileId, owner_id],
            function (err) {
              if (err) {
                logger.error(
                  `Error deleting file metadata for fileId: ${fileId} - ${err.message}`
                );
                db.run("ROLLBACK");
                return res
                  .status(500)
                  .json({ error: "Error deleting file metadata" });
              }
              db.run(
                "DELETE FROM shares WHERE file_id = ? AND owner_id = ?",
                [fileId, owner_id],
                function (err) {
                  if (err) {
                    logger.error(
                      `Error deleting share tokens for fileId: ${fileId} - ${err.message}`
                    );
                    db.run("ROLLBACK");
                    return res
                      .status(500)
                      .json({ error: "Error deleting share tokens" });
                  }
                  db.run("COMMIT", (err) => {
                    if (err) {
                      logger.error(
                        "Error committing transaction: " + err.message
                      );
                      return res
                        .status(500)
                        .json({ error: "Database commit error" });
                    }
                    logger.info(
                      `File deleted and metadata removed for fileId: ${fileId}`
                    );
                    res.json({ message: "File deleted successfully" });
                  });
                }
              );
            }
          );
        });
      });
    }
  );
});

// ---------------------
// List Image Files for a User Endpoint
// ---------------------
app.post("/api/images", authenticateToken, (req, res) => {
  const owner_id = req.user.user_id;
  db.all(
    `SELECT file_id, filename, owner_id FROM files 
     WHERE (filename LIKE '%.jpg' OR filename LIKE '%.jpeg' OR filename LIKE '%.png' OR filename LIKE '%.gif') 
       AND owner_id=?`,
    [owner_id],
    (err, rows) => {
      if (err) {
        logger.error("Database error: " + err.message);
        return res.status(500).json({ error: "Database error" });
      }
      if (rows.length === 0) {
        logger.warn("No images found in the database.");
        return res.json({ message: "No images found" });
      }
      const imageData = rows.map((row) => {
        const filePath = path.join(
          UPLOADS_FOLDER,
          String(owner_id),
          row.filename
        );
        const stats = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
        return {
          file_id: row.file_id,
          filename: row.filename,
          created: stats ? stats.birthtime : null,
        };
      });
      res.json(imageData);
    }
  );
});

// ---------------------
// Generate Shareable Link Endpoint
// ---------------------
app.post("/gsl", authenticateToken, (req, res) => {
  const { fileId } = req.body;
  const owner_id = req.user.user_id;
  if (!fileId) {
    logger.warn("Missing fileId for share link generation");
    return res.status(400).json({ error: "Missing fileId" });
  }
  db.get(
    "SELECT * FROM files WHERE file_id = ? AND owner_id = ?",
    [fileId, owner_id],
    (err, fileRow) => {
      if (err) {
        logger.error("Error querying file: " + err.message);
        return res.status(500).json({ error: "Database error" });
      }
      if (!fileRow) {
        logger.warn("File not found in database: " + fileId);
        return res.status(404).json({ error: "File not found" });
      }
      const token = crypto.randomBytes(16).toString("hex");
      db.run(
        "INSERT INTO shares (file_id, token, owner_id) VALUES (?, ?, ?)",
        [fileId, token, owner_id],
        function (err) {
          if (err) {
            logger.error("Error inserting share token: " + err.message);
            return res.status(500).json({ error: "Database error" });
          }
          const shareableLink = `${req.protocol}://${req.get(
            "host"
          )}/shared/${token}`;
          logger.info(`Share link generated for file id ${fileId}`);
          res.json({ shareableLink });
        }
      );
    }
  );
});

// ---------------------
// Resolve Share Token Endpoint
// ---------------------
app.get("/share/:token", (req, res) => {
  const token = req.params.token;
  db.get("SELECT * FROM shares WHERE token = ?", [token], (err, shareRow) => {
    if (err) {
      logger.error("Error querying share token: " + err.message);
      return res.status(500).send("Internal Server Error");
    }
    if (!shareRow) {
      logger.warn("Share link not found: " + token);
      return res.status(404).send("Shared link not found or expired.");
    }
    db.get(
      "SELECT * FROM files WHERE file_id = ?",
      [shareRow.file_id],
      (err, fileRow) => {
        if (err) {
          logger.error("Error querying file: " + err.message);
          return res.status(500).send("Internal Server Error");
        }
        if (!fileRow) {
          logger.warn("File not found for share link: " + token);
          return res.status(404).send("File not found.");
        }
        res.json({
          message: "Shared file accessed successfully.",
          file: {
            file_id: fileRow.file_id,
            filename: fileRow.filename,
            originalname: fileRow.originalname,
            uploadedAt: fileRow.created_at,
          },
          sharedAt: shareRow.created_at,
        });
      }
    );
  });
});
app.get("/hp", (req, res) => {
  return res.status(200).send("All GOOD");
});

// ---------------------
// Serve Static Files for React App & Uploads
// ---------------------
app.use("/uploads", express.static(UPLOADS_FOLDER));
app.use("/file", express.static(UPLOADS_FOLDER));

// ---------------------
// Global Error Handling Middleware
// ---------------------
app.use((err, req, res, next) => {
  logger.error("Unhandled error: " + err.message);
  res.status(500).json({ error: err.message });
});

// ---------------------
// Start the Server
// ---------------------
app.listen(port, () => {
  logger.info(`Server is running on port ${port}`);
});
