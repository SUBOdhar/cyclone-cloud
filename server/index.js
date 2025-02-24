// server.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const morgan = require("morgan");
const winston = require("winston");
const sqlite3 = require("sqlite3").verbose();
const crypto = require("crypto");

const app = express();
const port = process.env.PORT || 3001;
app.use(cors());

// ---------------------
// Configure Winston Logger
// ---------------------
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(), // Logs to console
    new winston.transports.File({ filename: "logs/server.log" }), // Logs to a file
  ],
});

// ---------------------
// Create logs directory if it doesn't exist
// ---------------------
const LOGS_FOLDER = path.join(__dirname, "logs");
if (!fs.existsSync(LOGS_FOLDER)) {
  fs.mkdirSync(LOGS_FOLDER);
}

// ---------------------
// Middleware Setup
// ---------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
// Set Up Folders for File Storage
// ---------------------
const UPLOADS_FOLDER = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOADS_FOLDER)) {
  fs.mkdirSync(UPLOADS_FOLDER);
}

// ---------------------
// Configure Multer for File Uploads
// ---------------------
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_FOLDER);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});
const upload = multer({ storage });

// ---------------------
// Initialize SQLite Database
// ---------------------
const db = new sqlite3.Database("filedb.sqlite", (err) => {
  if (err) {
    logger.error("Could not connect to SQLite database: " + err.message);
  } else {
    logger.info("Connected to SQLite database");
  }
});

// Create tables and indexes if they don't exist
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    originalname TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS shares (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_id INTEGER,
    token TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(file_id) REFERENCES files(id)
  )`);

  // Create indexes for optimized queries
  db.run("CREATE INDEX IF NOT EXISTS idx_files_filename ON files(filename)");
  db.run("CREATE INDEX IF NOT EXISTS idx_shares_token ON shares(token)");
  db.run("CREATE INDEX IF NOT EXISTS idx_shares_file_id ON shares(file_id)");
});

// ---------------------
// API Endpoints
// ---------------------

// Serve the static React build file for the final build
app.use("/", express.static("dist"));

// GET /api/files - List all uploaded files (from uploads folder)
app.get("/api/files", (req, res) => {
  db.all("SELECT id, filename, created_at FROM files", [], (err, rows) => {
    if (err) {
      logger.error("Error retrieving files: " + err.message);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(rows);
  });
});

// POST /api/upload - Upload files and store metadata in SQLite
app.post("/api/upload", upload.array("files", 50), (req, res) => {
  if (!req.files || req.files.length === 0) {
    logger.warn("No files uploaded");
    return res.status(400).json({ error: "No files uploaded" });
  }

  // Wrap multiple insertions in a transaction for performance.
  db.serialize(() => {
    db.run("BEGIN TRANSACTION");
    const stmt = db.prepare(
      "INSERT INTO files (filename, originalname) VALUES (?, ?)"
    );
    req.files.forEach((file) => {
      stmt.run(file.filename, file.originalname, (err) => {
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
      logger.info(`${req.files.length} file(s) uploaded successfully`);
      res.json({ message: "Files uploaded successfully", files: req.files });
    });
  });
});

// GET /api/files/:filename/download - Download a file
app.get("/api/files/:filename/download", (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(UPLOADS_FOLDER, filename);
  res.download(filePath, filename, (err) => {
    if (err) {
      logger.error(`Error downloading file: ${filename}`);
      res.status(500).json({ error: "Error in downloading the file." });
    } else {
      logger.info(`File downloaded: ${filename}`);
    }
  });
});

// PUT /api/files/:filename/rename - Rename a file (filesystem and database)
app.put("/api/files/:filename/rename", (req, res) => {
  const { filename } = req.params;
  const { newName } = req.body;
  if (!newName) {
    logger.warn("New name not provided for file rename");
    return res.status(400).json({ error: "New name not provided" });
  }
  const oldPath = path.join(UPLOADS_FOLDER, filename);
  const newPath = path.join(UPLOADS_FOLDER, newName);
  fs.rename(oldPath, newPath, (err) => {
    if (err) {
      logger.error(`Could not rename file on filesystem: ${filename}`);
      return res
        .status(500)
        .json({ error: "Could not rename file on filesystem" });
    }
    // Now update the file name in the database.
    db.run(
      "UPDATE files SET filename = ? WHERE filename = ?",
      [newName, filename],
      function (err) {
        if (err) {
          logger.error(`Database error renaming file record: ${err.message}`);
          return res
            .status(500)
            .json({ error: "Database error renaming file record" });
        }
        logger.info(
          `File renamed from ${filename} to ${newName} on filesystem and database`
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

app.delete("/api/files/:fileId", (req, res) => {
  const fileId = req.params.fileId;

  // Retrieve the file record from the database using the file ID.
  db.get("SELECT * FROM files WHERE id = ?", [fileId], (err, row) => {
    if (err) {
      logger.error("Database error: " + err.message);
      return res.status(500).json({ error: "Database error" });
    }
    if (!row) {
      logger.warn("File metadata not found for fileId: " + fileId);
      return res.status(404).json({ error: "File not found" });
    }

    const filename = row.filename;
    const filePath = path.join(UPLOADS_FOLDER, filename);

    // Attempt to delete the file from the filesystem.
    fs.unlink(filePath, (err) => {
      if (err) {
        if (err.code === "ENOENT") {
          // File does not exist on disk; log a warning and continue with database deletion.
          logger.warn(
            `File not found on disk: ${filename}, proceeding with DB deletion.`
          );
        } else {
          logger.error(`Could not delete file: ${filename} - ${err.message}`);
          return res.status(500).json({ error: "Could not delete file" });
        }
      }

      // Begin a database transaction to remove the file's metadata and any associated share tokens.
      db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        db.run("DELETE FROM files WHERE id = ?", [fileId], function (err) {
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
            "DELETE FROM shares WHERE file_id = ?",
            [fileId],
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
                  logger.error("Error committing transaction: " + err.message);
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
        });
      });
    });
  });
});

// GET /api/images - List all images (filtering by extension)
app.get("/api/images", (req, res) => {
  db.all(
    "SELECT id, filename FROM files WHERE filename LIKE '%.jpg' OR filename LIKE '%.jpeg' OR filename LIKE '%.png' OR filename LIKE '%.gif'",
    [],
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
        const filePath = path.join(UPLOADS_FOLDER, row.filename);
        const stats = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
        return {
          id: row.id,
          filename: row.filename,
          created: stats ? stats.birthtime : null,
        };
      });

      res.json(imageData);
    }
  );
});

// ---------------------
// Shareable Link Endpoints (Using SQLite)
// ---------------------

/**
 * POST /gsl
 * Expects JSON: { fileId: number }
 * Returns: { shareableLink: "http://host/shared/{token}" }
 */
app.post("/gsl", (req, res) => {
  const { fileId } = req.body;
  if (!fileId) {
    logger.warn("Missing fileId for share link generation");
    return res.status(400).json({ error: "Missing fileId" });
  }

  // First verify that the file exists in the database.
  db.get("SELECT * FROM files WHERE id = ?", [fileId], (err, fileRow) => {
    if (err) {
      logger.error("Error querying file: " + err.message);
      return res.status(500).json({ error: "Database error" });
    }
    if (!fileRow) {
      logger.warn("File not found in database: " + fileId);
      return res.status(404).json({ error: "File not found" });
    }

    // Generate a secure random token (32 hex characters)
    const token = crypto.randomBytes(16).toString("hex");

    // Insert the share token into the database
    db.run(
      "INSERT INTO shares (file_id, token) VALUES (?, ?)",
      [fileId, token],
      function (err) {
        if (err) {
          logger.error("Error inserting share token: " + err.message);
          return res.status(500).json({ error: "Database error" });
        }
        // Construct the shareable link
        const shareableLink = `${req.protocol}://${req.get(
          "host"
        )}/shared/${token}`;
        logger.info(`Share link generated for file id ${fileId}`);
        res.json({ shareableLink });
      }
    );
  });
});

/**
 * GET /share/:token
 * Resolves the share token and returns file information.
 */
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

    // Retrieve file information
    db.get(
      "SELECT * FROM files WHERE id = ?",
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

        // For demonstration, we simply return the file info.
        res.json({
          message: "Shared file accessed successfully.",
          file: {
            id: fileRow.id,
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
// Serve Static Files for React App
// ---------------------
app.use("/uploads", express.static(UPLOADS_FOLDER));
app.use("/images", express.static(UPLOADS_FOLDER));

// Fallback route for React
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// ---------------------
// Start the Server
// ---------------------
app.listen(port, () => {
  logger.info(`Server is running on port ${port}`);
});
