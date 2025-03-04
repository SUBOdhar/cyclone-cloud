import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import Topbar from "../components/Topbar";
import AlertDialog from "../components/AlertDialog"; // Our custom AlertDialog component
import {
  FileText,
  Download,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Share2,
} from "lucide-react";
import Box from "@mui/material/Box";

import { useNavigate } from "react-router-dom";

const FilesUploadPage = ({ theme, toggleTheme }) => {
  // State variables
  const [files, setFiles] = useState([]);
  const [uploading, setUpload] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [alertConfig, setAlertConfig] = useState({
    open: false,
    title: "",
    body: "",
    onOk: null,
  });
  const fileInputRef = useRef(null);
  const url = import.meta.env.VITE_url || "";
  const navigate = useNavigate();

  // Get owner id from localStorage (make sure it is set at login)
  const ownerId = localStorage.getItem("userid");

  // Helper to show the custom alert dialog
  const showAlert = (body, title = "Alert", onOk = null) => {
    setAlertConfig({ open: true, title, body, onOk });
  };

  // Utility: if a response indicates unauthorized access, redirect to login.
  const handleUnauthorized = (res) => {
    if (res.status === 401) {
      showAlert(
        "Your session has expired. Please log in again.",
        "Unauthorized",
        () => {
          localStorage.setItem("loginstat", false);
          localStorage.setItem("userid");

          navigate("/");
        }
      );
      return true;
    }
    return false;
  };

  // Fetch files from the API
  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch(`${url}/api/files`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner_id: ownerId }),
      });
      if (!res.ok) {
        if (handleUnauthorized(res)) return;
        throw new Error("Failed to fetch files");
      }
      const data = await res.json();
      console.log(data);
      setFiles(data);
    } catch (error) {
      console.error(error);
      showAlert("Error fetching files");
    }
  }, [url, ownerId, navigate]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // Upload files to the API (owner_id is appended to FormData)
  const handleFilesUpload = async (uploadedFiles) => {
    setUpload(true);
    if (!uploadedFiles || uploadedFiles.length === 0) return;
    const formData = new FormData();
    Array.from(uploadedFiles).forEach((file) => formData.append("files", file));
    formData.append("owner_id", ownerId);
    try {
      const res = await fetch(`${url}/api/upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) {
        if (handleUnauthorized(res)) return;
        throw new Error("File upload failed");
      }
      const data = await res.json();
      showAlert(`${data.files.length} file(s) uploaded successfully!`);
      fetchFiles();
    } catch (error) {
      console.error(error);
      showAlert("Error uploading files");
    }
    setUpload(false);
  };

  const handleFileChange = (event) => {
    handleFilesUpload(event.target.files);
    event.target.value = "";
  };

  // Drag & Drop Handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesUpload(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };

  // File Actions

  // Download file via opening a new window
  const downloadFile = (filename) => {
    window.open(`${url}/api/files/${filename}/download`, "_blank");
  };

  // Rename file: pass newName and owner_id
  const renameFile = async (filename) => {
    const newName = window.prompt("Enter new file name:", filename);
    if (!newName || newName.trim() === "" || newName === filename) return;
    try {
      const res = await fetch(`${url}/api/files/${filename}/rename`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newName, owner_id: ownerId }),
      });
      if (!res.ok) {
        if (handleUnauthorized(res)) return;
        throw new Error("Rename failed");
      }
      showAlert("File renamed successfully!");
      fetchFiles();
    } catch (error) {
      console.error(error);
      showAlert("Error renaming file");
    }
  };

  // Share file: pass fileId and owner_id
  const shareFile = async (fileId) => {
    try {
      const res = await fetch(`${url}/gsl`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, owner_id: ownerId }),
      });
      if (!res.ok) {
        if (handleUnauthorized(res)) return;
        throw new Error("Share failed");
      }
      const data = await res.json();
      await navigator.clipboard.writeText(data.shareableLink);
      showAlert("Share URL copied to clipboard!");
    } catch (error) {
      console.error("Error sharing file:", error);
      showAlert("Error sharing file");
    }
  };

  // Delete file: pass file id and owner_id (using DELETE with a JSON body)
  const deleteFile = async (fileId) => {
    console.log(fileId);
    try {
      const res = await fetch(`${url}/api/files/${fileId}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner_id: ownerId }),
      });
      if (!res.ok) {
        if (handleUnauthorized(res)) return;
        throw new Error("Delete failed");
      }
      fetchFiles();
    } catch (error) {
      console.error(error);
      showAlert("Error deleting file");
    }
  };

  // Define vw-based sizes (tweak these values as needed)
  const iconSize = viewMode === "grid" ? "4vw" : "4vw"; // for file icons
  const buttonIconSize = viewMode === "grid" ? "2vw" : "2vw"; // for action buttons
  const textSize = viewMode === "grid" ? "1.3vw" : "1.3vw"; // for file name text
  const cardPadding = viewMode === "grid" ? "1vw" : "1vw"; // inner padding for cards
  const cardMargin = viewMode === "grid" ? "0.2vw" : "0.3vw";

  // Consolidated style objects
  const containerStyle = { padding: "2vw" };
  const gridContainerStyle = {
    padding: "1vw",
    maxHeight: "calc(100vh - 10vw)",
    overflowY: "auto",
  };
  const dragOverlayStyle = { fontSize: "2vw" };

  // Helper: Return an icon based on file extension
  const getFileIcon = (filename) => {
    const extension = filename.split(".").pop().toLowerCase();
    const style = { width: iconSize, height: iconSize };
    switch (extension) {
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return <ImageIcon style={style} className="text-blue-500" />;
      case "pdf":
        return <FileText style={style} className="text-red-500" />;
      case "doc":
      case "docx":
        return <FileText style={style} className="text-green-500" />;
      case "xls":
      case "xlsx":
        return <FileText style={style} className="text-green-700" />;
      case "ppt":
      case "pptx":
        return <FileText style={style} className="text-orange-500" />;
      case "txt":
        return <FileText style={style} className="text-gray-500" />;
      default:
        return <FileText style={style} className="text-blue-500" />;
    }
  };

  // Filter files by search query
  const filteredFiles = useMemo(
    () =>
      files.filter((file) =>
        file.filename.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [files, searchQuery]
  );

  const toggleViewMode = () =>
    setViewMode((prev) => (prev === "grid" ? "list" : "grid"));

  const truncateFileName = (filename) => {
    const maxLength = viewMode === "grid" ? 15 : 20;
    if (filename.length <= maxLength) return filename;
    const extension = filename.split(".").pop();
    const nameWithoutExtension = filename.slice(
      0,
      filename.length - extension.length - 1
    );
    return `${nameWithoutExtension.slice(
      0,
      maxLength - extension.length - 4
    )}...${extension}`;
  };

  return (
    <Box position={"relative"}>
      <Topbar
        pageTitle="Files"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        fileInputRef={fileInputRef}
        createNewFile={() => {}}
        toggleTheme={toggleTheme}
        theme={theme}
        uploading={uploading}
        handleFileChange={handleFileChange}
        showSearch={true}
        showUploadActions={true}
        toggleViewMode={toggleViewMode}
        showGridAction={true}
        viewMode={viewMode}
      />
      <div
        style={containerStyle}
        className="flex-1 flex flex-col overflow-y-auto"
      >
        <div
          style={gridContainerStyle}
          className={`relative flex-1 border border-gray-200 dark:border-gray-700 rounded-lg ${
            viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2"
              : "flex flex-col space-y-2"
          }`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {filteredFiles.length === 0 ? (
            <div
              className="text-center text-gray-500 dark:text-gray-400"
              style={{ fontSize: textSize }}
            >
              {searchQuery
                ? "No files match your search."
                : "No files uploaded yet."}
            </div>
          ) : (
            filteredFiles.map((file) => (
              <div
                key={file.file_id}
                style={{ padding: cardPadding, margin: cardMargin }}
                className="bg-white dark:bg-gray-700 rounded-2xl shadow-lg flex flex-col sm:flex-row items-center justify-between transition-transform transform hover:scale-102 hover:shadow-sky-500/30"
              >
                <div
                  className="flex flex-col sm:flex-row items-center gap-1"
                  style={{ margin: "0.5vw" }}
                >
                  {getFileIcon(file.filename)}
                  <span
                    className="font-semibold text-gray-900 dark:text-white break-all text-center sm:text-left"
                    style={{ fontSize: textSize }}
                  >
                    {truncateFileName(file.filename)}
                  </span>
                </div>
                <div className="flex justify-end gap-1">
                  <button
                    onClick={() => downloadFile(file.filename)}
                    className="text-green-500 hover:text-green-700"
                    title="Download"
                  >
                    <Download
                      style={{
                        width: buttonIconSize,
                        height: buttonIconSize,
                      }}
                    />
                  </button>
                  <button
                    onClick={() => shareFile(file.file_id)}
                    className="text-sky-500 hover:text-sky-700"
                    title="Share"
                  >
                    <Share2
                      style={{
                        width: buttonIconSize,
                        height: buttonIconSize,
                      }}
                    />
                  </button>
                  <button
                    onClick={() => renameFile(file.filename)}
                    className="text-gray-500 hover:text-white"
                    title="Rename"
                  >
                    <Edit2
                      style={{
                        width: buttonIconSize,
                        height: buttonIconSize,
                      }}
                    />
                  </button>
                  <button
                    onClick={() => deleteFile(file.file_id)}
                    className="text-red-500 hover:text-red-700"
                    title="Delete"
                  >
                    <Trash2
                      style={{
                        width: buttonIconSize,
                        height: buttonIconSize,
                      }}
                    />
                  </button>
                </div>
              </div>
            ))
          )}
          {dragActive && (
            <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center rounded-lg pointer-events-none">
              <span
                style={dragOverlayStyle}
                className="text-blue-700 font-semibold"
              >
                Drop files to upload
              </span>
            </div>
          )}
        </div>
        {/* Conditionally render the AlertDialog */}
        {alertConfig.open && (
          <AlertDialog
            title={alertConfig.title}
            body={alertConfig.body}
            onOk={() => {
              setAlertConfig({ ...alertConfig, open: false });
              if (alertConfig.onOk) alertConfig.onOk();
            }}
            onCancel={() => setAlertConfig({ ...alertConfig, open: false })}
          />
        )}
      </div>
    </Box>
  );
};

export default FilesUploadPage;
