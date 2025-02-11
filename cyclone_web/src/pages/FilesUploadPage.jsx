import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import Topbar from "../components/Topbar";
import {
  FileText,
  Download,
  Edit2,
  Trash2,
  Image as ImageIcon,
} from "lucide-react";

const FilesUploadPage = ({ theme, toggleTheme }) => {
  // State for files from the API
  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // New state for toggling view mode: "grid" or "list"
  const [viewMode, setViewMode] = useState("grid");
  const fileInputRef = useRef(null);

  // Fetch files from the Node API
  const fetchFiles = useCallback(async () => {
    try {
      const res = await fetch("http://localhost:3001/api/files");
      if (!res.ok) throw new Error("Failed to fetch files");
      const data = await res.json();
      setFiles(data);
    } catch (error) {
      console.error(error);
      alert("Error fetching files");
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  // Upload files to the API
  const handleFilesUpload = async (uploadedFiles) => {
    if (!uploadedFiles || uploadedFiles.length === 0) return;
    const formData = new FormData();
    Array.from(uploadedFiles).forEach((file) => {
      formData.append("files", file);
    });
    try {
      const res = await fetch("http://localhost:3001/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("File upload failed");
      const data = await res.json();
      alert(`${data.files.length} file(s) uploaded successfully!`);
      fetchFiles();
    } catch (error) {
      console.error(error);
      alert("Error uploading files");
    }
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

  // File Actions using the API
  const downloadFile = (filename) => {
    // Open the download URL in a new tab/window
    window.open(
      `http://localhost:3001/api/files/${filename}/download`,
      "_blank"
    );
  };

  const renameFile = async (filename) => {
    const newName = window.prompt("Enter new file name:", filename);
    if (!newName || newName.trim() === "" || newName === filename) return;
    try {
      const res = await fetch(
        `http://localhost:3001/api/files/${filename}/rename`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newName }),
        }
      );
      if (!res.ok) throw new Error("Rename failed");
      alert("File renamed successfully!");
      fetchFiles();
    } catch (error) {
      console.error(error);
      alert("Error renaming file");
    }
  };

  const deleteFile = async (filename) => {
    if (!window.confirm("Are you sure you want to delete this file?")) return;
    try {
      const res = await fetch(`http://localhost:3001/api/files/${filename}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      alert("File deleted successfully!");
      fetchFiles();
    } catch (error) {
      console.error(error);
      alert("Error deleting file");
    }
  };

  // Helper: Return an icon based on file extension
  const getFileIcon = (filename) => {
    const extension = filename.split(".").pop().toLowerCase();
    switch (extension) {
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return <ImageIcon className="w-12 h-12 text-blue-500" />;
      case "pdf":
        return <FileText className="w-12 h-12 text-red-500" />;
      case "doc":
      case "docx":
        return <FileText className="w-12 h-12 text-green-500" />;
      case "xls":
      case "xlsx":
        return <FileText className="w-12 h-12 text-green-700" />;
      case "ppt":
      case "pptx":
        return <FileText className="w-12 h-12 text-orange-500" />;
      case "txt":
        return <FileText className="w-12 h-12 text-gray-500" />;
      default:
        return <FileText className="w-12 h-12 text-blue-500" />;
    }
  };

  // Memoize filtered files based on the search query
  const filteredFiles = useMemo(() => {
    return files.filter((file) =>
      file.filename.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [files, searchQuery]);

  // Toggle between grid and list view modes
  const toggleViewMode = () => {
    setViewMode((prev) => (prev === "grid" ? "list" : "grid"));
  };
  const truncateFileName = (filename, maxLength = 20) => {
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
    <div className="p-6 flex-1 flex flex-col overflow-y-auto">
      {/* Topbar plus a toggle button for view mode */}
      <Topbar
        pageTitle="Files"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        fileInputRef={fileInputRef}
        createNewFile={() => {}}
        toggleTheme={toggleTheme}
        theme={theme}
        handleFileChange={handleFileChange}
        showSearch={true}
        showUploadActions={true}
        toggleViewMode={toggleViewMode}
        showGridAction={true}
        viewMode={viewMode}
      />

      <div
        className={`relative flex-1 border border-gray-200 dark:border-gray-700 rounded-lg p-4 ${
          viewMode === "grid"
            ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"
            : "flex flex-col space-y-4 lg:space-y-6"
        }`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{ maxHeight: "calc(100vh - 100px)", overflowY: "auto" }} // Make it scrollable
      >
        {filteredFiles.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400">
            {searchQuery
              ? "No files match your search."
              : "No files uploaded yet."}
          </div>
        ) : (
          filteredFiles.map((file) => (
            <div
              key={file.filename}
              className={`bg-white dark:bg-gray-700 rounded-2xl shadow-lg p-4 flex ${
                viewMode === "grid"
                  ? "flex-col justify-between"
                  : "flex-row items-center justify-between "
              } transition-transform transform hover:scale-101 hover:shadow-2xl `}
            >
              <div
                className={`flex ${
                  viewMode === "grid"
                    ? "flex-col items-center"
                    : "flex-row items-center space-x-4"
                } mb-4`}
              >
                {getFileIcon(file.filename)}
                <span className="text-xl font-semibold text-gray-900 dark:text-white break-all">
                  {truncateFileName(file.filename)}
                </span>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => downloadFile(file.filename)}
                  className="text-green-500 hover:text-green-700"
                  title="Download"
                >
                  <Download className="w-6 h-6" />
                </button>
                <button
                  onClick={() => renameFile(file.filename)}
                  className="text-gray-500 hover:text-white"
                  title="Rename"
                >
                  <Edit2 className="w-6 h-6" />
                </button>
                <button
                  onClick={() => deleteFile(file.filename)}
                  className="text-red-500 hover:text-red-700"
                  title="Delete"
                >
                  <Trash2 className="w-6 h-6" />
                </button>
              </div>
            </div>
          ))
        )}
        {dragActive && (
          <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center rounded-lg pointer-events-none">
            <span className="text-2xl text-blue-700 font-semibold">
              Drop files to upload
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default FilesUploadPage;
