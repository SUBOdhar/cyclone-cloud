import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { useParams, useNavigate } from "react-router-dom"; // Import useNavigate
import Topbar from "../components/Topbar";
import AlertDialog from "../components/AlertDialog";
import { useSnackbar } from "notistack";
import Cookies from "js-cookie";
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
  FolderIcon,
  ArrowLeft,
} from "lucide-react";
import {
  MenuItem,
  Menu,
  Tooltip,
  IconButton,
  ListItemIcon,
  Box,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Android } from "@mui/icons-material";

const BASE_DRAG_OVER_STYLE = {
  position: "absolute",
  inset: 0,
  backgroundColor: "rgba(59, 130, 246, 0.2)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: "8px",
  pointerEvents: "none",
};

const FilesUploadPage = ({ theme, toggleTheme, toggleDrawer }) => {
  // State variables
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [alertConfig, setAlertConfig] = useState({
    open: false,
    title: "",
    body: "",
    onOk: null,
  });
  const [anchorE2, setAnchorE2] = useState(null);
  const fileInputRef = useRef(null);
  const [folder_path, setFolderPath] = useState([]);
  const { folderPath } = useParams();
  const url = import.meta.env.VITE_url || "";
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  // MUI hooks for responsive design
  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("sm"));
  const textSize = isMobile ? "14px" : "1.3vw";
  const iconSize = isMobile ? "40px" : "4vw";
  const buttonIconSize = isMobile ? "20px" : "2vw";
  const cardPadding = isMobile ? "8px" : "0.5vw";
  const cardMargin = isMobile ? "4px" : "0.1vw";
  const dragOverlayStyle = {
    fontSize: isMobile ? "18px" : "2vw",
    ...BASE_DRAG_OVER_STYLE,
  };
  const containerStyle = { padding: isMobile ? "6px" : "1vw" };
  const gridContainerStyle = {
    padding: isMobile ? "4px" : "1vw",
    maxHeight: isMobile ? "calc(100vh - 150px)" : "calc(100vh - 4vw)",
    overflowY: "auto",
  };

  // Get owner id from cookie
  const ownerId = Cookies.get("userid");

  // Snackbar wrapper
  const snackBar = useCallback(
    (message, variant) => {
      enqueueSnackbar(message, { variant });
    },
    [enqueueSnackbar]
  );

  // Handle unauthorized access
  const handleUnauthorized = useCallback(async () => {
    const res = await fetch(`${url}/api/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        refreshToken: Cookies.get("refreshToken"),
      }),
    });
    const data = await res.json();
    if (data.error) {
      Cookies.remove("loginstat");
      Cookies.remove("userid");
      setAlertConfig({
        open: true,
        title: "Unauthorized",
        body: "Your session has expired. Please log in again.",
        onOk: () => navigate("/"),
      });
      return true;
    }
    return false;
  }, [url, navigate]);

  // Fetch files from the API
  const fetchFiles = useCallback(
    async (foldername = "") => {
      try {
        const res = await fetch(
          `${url}/api/files?folder=${getFilesSubPath()}`,
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              owner_id: ownerId,
              refreshToken: Cookies.get("refreshToken"),
            }),
          }
        );
        const data = await res.json();

        if (!res.ok) {
          if (handleUnauthorized()) return;
          throw new Error("Failed to fetch files");
        }
        if (data && data.items && Array.isArray(data.items)) {
          setFiles(data.items);
        } else if (Array.isArray(data)) {
          setFiles(data);
        } else {
          console.error("Unexpected API response structure", data);
          setFiles([]);
        }
      } catch (error) {
        snackBar("Error fetching files", "error");
      }
    },
    [url, ownerId, snackBar, handleUnauthorized]
  );

  useEffect(() => {
    if (folderPath && folderPath !== "undefined") {
      setFolderPath(folderPath.split("/"));
      fetchFiles(getFilesSubPath() || "" || folderPath); // Use));
    } else {
      fetchFiles();
    }
  }, [fetchFiles, folderPath]);

  const getFilesSubPath = () => {
    if (location.pathname.startsWith("/files/")) {
      const subPath = location.pathname.substring("/files/".length);
      return subPath;
    }
    return "";
  };
  console.log(getFilesSubPath());
  // File upload handler
  const handleFilesUpload = useCallback(
    async (uploadedFiles) => {
      if (!uploadedFiles?.length) return;
      setUploading(true);

      const formData = new FormData();
      Array.from(uploadedFiles).forEach((file) =>
        formData.append("files", file)
      );
      formData.append("owner_id", ownerId);
      formData.append("folder", getFilesSubPath() || ""); // Use folderPath here
      formData.append("refreshToken", Cookies.get("refreshToken"));

      try {
        const res = await fetch(`${url}/api/upload`, {
          method: "POST",
          credentials: "include",
          body: formData,
        });
        if (!res.ok) {
          if (await handleUnauthorized()) return;
          throw new Error(`File upload failed: ${res.statusText}`);
        }
        const data = await res.json();
        snackBar(
          `${data.files.length} file(s) uploaded successfully!`,
          "success"
        );
        fetchFiles();
      } catch (error) {
        snackBar(`Error uploading files: ${error.message}`, "error");
      } finally {
        setUploading(false);
      }
    },
    [url, ownerId, snackBar, fetchFiles, handleUnauthorized, getFilesSubPath] // Add folderPath as dependency
  );

  const handleFileChange = (event) => {
    handleFilesUpload(event.target.files);
    event.target.value = "";
  };

  // Drag & Drop Handlers (wrapped in useCallback to reduce re-renders)
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);
  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);
  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer.files?.length) {
        handleFilesUpload(e.dataTransfer.files);
        e.dataTransfer.clearData();
      }
    },
    [handleFilesUpload]
  );

  // File action handlers
  const downloadFile = useCallback(
    (filename) => {
      window.open(`${url}/api/files/${filename}/download`, "_blank");
    },
    [url]
  );

  const renameFile = useCallback(
    async (filename) => {
      const newName = window.prompt("Enter new file name:", filename);
      if (!newName || newName.trim() === "" || newName === filename) return;
      try {
        const res = await fetch(`${url}/api/files/${filename}/rename`, {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            newName,
            owner_id: ownerId,
            refreshToken: Cookies.get("refreshToken"),
          }),
        });
        if (!res.ok && (await handleUnauthorized())) return;
        snackBar("File renamed successfully!", "success");
        fetchFiles();
      } catch (error) {
        snackBar("Error renaming file", "error");
      }
    },
    [url, ownerId, snackBar, fetchFiles, handleUnauthorized]
  );

  const shareFile = useCallback(
    async (fileId) => {
      try {
        const res = await fetch(`${url}/gsl`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileId,
            owner_id: ownerId,
            refreshToken: Cookies.get("refreshToken"),
          }),
        });
        if (!res.ok && (await handleUnauthorized())) return;
        const data = await res.json();
        await navigator.clipboard.writeText(data.shareableLink);
        snackBar("Share URL copied to clipboard!", "success");
      } catch (error) {
        snackBar("Error sharing file", "error");
      }
    },
    [url, ownerId, snackBar, handleUnauthorized]
  );

  const deleteFile = useCallback(
    async (fileId) => {
      try {
        const res = await fetch(`${url}/api/files/${fileId}`, {
          method: "DELETE",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            owner_id: ownerId,
            refreshToken: Cookies.get("refreshToken"),
          }),
        });
        if (!res.ok && (await handleUnauthorized())) return;
        snackBar("File deleted successfully!", "success");
        fetchFiles();
      } catch (error) {
        snackBar("Error deleting file", "error");
      }
    },
    [url, ownerId, snackBar, fetchFiles, handleUnauthorized]
  );

  // Handle "More" menu for mobile
  const handleClickMore = useCallback(
    (event) => setAnchorE2(event.currentTarget),
    []
  );
  const handleCloseMore = useCallback(() => setAnchorE2(null), []);

  // Helper to choose file icon based on extension (memoized)
  const getFileIcon = useCallback(
    (filename) => {
      const extension = filename.split(".").pop().toLowerCase();
      const iconProps = { width: iconSize, height: iconSize };

      switch (extension) {
        case "jpg":
        case "jpeg":
        case "png":
        case "gif":
        case "bmp":
        case "svg":
          return <FileImage {...iconProps} style={{ color: "#3B82F6" }} />;
        case "pdf":
          return <File {...iconProps} style={{ color: "#EF4444" }} />;
        case "doc":
        case "docx":
        case "odt":
          return <File {...iconProps} style={{ color: "#10B981" }} />;
        case "xls":
        case "xlsx":
        case "csv":
          return <File {...iconProps} style={{ color: "#047857" }} />;
        case "ppt":
        case "pptx":
        case "odp":
          return <File {...iconProps} style={{ color: "#F97316" }} />;
        case "txt":
        case "md":
          return <File {...iconProps} style={{ color: "#6B7280" }} />;
        case "mp3":
        case "wav":
        case "ogg":
          return <FileMusic {...iconProps} style={{ color: "#8B5CF6" }} />;
        case "mp4":
        case "avi":
        case "mov":
        case "mkv":
          return <FileVideo {...iconProps} style={{ color: "#EF4444" }} />;
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
          return <FileCode {...iconProps} style={{ color: "#4B5563" }} />;
        case "zip":
        case "rar":
        case "tar":
        case "gz":
        case "7z":
          return <FolderArchive {...iconProps} style={{ color: "#F59E0B" }} />;
        case "epub":
        case "mobi":
          return <Book {...iconProps} style={{ color: "#D97706" }} />;
        case "apk":
          return <Android {...iconProps} style={{ color: "#50b054" }} />;
        default:
          return <File {...iconProps} style={{ color: "#3B82F6" }} />;
      }
    },
    [iconSize]
  );

  // Filter files based on search query using the correct property (name)
  const filteredFiles = useMemo(() => {
    if (!Array.isArray(files)) return [];
    return files.filter((file) =>
      file.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [files, searchQuery]);

  // Toggle view mode between grid and list
  const toggleViewMode = useCallback(() => {
    setViewMode((prev) => (prev === "grid" ? "list" : "grid"));
  }, []);
  function openFolder(folderName) {
    const newFolderPath =
      folder_path.length > 0 ? [...folder_path, folderName] : [folderName];
    setFolderPath(newFolderPath);
    const newFolder = newFolderPath.join("/");
    navigate(`/files/${newFolder}`); // Navigate to the new folder path
  }
  function goBack() {
    const newFolderPath = folder_path.slice(0, -1);
    setFolderPath(newFolderPath);
    const newFolder = newFolderPath.join("/");
    if (newFolder.length === 0) {
      navigate(`/files`); // Navigate to the root files path
    } else {
      navigate(`/files/${newFolder}`); // Navigate to the new folder path
    }
  }
  // Utility: truncate file name for display
  const truncateFileName = useCallback(
    (filename) => {
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
    },
    [viewMode, isMobile]
  );

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
        currentFolder={folderPath}
      />
      <div
        style={containerStyle}
        className="flex-1 flex flex-col overflow-y-auto"
      >
        <div
          style={gridContainerStyle}
          className={`relative flex-1 rounded-lg ${
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
          {folder_path.length !== 0 ? (
            <ArrowLeft
              style={{
                width: buttonIconSize,
                height: buttonIconSize,
                position: "absolute",
              }}
              color="white"
              onClick={() => {
                goBack();
              }}
            />
          ) : null}
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
                key={file.file_id || file.name}
                onClick={
                  file.type === "folder"
                    ? () => {
                        openFolder(file.name);
                      }
                    : () => {}
                }
                style={
                  file.type === "folder"
                    ? { padding: "2px", margin: "1px", cursor: "default" } // Adjust padding and margin for folders
                    : { padding: cardPadding, margin: cardMargin }
                }
                className={
                  file.type === "folder"
                    ? "bg-white text-dark dark:bg-gray-700 rounded-2xl shadow-lg flex flex-column hover:scale-101 hover:shadow-sky-500/1o"
                    : "bg-white text.dark dark:bg-gray-700 rounded-2xl shadow-lg flex flex-row items-center justify-between transition-transform transform hover:scale-101 hover:shadow-sky-500/10"
                }
              >
                <div
                  className="flex flex-row items-center gap-1"
                  style={{ margin: isMobile ? "4px" : "0.5vw" }}
                >
                  {file.type == "folder" ? (
                    // <Folder
                    //   style={{
                    //     width: iconSize,
                    //     height: iconSize,
                    //   }}
                    // />
                    <FolderIcon
                      style={{
                        width: iconSize,
                        height: iconSize,
                        color: "#3B82F6",
                      }}
                    />
                  ) : (
                    getFileIcon(file.name)
                  )}
                  <span
                    className="font-semibold text-gray-900 dark:text-white break-all text-center sm:text-left"
                    style={{ fontSize: textSize }}
                  >
                    {truncateFileName(file.name)}
                  </span>
                </div>
                {viewMode !== "grid" && <div>{file.created_at}</div>}
                {file.type !== "folder" &&
                  (isMobile ? (
                    <>
                      <Tooltip title="More">
                        <IconButton
                          onClick={handleClickMore}
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
                        onClose={handleCloseMore}
                        onClick={handleCloseMore}
                        slotProps={{
                          paper: {
                            elevation: 0,
                            sx: {
                              overflow: "visible",
                              filter:
                                "drop-shadow(0px 2px 8px rgba(0,0,0,0.32))",
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
                        transformOrigin={{
                          horizontal: "right",
                          vertical: "top",
                        }}
                        anchorOrigin={{
                          horizontal: "right",
                          vertical: "bottom",
                        }}
                      >
                        <MenuItem onClick={() => downloadFile(file.name)}>
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
                        <MenuItem onClick={() => renameFile(file.name)}>
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
                          onClick={() => downloadFile(file.name)}
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
                          onClick={() => renameFile(file.name)}
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
                  ))}
              </div>
            ))
          )}
          {dragActive && (
            <div style={dragOverlayStyle}>
              <span
                style={{
                  fontSize: isMobile ? "18px" : "2vw",
                  color: "#1E40AF",
                  fontWeight: "600",
                }}
              >
                Drop files to upload
              </span>
            </div>
          )}
        </div>
        {alertConfig.open && (
          <AlertDialog
            title={alertConfig.title}
            body={alertConfig.body}
            onOk={() => {
              setAlertConfig({ ...alertConfig, open: false });
              alertConfig.onOk && alertConfig.onOk();
            }}
            onCancel={() => setAlertConfig({ ...alertConfig, open: false })}
          />
        )}
      </div>
    </Box>
  );
};

export default FilesUploadPage;
