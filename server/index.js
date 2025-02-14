const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const morgan = require("morgan");
const winston = require("winston");

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
// Middleware Setup
// ---------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------------------
// Create logs directory if it doesn't exist
// ---------------------
const LOGS_FOLDER = path.join(__dirname, "logs");
if (!fs.existsSync(LOGS_FOLDER)) {
  fs.mkdirSync(LOGS_FOLDER);
}

// ---------------------
// Configure Morgan for HTTP Request Logging
// ---------------------
app.use(
  morgan("combined", {
    stream: {
      write: (message) => logger.info(message.trim()), // Integrate with winston
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
// API Endpoints
// ---------------------

//Serve the static React build file for the final build
app.use("/", express.static("dist"));

// GET /api/files - List all uploaded files
app.get("/api/files", (req, res) => {
  fs.readdir(UPLOADS_FOLDER, (err, files) => {
    if (err) {
      logger.error("Could not list files: " + err.message);
      return res.status(500).json({ error: "Could not list files" });
    }
    const fileData = files.map((file) => {
      const filePath = path.join(UPLOADS_FOLDER, file);
      const stats = fs.statSync(filePath);
      return { filename: file, created: stats.birthtime };
    });
    logger.info("Files listed successfully");
    res.json(fileData);
  });
});

// POST /api/upload - Upload files
app.post("/api/upload", upload.array("files", 50), (req, res) => {
  logger.info(`${req.files.length} file(s) uploaded successfully`);
  res.json({ message: "Files uploaded successfully", files: req.files });
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

// PUT /api/files/:filename/rename - Rename a file
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
      logger.error(`Could not rename file: ${filename}`);
      return res.status(500).json({ error: "Could not rename file" });
    }
    logger.info(`File renamed from ${filename} to ${newName}`);
    res.json({
      message: "File renamed successfully",
      oldName: filename,
      newName,
    });
  });
});

// DELETE /api/files/:filename - Delete a file
app.delete("/api/files/:filename", (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(UPLOADS_FOLDER, filename);
  fs.unlink(filePath, (err) => {
    if (err) {
      logger.error(`Could not delete file: ${filename}`);
      return res.status(500).json({ error: "Could not delete file" });
    }
    logger.info(`File deleted: ${filename}`);
    res.json({ message: "File deleted successfully" });
  });
});

// GET /api/images - List all images
app.get("/api/images", (req, res) => {
  fs.readdir(UPLOADS_FOLDER, (err, files) => {
    if (err) {
      logger.error("Could not list images: " + err.message);
      return res.status(500).json({ error: "Could not list images" });
    }
    const imageFiles = files.filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return [".jpg", ".jpeg", ".png", ".gif"].includes(ext);
    });
    const imageData = imageFiles.map((file) => {
      const filePath = path.join(UPLOADS_FOLDER, file);
      const stats = fs.statSync(filePath);
      return { filename: file, created: stats.birthtime };
    });
    logger.info("Images listed successfully");
    res.json(imageData);
  });
});

// ---------------------
// Serve Static Files for React App
// ---------------------
app.use(express.static(path.join(__dirname, "build")));
app.use("/uploads", express.static(UPLOADS_FOLDER));
app.use("/images", express.static(UPLOADS_FOLDER));

// Fallback route for React
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

// ---------------------
// Start the Server
// ---------------------
app.listen(port, () => {
  logger.info(`Server is running on port ${port}`);
});
