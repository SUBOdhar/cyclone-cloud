// SharePage.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";

const SharePage = () => {
  // Extract the token from the URL (e.g., /share/:token)
  const { token } = useParams();
  const [fileData, setFileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const url = import.meta.env.VITE_url || "";

  useEffect(() => {
    // Fetch the shared file information from the backend
    axios
      .get(`${url}/share/${token}`)
      .then((response) => {
        setFileData(response.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(
          err.response?.data ||
            "An error occurred while retrieving the shared file."
        );
        setLoading(false);
      });
  }, [token]);

  if (loading) {
    return (
      <div style={styles.centered}>
        <h2>Loading Shared File...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.centered}>
        <h2 style={{ color: "red" }}>Error</h2>
        <p>{error}</p>
      </div>
    );
  }

  // Destructure file and shared metadata from the response
  const { file, sharedAt, message } = fileData;

  // Determine if the file is an image for preview purposes
  const fileExt = file.filename.split(".").pop().toLowerCase();
  const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(fileExt);
  const previewUrl = isImage ? `/uploads/${file.filename}` : null;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1>Shared File</h1>
      </header>

      <div style={styles.card}>
        {isImage ? (
          <div style={styles.previewContainer}>
            <img
              src={previewUrl}
              alt={file.originalname}
              style={styles.previewImage}
            />
          </div>
        ) : (
          <div style={styles.noPreview}>
            <p>No preview available.</p>
          </div>
        )}

        <div style={styles.details}>
          <p>
            <strong>Filename:</strong> {file.originalname}
          </p>
          <p>
            <strong>Uploaded:</strong>{" "}
            {new Date(file.uploadedAt).toLocaleString()}
          </p>
          <p>
            <strong>Shared:</strong> {new Date(sharedAt).toLocaleString()}
          </p>
        </div>

        <div style={styles.actions}>
          <a
            href={`/api/files/${file.filename}/download`}
            style={styles.downloadButton}
          >
            Download File
          </a>
        </div>
      </div>

      <footer style={styles.footer}>
        <small>Powered by Your Application</small>
      </footer>
    </div>
  );
};

// Inline styles for simplicity (you can replace these with external CSS)
const styles = {
  container: {
    maxWidth: "600px",
    margin: "2rem auto",
    fontFamily: "Arial, sans-serif",
    padding: "0 1rem",
  },
  header: {
    textAlign: "center",
    marginBottom: "1rem",
  },
  card: {
    border: "1px solid #ddd",
    borderRadius: "8px",
    padding: "1.5rem",
    backgroundColor: "#fafafa",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  previewContainer: {
    textAlign: "center",
    marginBottom: "1rem",
  },
  previewImage: {
    maxWidth: "100%",
    borderRadius: "4px",
  },
  noPreview: {
    textAlign: "center",
    marginBottom: "1rem",
    color: "#666",
  },
  details: {
    marginBottom: "1rem",
  },
  actions: {
    textAlign: "center",
  },
  downloadButton: {
    display: "inline-block",
    padding: "0.75rem 1.5rem",
    backgroundColor: "#007bff",
    color: "#fff",
    textDecoration: "none",
    borderRadius: "4px",
  },
  footer: {
    textAlign: "center",
    marginTop: "2rem",
    color: "#888",
  },
  centered: {
    textAlign: "center",
    marginTop: "2rem",
    fontFamily: "Arial, sans-serif",
  },
};

export default SharePage;
