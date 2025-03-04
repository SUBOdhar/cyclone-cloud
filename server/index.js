// server.js (Improved Version with Cookie-based Authentication)
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const morgan = require("morgan");
const winston = require("winston");
const sqlite3 = require("sqlite3").verbose();
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const cookieParser = require("cookie-parser");

const app = express();
const port = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "cloud_cyclone_storage";

// Setup middleware
app.use(
  cors({
    origin: "http://localhost:5173", // Change this to match your frontend's URL
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Use cookieParser with a secret to sign cookies
app.use(cookieParser(JWT_SECRET));

// Rate limiting for API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: "Too many requests from this IP, please try again later.",
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
// Initialize SQLite Databases
// ---------------------
const db = new sqlite3.Database("filedb.sqlite", (err) => {
  if (err) {
    logger.error("Could not connect to SQLite files database: " + err.message);
  } else {
    logger.info("Connected to SQLite files database");
  }
});
const userdb = new sqlite3.Database("users.sqlite", (err) => {
  if (err) {
    logger.error("Could not connect to SQLite users database: " + err.message);
  } else {
    logger.info("Connected to SQLite users database");
  }
});

// ---------------------
// Create Tables
// ---------------------
// Users table (using userdb)
userdb.serialize(() => {
  userdb.run(
    `CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_name TEXT NOT NULL,
      user_email TEXT NOT NULL UNIQUE,
      user_password TEXT NOT NULL
    )`
  );
});

// Files and shares tables (using db)
db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS files (
      file_id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      originalname TEXT,
      owner_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
  );

  db.run(
    `CREATE TABLE IF NOT EXISTS shares (
      share_id INTEGER PRIMARY KEY AUTOINCREMENT,
      file_id INTEGER,
      token TEXT NOT NULL,
      owner_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(file_id) REFERENCES files(file_id)
    )`
  );

  db.run("CREATE INDEX IF NOT EXISTS idx_files_filename ON files(filename)");
  db.run("CREATE INDEX IF NOT EXISTS idx_shares_token ON shares(token)");
  db.run("CREATE INDEX IF NOT EXISTS idx_shares_file_id ON shares(file_id)");
});

// ---------------------
// Sample User Insertion with hashed password (if not exists)
// ---------------------
bcrypt.hash("cyclone", 10, (err, hash) => {
  if (err) {
    logger.error("Error hashing sample password: " + err.message);
  } else {
    userdb.run(
      "INSERT OR IGNORE INTO users (user_name, user_email, user_password) VALUES (?, ?, ?)",
      ["subodh", "subodh@cyclonecloud.com", hash],
      (err) => {
        if (err) {
          logger.error("Error inserting sample user: " + err.message);
        } else {
          logger.info("Sample user inserted (or already exists).");
        }
      }
    );
  }
});

// ---------------------
// JWT Authentication Middleware (using signed cookie)
// ---------------------
function authenticateToken(req, res, next) {
  const token = req.signedCookies.token;
  if (!token) {
    logger.warn("Missing JWT token in signed cookies");
    return res.status(401).json({ error: "Missing token" });
  }
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      logger.warn("Invalid JWT token");
      return res.status(403).json({ error: "Invalid token" });
    }
    req.user = user;
    next();
  });
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
    const owner_id = req.user && req.user.user_id;
    if (!owner_id) {
      return cb(new Error("Missing owner_id in request"), null);
    }
    const userFolder = path.join(UPLOADS_FOLDER, String(owner_id));
    if (!fs.existsSync(userFolder)) {
      fs.mkdirSync(userFolder, { recursive: true });
    }
    cb(null, userFolder);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit per file
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
app.post("/api/login", (req, res) => {
  const { user_email, user_password } = req.body;
  if (!user_email || !user_password) {
    logger.warn("Missing required login fields");
    return res.status(400).json({ error: "Missing email or password" });
  }
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
      bcrypt.compare(user_password, userRow.user_password, (err, result) => {
        if (err || !result) {
          logger.warn(`Login failed. Incorrect password for: ${user_email}`);
          return res.status(401).json({ error: "Invalid email or password" });
        }
        // Generate JWT token and set it in a signed, HTTP-only cookie
        const token = jwt.sign(
          {
            user_id: userRow.user_id,
            user_email: userRow.user_email,
            user_name: userRow.user_name,
          },
          JWT_SECRET,
          { expiresIn: "1h" }
        );
        res.cookie("token", token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production", // set to true in production
          sameSite: "strict",
          signed: true,
        });
        logger.info(`User logged in successfully: ${user_email}`);
        res.json({
          message: "Login successful",
          user: {
            user_id: userRow.user_id,
            user_name: userRow.user_name,
            user_email: userRow.user_email,
          },
        });
      });
    }
  );
});

// ---------------------
// Logout Endpoint (clears the auth cookie)
// ---------------------
app.post("/api/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logout successful" });
});

// ---------------------
// Serve Static React Build (if applicable)
// ---------------------
app.use("/", express.static("dist"));

// ---------------------
// List Files for a User
// ---------------------
app.post("/api/files", authenticateToken, (req, res) => {
  const owner_id = req.user.user_id;
  db.all(
    "SELECT file_id, filename, originalname, created_at FROM files WHERE owner_id=?",
    [owner_id],
    (err, rows) => {
      if (err) {
        logger.error("Error retrieving files: " + err.message);
        return res.status(500).json({ error: "Database error" });
      }
      res.json(rows);
    }
  );
});

// ---------------------
// Upload Files Endpoint
// ---------------------
app.post(
  "/api/upload",
  authenticateToken,
  upload.array("files", 50),
  (req, res) => {
    const owner_id = req.user.user_id;
    if (!req.files || req.files.length === 0) {
      logger.warn("No files uploaded");
      return res.status(400).json({ error: "No files uploaded" });
    }
    db.serialize(() => {
      db.run("BEGIN TRANSACTION");
      const stmt = db.prepare(
        "INSERT INTO files (filename, originalname, owner_id) VALUES (?, ?, ?)"
      );
      req.files.forEach((file) => {
        stmt.run(file.filename, file.originalname, owner_id, (err) => {
          if (err) {
            logger.error("Error inserting file data: " + err.message);
          }
        });
      });
      stmt.finalize();
      db.run("COMMIT", (err) => {
        if (err) {
          logger.error("Error committing transaction: " + err.message);
          return res.status(500).json({ error: "Database error" });
        }
        logger.info(
          `${req.files.length} file(s) uploaded successfully for owner_id ${owner_id}`
        );
        res.json({ message: "Files uploaded successfully", files: req.files });
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

// ---------------------
// Serve Static Files for React App & Uploads
// ---------------------
app.use("/uploads", express.static(UPLOADS_FOLDER));
app.use("/images", express.static(UPLOADS_FOLDER));

// Fallback route for React
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

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
