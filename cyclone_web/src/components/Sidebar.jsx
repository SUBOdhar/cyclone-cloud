// src/components/Sidebar.jsx
import React from "react";
import { Link } from "react-router-dom";
import { Folder, Image, User, Settings } from "lucide-react";

const Sidebar = () => (
  <div className="w-full sm:w-64 h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white flex flex-col p-6 shadow-lg">
    <h1 className="text-2xl font-bold mb-8 tracking-wide">Cyclone Cloud</h1>
    <nav className="flex flex-col space-y-6">
      <Link
        to="/"
        className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-700 transition-transform transform hover:scale-105"
      >
        <Folder className="w-6 h-6" />
        <span className="text-lg">Files</span>
      </Link>
      <Link
        to="/image"
        className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-700 transition-transform transform hover:scale-105"
      >
        <Image className="w-6 h-6" />
        <span className="text-lg">Images</span>
      </Link>
      <Link
        to="/profile"
        className="flex items-center space-x-4 p-3 rounded-lg hover:bg-gray-700 transition-transform transform hover:scale-105"
      >
        <User className="w-6 h-6" />
        <span className="text-lg">Profile</span>
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

export default React.memo(Sidebar);
