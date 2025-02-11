import React, { useRef } from "react";
import Topbar from "../components/Topbar";
import { User } from "lucide-react";

const ProfilePage = ({ theme, toggleTheme }) => {
  const dummyRef = useRef(null);
  return (
    <div className="p-6 flex-1 flex flex-col">
      <Topbar
        pageTitle="Profile"
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
      <div className="p-6">
        <div className="bg-white dark:bg-gray-700 rounded-2xl shadow-lg p-6">
          <div className="flex items-center space-x-4">
            <User className="w-16 h-16 text-blue-500" />
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                John Doe
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                john.doe@example.com
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
