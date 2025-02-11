import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import FilesUploadPage from "./pages/FilesUploadPage";
import ImagesPage from "./pages/ImagesPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";

const App = () => {
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "Light");

  useEffect(() => {
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
              path="/image"
              element={<ImagesPage theme={theme} toggleTheme={toggleTheme} />}
            />
            <Route
              path="/profile"
              element={<ProfilePage theme={theme} toggleTheme={toggleTheme} />}
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
