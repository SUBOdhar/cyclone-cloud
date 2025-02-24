import React, { Children } from "react";
import { Link } from "react-router-dom";
import { UploadCloud, FilePlus, Moon, Sun } from "lucide-react";

const Topbar = (
  {
    pageTitle,
    searchQuery,
    setSearchQuery,
    fileInputRef,
    createNewFile,
    toggleTheme,
    theme,
    handleFileChange,
    showSearch = false,
    showUploadActions = false,
    toggleViewMode,
    showGridAction = false,
    viewMode,
    uploading = false,
  },
  Children
) => (
  <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-4">
    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
      {pageTitle}
    </h2>
    <div className="flex flex-col sm:flex-row items-center gap-2">
      {showSearch && (
        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-white text-white"
        />
      )}
      {showUploadActions && (
        <>
          {console.log(uploading)}

          <button
            disabled={uploading}
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
        </>
      )}
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
      {showUploadActions && (
        <input
          type="file"
          multiple
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileChange}
        />
      )}
      {showGridAction && (
        <button
          onClick={toggleViewMode}
          className="flex items-center gap-2 bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
          title="Toggle View Mode"
        >
          {viewMode === "grid" ? "List View" : "Grid View"}
        </button>
      )}
      <Link
        to="/profile"
        className="flex items-center gap-2 bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors"
      >
        <img
          src="https://plus.unsplash.com/premium_photo-1671656349322-41de944d259b?q=80&w=1887&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
          alt="User Profile"
          className="w-8 h-8 rounded-full object-cover"
        />
      </Link>
    </div>
  </div>
);

export default Topbar;
