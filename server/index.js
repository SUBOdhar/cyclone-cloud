// server.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 3001;
app.use(cors());
// ---------------------
// Middleware Setup
// ---------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
    // Optionally check file.mimetype to determine the destination folder.
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

// GET /api/files - List all uploaded files
app.get("/api/files", (req, res) => {
  fs.readdir(UPLOADS_FOLDER, (err, files) => {
    if (err) {
      return res.status(500).json({ error: "Could not list files" });
    }
    const fileData = files.map((file) => {
      const filePath = path.join(UPLOADS_FOLDER, file);
      const stats = fs.statSync(filePath);
      return { filename: file, created: stats.birthtime };
    });
    res.json(fileData);
  });
});

// POST /api/upload - Upload files (field name should be "files")
app.post("/api/upload", upload.array("files", 10), (req, res) => {
  // req.files contains an array of file objects
  res.json({ message: "Files uploaded successfully", files: req.files });
});

// GET /api/files/:filename/download - Download a file
app.get("/api/files/:filename/download", (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(UPLOADS_FOLDER, filename);
  res.download(filePath, filename, (err) => {
    if (err) {
      res.status(500).json({ error: "Error in downloading the file." });
    }
  });
});

// PUT /api/files/:filename/rename - Rename a file
app.put("/api/files/:filename/rename", (req, res) => {
  const { filename } = req.params;
  const { newName } = req.body;
  if (!newName) return res.status(400).json({ error: "New name not provided" });
  const oldPath = path.join(UPLOADS_FOLDER, filename);
  const newPath = path.join(UPLOADS_FOLDER, newName);
  fs.rename(oldPath, newPath, (err) => {
    if (err) return res.status(500).json({ error: "Could not rename file" });
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
    if (err) return res.status(500).json({ error: "Could not delete file" });
    res.json({ message: "File deleted successfully" });
  });
});

// GET /api/images - List all images in the images folder
app.get("/api/images", (req, res) => {
  fs.readdir(UPLOADS_FOLDER, (err, files) => {
    if (err) {
      return res.status(500).json({ error: "Could not list images" });
    }
    // Filter for common image file extensions
    const imageFiles = files.filter((file) => {
      const ext = path.extname(file).toLowerCase();
      return [".jpg", ".jpeg", ".png", ".gif"].includes(ext);
    });
    const imageData = imageFiles.map((file) => {
      const filePath = path.join(UPLOADS_FOLDER, file);
      const stats = fs.statSync(filePath);
      return { filename: file, created: stats.birthtime };
    });
    res.json(imageData);
  });
});

// ---------------------
// Serve Static Files for the React App
// ---------------------
// In production, after you run "npm run build" (if using Create React App),
// the React build files will be in the "build" directory.
app.use(express.static(path.join(__dirname, "build")));

// Serve uploaded files and images as static assets.
app.use("/uploads", express.static(UPLOADS_FOLDER));
app.use("/images", express.static(UPLOADS_FOLDER));

// Fallback route: For any request that doesn’t match an API route,
// serve the React index.html file (allowing client–side routing to take over).
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

// ---------------------
// Start the Server
// ---------------------
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
