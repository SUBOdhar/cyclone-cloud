import React, { useRef } from "react";
import Topbar from "../components/Topbar";
import { Sun, Moon } from "lucide-react";

const SettingsPage = ({ theme, toggleTheme }) => {
  const dummyRef = useRef(null);
  return (
    <>
      <Topbar
        pageTitle="Settings"
        searchQuery=""
        setSearchQuery={() => {}}
        fileInputRef={dummyRef}
        createNewFile={() => {}}
        toggleTheme={toggleTheme}
        theme={theme}
        handleFileChange={() => {}}
        showSearch={false}
        showUploadActions={false}
        toggleViewMode={() => {}}
        showGridAction={false}
        viewMode={() => {}}
      />
      <div className="p-6 flex-1 flex flex-col">
        <div className="p-6">
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
      </div>
    </>
  );
};

export default SettingsPage;
