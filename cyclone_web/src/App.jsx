import React, { useState, useEffect, useRef } from "react";
import { BrowserRouter as Router, Route, Routes, Link } from "react-router-dom";
import {
  Folder,
  FileText,
  FilePlus,
  UploadCloud,
  Edit2,
  Trash2,
  Download,
  Settings,
  Moon,
  Sun,
} from "lucide-react";

// Sidebar Component (unchanged)
const Sidebar = () => (
  <div className="w-64 h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white flex flex-col p-6 shadow-lg">
    <h1 className="text-3xl font-extrabold mb-8 tracking-wide">MyCloud</h1>
    <nav className="flex flex-col space-y-6">
      <Link
        to="/"
        className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-700 transition-transform transform hover:scale-105"
      >
        <Folder className="w-6 h-6" />
        <span className="text-lg">Files</span>
      </Link>
      <Link
        to="/settings"
        className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-700 transition-transform transform hover:scale-105"
      >
        <Settings className="w-6 h-6" />
        <span className="text-lg">Settings</span>
      </Link>
    </nav>
  </div>
);

// FilesUploadPage Component with a simple grid view and header
const FilesUploadPage = ({ theme, toggleTheme }) => {
  // Initial sample files
  const [files, setFiles] = useState([
    { name: "Document 1", id: 1 },
    { name: "Document 2", id: 2 },
    { name: "Document 3", id: 3 },
  ]);
  const [dragActive, setDragActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef(null);

  // Function to simulate file upload (via file picker or drag & drop)
  const handleFilesUpload = (uploadedFiles) => {
    if (!uploadedFiles || uploadedFiles.length === 0) return;
    const newFiles = Array.from(uploadedFiles).map((file, index) => ({
      name: file.name,
      id: files.length + index + 1,
    }));
    setFiles((prevFiles) => [...prevFiles, ...newFiles]);
    alert(`${uploadedFiles.length} file(s) uploaded successfully!`);
  };

  const handleFileChange = (event) => {
    handleFilesUpload(event.target.files);
    event.target.value = "";
  };

  // Drag & Drop handlers
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

  // File actions
  const downloadFile = (fileName) => {
    alert(`Initiating download for ${fileName}`);
  };
  const deleteFile = (fileId) => {
    if (window.confirm("Are you sure you want to delete this file?")) {
      setFiles((prevFiles) => prevFiles.filter((file) => file.id !== fileId));
    }
  };
  const createNewFile = () => {
    const newName = window.prompt("Enter new file name:");
    if (newName && newName.trim() !== "") {
      const newId =
        files.length > 0 ? Math.max(...files.map((file) => file.id)) + 1 : 1;
      setFiles((prev) => [...prev, { name: newName.trim(), id: newId }]);
      alert(`New file "${newName.trim()}" created!`);
    }
  };
  const renameFile = (fileId) => {
    const fileToRename = files.find((file) => file.id === fileId);
    if (!fileToRename) return;
    const newName = window.prompt("Enter new file name:", fileToRename.name);
    if (
      newName &&
      newName.trim() !== "" &&
      newName.trim() !== fileToRename.name
    ) {
      setFiles((prev) =>
        prev.map((file) =>
          file.id === fileId ? { ...file, name: newName.trim() } : file
        )
      );
      alert(`File renamed to "${newName.trim()}"!`);
    }
  };

  // Filter files based on the search query
  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 flex-1 flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Files
        </h2>
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => fileInputRef.current.click()}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <UploadCloud className="w-5 h-5" />
            <span>Upload</span>
          </button>
          <button
            onClick={createNewFile}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <FilePlus className="w-5 h-5" />
            <span>New File</span>
          </button>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
          >
            {theme === "Dark" ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
            <span>{theme === "Dark" ? "Light Mode" : "Dark Mode"}</span>
          </button>
          <input
            type="file"
            multiple
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* Files Container (Drag & Drop Zone) */}
      <div
        className="relative flex-1 border border-gray-200 dark:border-gray-700 rounded-lg p-4 overflow-auto"
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {filteredFiles.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400">
            {searchQuery
              ? "No files match your search."
              : "No files uploaded yet."}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                className="bg-white dark:bg-gray-700 rounded-2xl shadow-lg p-6 flex flex-col justify-between transition-transform transform hover:scale-105 hover:shadow-2xl"
              >
                <div className="flex items-center space-x-4 mb-4">
                  <FileText className="w-12 h-12 text-blue-500" />
                  <span className="text-xl font-semibold text-gray-900 dark:text-white">
                    {file.name}
                  </span>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => downloadFile(file.name)}
                    className="text-green-500 hover:text-green-700"
                    title="Download"
                  >
                    <Download className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => renameFile(file.id)}
                    className="text-gray-500 hover:text-gray-700"
                    title="Rename"
                  >
                    <Edit2 className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => deleteFile(file.id)}
                    className="text-red-500 hover:text-red-700"
                    title="Delete"
                  >
                    <Trash2 className="w-6 h-6" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Drag & Drop Overlay */}
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

// SettingsPage (kept simple with theme toggle)
const SettingsPage = ({ theme, toggleTheme }) => (
  <div className="p-6">
    <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-white">
      Settings
    </h2>
    <label className="block text-lg font-medium mb-3 text-gray-900 dark:text-white">
      Theme
    </label>
    <button
      onClick={toggleTheme}
      className="flex items-center gap-3 bg-white dark:bg-gray-700 p-3 rounded-lg shadow-md hover:shadow-lg transition-transform transform hover:scale-105"
    >
      {theme === "Dark" ? (
        <Sun className="w-6 h-6 text-yellow-500" />
      ) : (
        <Moon className="w-6 h-6 text-gray-800" />
      )}
      <span>{theme} Mode</span>
    </button>
  </div>
);

// App Component: manages theme state and routing
const App = () => {
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "Light");

  useEffect(() => {
    // Toggle dark mode on the document root based on theme state.
    document.documentElement.classList.toggle("dark", theme === "Dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "Dark" ? "Light" : "Dark"));
  };

  return (
    <Router>
      <div className="flex h-screen bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800">
        <Sidebar />
        <main className="flex-1 overflow-hidden">
          <Routes>
            <Route
              path="/"
              element={
                <FilesUploadPage theme={theme} toggleTheme={toggleTheme} />
              }
            />
            <Route
              path="/settings"
              element={<SettingsPage theme={theme} toggleTheme={toggleTheme} />}
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;
