import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import Topbar from "../components/Topbar";
import AlertDialog from "../components/AlertDialog"; // Our custom AlertDialog component
import { SnackbarProvider, useSnackbar } from "notistack";
import {
  File,
  Download,
  Edit2,
  Trash2,
  Share2,
  MoreVertical,
  FileMusic,
  FileVideo,
  FolderArchive,
  Book,
  FileCode,
  FileImage,
} from "lucide-react";
import {
  MenuItem,
  Menu,
  Tooltip,
  Button,
  ListItemIcon,
  IconButton,
} from "@mui/material";
import { Box, useMediaQuery, useTheme } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { deleteCookie, getCookie } from "../components/Cookies";

const FilesUploadPage = ({ theme, toggleTheme, toggleDrawer }) => {
  // State variables
  const [files, setFiles] = new useState([]);
  const [uploading, setUpload] = new useState(false);
  const [dragActive, setDragActive] = new useState(false);
  const [searchQuery, setSearchQuery] = new useState("");
  const [viewMode, setViewMode] = new useState("grid");
  const [alertConfig, setAlertConfig] = new useState({
    open: false,
    title: "",
    body: "",
    onOk: null,
  });
  const fileInputRef = useRef(null);
  const [anchorE2, setAnchorE2] = useState(null); // For "New" menu (desktop)

  const url = import.meta.env.VITE_url || "";
  const navigate = useNavigate();

  // MUI hooks for responsive design
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("sm"));

  // Get owner id from localStorage (make sure it is set at login)
  const ownerId = getCookie("userid");

  // Helper to show the custom alert dialog
  const showAlert = (body, title = "Alert", onOk = null) => {
    setAlertConfig({ open: true, title, body, onOk });
  };
  const handleClick2 = (event) => setAnchorE2(event.currentTarget);
  const handleClose2 = () => setAnchorE2(null);
  // Utility: if a response indicates unauthorized access, redirect to login.
  const handleUnauthorized = async () => {
    const res = await fetch(`${url}/api/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });

    const data = await res.json();
    if (data.error) {
      deleteCookie("loginstat");
      deleteCookie("userid");
      showAlert(
        "Your session has expired. Please log in again.",
        "Unauthorized"
      );
      navigate("/");
    }
    return false;
  };

  const { enqueueSnackbar } = useSnackbar();
  const snackBar = (message, variant) => {
    // variant could be success, error, warning, info, or default
    enqueueSnackbar(message, { variant });
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

      const data = await res.json();

      if (data.error === "Token expired") {
        if (handleUnauthorized()) return;
        throw new Error("Failed to fetch files");
      }
      setFiles(data);
    } catch (error) {
      snackBar("Error fetching files", "error");
    }
  }, [url, navigate]);

  useEffect(() => {
    fetchFiles();
  }, [url, fetchFiles, navigate]);

  // Upload files to the API (owner_id is appended to FormData)
  const handleFilesUpload = async (uploadedFiles) => {
    setUpload(true);

    if (!uploadedFiles || uploadedFiles.length === 0) return;

    const formData = new FormData();

    // Optionally, filter or validate files before appending them
    Array.from(uploadedFiles).forEach((file) => {
      // Example: check for file type before appending (optional)
      formData.append("files", file);
    });

    formData.append("owner_id", ownerId);

    try {
      const res = await fetch(`${url}/api/upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        if (handleUnauthorized()) return;
        throw new Error(`File upload failed: ${res.statusText}`);
      }

      const data = await res.json();
      snackBar(
        `${data.files.length} file(s) uploaded successfully!`,
        "success"
      );
      fetchFiles();

      // Optionally, reset file input here
      // document.getElementById("file-input").value = ''; // If needed
    } catch (error) {
      snackBar(`Error uploading files: ${error.message}`, "error");
    }

    setUpload(false);
  };

  const handleFileChange = (event) => {
    const files = event.target.files;

    // Make sure files are valid
    if (files.length > 0) {
      handleFilesUpload(files);
    }

    // Reset input value
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
        if (handleUnauthorized()) return;
        throw new Error("Rename failed");
      }
      snackBar("File renamed successfully!", "success");
      fetchFiles();
    } catch (error) {
      snackBar("Error renaming file", "error");
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
        if (handleUnauthorized()) return;
        throw new Error("Share failed");
      }
      const data = await res.json();
      await navigator.clipboard.writeText(data.shareableLink);
      snackBar("Share URL copied to clipboard!", "success");
    } catch (error) {
      snackBar("Error sharing file", "error");
    }
  };

  // Delete file: pass file id and owner_id (using DELETE with a JSON body)
  const deleteFile = async (fileId) => {
    try {
      const res = await fetch(`${url}/api/files/${fileId}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ owner_id: ownerId }),
      });
      if (!res.ok) {
        if (handleUnauthorized()) return;
        throw new Error("Delete failed");
      }
      snackBar("File deleted successfully!", "success");
      fetchFiles();
    } catch (error) {
      snackBar("Error deleting file", "error");
    }
  };

  // Use fixed pixel sizes on mobile and viewport units on larger displays.
  const textSize = isMobile ? "14px" : "1.3vw";
  const iconSize = isMobile ? "40px" : "4vw";
  const buttonIconSize = isMobile ? "20px" : "2vw";
  const cardPadding = isMobile ? "8px" : "0.5vw";
  const cardMargin = isMobile ? "4px" : "0.1vw";
  const dragOverlayStyle = { fontSize: isMobile ? "18px" : "2vw" };

  // Adjust container styles for mobile vs desktop
  const containerStyle = { padding: isMobile ? "6px" : "1vw" };
  const gridContainerStyle = {
    padding: isMobile ? "4px" : "1vw",
    maxHeight: isMobile ? "calc(100vh - 150px)" : "calc(100vh - 4vw)",
    overflowY: "auto",
  };

  // Helper: Return an icon based on file extension
  const getFileIcon = (filename) => {
    const extension = filename.split(".").pop().toLowerCase();
    // Using Lucid React, we pass width and height props for sizing and inline style for color
    const iconProps = { width: iconSize, height: iconSize };

    switch (extension) {
      // Image files
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
      case "bmp":
      case "svg":
        return <FileImage {...iconProps} style={{ color: "#3B82F6" }} />; // blue-500
      // PDF files
      case "pdf":
        return <File {...iconProps} style={{ color: "#EF4444" }} />; // red-500
      // Word documents
      case "doc":
      case "docx":
      case "odt":
        return <File {...iconProps} style={{ color: "#10B981" }} />; // green-500
      // Excel files and CSVs
      case "xls":
      case "xlsx":
      case "csv":
        return <File {...iconProps} style={{ color: "#047857" }} />; // green-700
      // PowerPoint files
      case "ppt":
      case "pptx":
      case "odp":
        return <File {...iconProps} style={{ color: "#F97316" }} />; // orange-500
      // Text and Markdown files
      case "txt":
      case "md":
        return <File {...iconProps} style={{ color: "#6B7280" }} />; // gray-500
      // Audio files
      case "mp3":
      case "wav":
      case "ogg":
        return <FileMusic {...iconProps} style={{ color: "#8B5CF6" }} />; // purple-500
      // Video files
      case "mp4":
      case "avi":
      case "mov":
      case "mkv":
        return <FileVideo {...iconProps} style={{ color: "#EF4444" }} />; // red-500
      // Code files
      case "js":
      case "jsx":
      case "ts":
      case "tsx":
      case "html":
      case "css":
      case "json":
      case "xml":
      case "py":
      case "java":
      case "rb":
        return <FileCode {...iconProps} style={{ color: "#4B5563" }} />; // gray-600
      // Archive files
      case "zip":
      case "rar":
      case "tar":
      case "gz":
      case "7z":
        return <FolderArchive {...iconProps} style={{ color: "#F59E0B" }} />; // yellow-500
      // eBook files
      case "epub":
      case "mobi":
        return <Book {...iconProps} style={{ color: "#D97706" }} />; // orange-700
      // Default icon for unsupported file types
      default:
        return <File {...iconProps} style={{ color: "#3B82F6" }} />; // blue-500
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
    const maxLength = viewMode === "grid" ? (isMobile ? 10 : 15) : 20;
    if (filename.length <= maxLength) return filename;
    const extension = filename.split(".").pop();
    const nameWithoutExtension = filename.slice(
      0,
      filename.length - extension.length - 1
    );
    return `${nameWithoutExtension.slice(
      0,
      maxLength - extension.length - 4
    )}..${extension}`;
  };

  return (
    <Box position="relative">
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
        toggleSidebar={toggleDrawer}
      />

      <div
        style={containerStyle}
        className="flex-1 flex flex-col overflow-y-auto"
      >
        <div
          style={gridContainerStyle}
          className={`relative flex-1  rounded-lg ${
            viewMode === "grid"
              ? isMobile
                ? "grid grid-cols-2 gap-2"
                : "grid grid-cols-2 md:grid-cols-3 gap-2"
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
                className="bg-white dark:bg-gray-700 rounded-2xl shadow-lg flex flex-row items-center justify-between transition-transform transform hover:scale-102 hover:shadow-sky-500/30"
              >
                <div
                  className={`flex flex-row
                   items-center gap-1`}
                  style={{ margin: isMobile ? "4px" : "0.5vw" }}
                >
                  {getFileIcon(file.filename)}
                  <span
                    className="font-semibold text-gray-900 dark:text-white break-all text-center sm:text-left"
                    style={{ fontSize: textSize }}
                  >
                    {truncateFileName(file.filename)}
                  </span>
                </div>
                {!viewMode === "grid" && (
                  <>
                    <div>{file.created_at}</div>
                  </>
                )}
                {isMobile ? (
                  <>
                    <Tooltip title="More">
                      <IconButton
                        onClick={handleClick2}
                        variant="contained"
                        size="small"
                        sx={{ ml: 0, boxShadow: 0, padding: 0 }}
                        aria-controls={
                          Boolean(anchorE2) ? "more-menu" : undefined
                        }
                        aria-haspopup="true"
                        aria-expanded={Boolean(anchorE2) ? "true" : undefined}
                      >
                        <MoreVertical color="white" />
                      </IconButton>
                    </Tooltip>
                    <Menu
                      anchorEl={anchorE2}
                      id="more-menu"
                      open={Boolean(anchorE2)}
                      onClose={handleClose2}
                      onClick={handleClose2}
                      slotProps={{
                        paper: {
                          elevation: 0,
                          sx: {
                            overflow: "visible",
                            filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.32))",
                            mt: 1.5,
                            "& .MuiAvatar-root": {
                              width: 32,
                              height: 32,
                              ml: -0.5,
                              mr: 1,
                            },
                            "&::before": {
                              content: '""',
                              display: "block",
                              position: "absolute",
                              top: 0,
                              right: 14,
                              width: 10,
                              height: 10,
                              bgcolor: "background.paper",
                              transform: "translateY(-50%) rotate(45deg)",
                              zIndex: 0,
                            },
                          },
                        },
                      }}
                      transformOrigin={{ horizontal: "right", vertical: "top" }}
                      anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
                    >
                      <MenuItem onClick={() => downloadFile(file.filename)}>
                        <ListItemIcon>
                          <Download fontSize="small" />
                        </ListItemIcon>
                        Download
                      </MenuItem>
                      <MenuItem onClick={() => shareFile(file.file_id)}>
                        <ListItemIcon>
                          <Share2 fontSize="small" />
                        </ListItemIcon>
                        Share
                      </MenuItem>
                      <MenuItem onClick={() => renameFile(file.filename)}>
                        <ListItemIcon>
                          <Edit2 fontSize="small" />
                        </ListItemIcon>
                        Rename
                      </MenuItem>
                      <MenuItem onClick={() => deleteFile(file.file_id)}>
                        <ListItemIcon>
                          <Trash2 fontSize="small" />
                        </ListItemIcon>
                        Delete
                      </MenuItem>
                    </Menu>
                  </>
                ) : (
                  <>
                    <div className="flex justify-end  gap-1">
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
                  </>
                )}
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
