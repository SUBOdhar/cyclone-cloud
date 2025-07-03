// SharePage.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import "./SharePage.css"; // Import external CSS for spinner and any extra styling

const SharePage = () => {
  const { token } = useParams();
  const [fileData, setFileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const url = import.meta.env.VITE_url || "";

  useEffect(() => {
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
  }, [token, url]);

  if (loading) {
    return (
      <div style={styles.centered}>
        <div className="loader"></div>
        <h2>Loading Shared File...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.centered}>
        <h2 style={styles.errorTitle}>Error</h2>
        <p>{error}</p>
      </div>
    );
  }
  const { file, sharedAt, message, owner_id } = fileData;
  const fileExt = file.filename.split(".").pop().toLowerCase();
  const isImage = ["jpg", "jpeg", "png", "gif", "webp"].includes(fileExt);
  const isVideo = ["mp4", "avi", "mov", "mkv"].includes(fileExt);
  const isAudio = ["mp3", "wav", "ogg"].includes(fileExt);

  const previewUrl = `/uploads/${owner_id}/${file.filename}`;
  console.log(previewUrl);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>Shared File</h1>
        {message && <p style={styles.message}>{message}</p>}
      </header>

      <div style={styles.card}>
        {isVideo && (
          <div style={styles.previewContainer}>
            <video
              src={previewUrl}
              controls
              style={styles.previewImage}
              width={200}
            />
          </div>
        )}
        {isAudio && (
          <div style={styles.previewContainer}>
            <audio
              src={previewUrl}
              controls
              style={styles.previewImage}
              width={200}
            />
          </div>
        )}
        {isImage ? (
          <div style={styles.previewContainer}>
            <img
              src={previewUrl}
              alt={file.originalname}
              style={styles.previewImage}
              width={200}
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
        <small>Powered by Cyclone Cloud</small>
      </footer>
    </div>
  );
};

const styles = {
  container: {
    maxWidth: "800px",
    margin: "2rem auto",
    padding: "0 1rem",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  header: {
    textAlign: "center",
    marginBottom: "2rem",
    color: "white",
  },
  title: {
    fontSize: "2.5rem",
    margin: "0",
  },
  message: {
    fontSize: "1rem",
    marginTop: "0.5rem",
  },
  card: {
    background: "#fff",
    borderRadius: "12px",
    padding: "2rem",
    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
    transition: "transform 0.3s ease",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },

  previewContainer: {
    textAlign: "center",
    marginBottom: "1.5rem",
  },
  previewImage: {
    maxWidth: "100%",
    borderRadius: "8px",
    transition: "transform 0.3s ease",
  },
  noPreview: {
    textAlign: "center",
    marginBottom: "1.5rem",
    color: "#999",
  },
  details: {
    fontSize: "1rem",
    marginBottom: "1.5rem",
    lineHeight: "1.6",
  },
  actions: {
    textAlign: "center",
  },
  downloadButton: {
    display: "inline-block",
    padding: "0.75rem 1.5rem",
    backgroundColor: "#007bff",
    color: "#fff",
    borderRadius: "8px",
    textDecoration: "none",
    fontSize: "1rem",
    transition: "background-color 0.3s ease",
  },
  footer: {
    textAlign: "center",
    marginTop: "2rem",
    color: "#aaa",
    fontSize: "0.9rem",
  },
  centered: {
    textAlign: "center",
    marginTop: "4rem",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  errorTitle: {
    color: "#e74c3c",
  },
};

export default SharePage;
