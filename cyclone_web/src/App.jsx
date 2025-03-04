import React, { useState, useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import FilesUploadPage from "./pages/FilesUploadPage";
import ImagesPage from "./pages/ImagesPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import SharePage from "./pages/SharedPhotoPage";
import SignIn from "./pages/loginAndRegisterPage";
import ProtectedRoutes from "./components/ProtectedRoutes";
import NotFoundPage from "./pages/NotFoundPage"; // Import the NotFoundPage component

const App = () => {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "Light"
  );
  const location = useLocation(); // Get the current path
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const loginStat =
    localStorage.getItem("loginstat") == "true" ? true : false || false;
  console.log(loginStat);

  const toggleDrawer = (open) => () => {
    setIsDrawerOpen(open);
  };
  const [user, setUser] = useState({ username: "", useremail: "", userid: "" });
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "Dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "Dark" ? "Light" : "Dark"));
  };

  // Define valid routes where the sidebar should be shown
  const validPaths = ["/files", "/image", "/profile", "/settings"];

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800">
      {/* Only show Sidebar if the current route is in the validPaths array */}
      {validPaths.includes(location.pathname) && (
        <Sidebar open={isDrawerOpen} toggleDrawer={toggleDrawer} />
      )}
      <main className="flex-1 overflow-auto p-4">
        <Routes>
          <Route path="/" element={<SignIn />} />
          <Route
            path="/files"
            element={
              <ProtectedRoutes loginStatus={loginStat}>
                <FilesUploadPage theme={theme} toggleTheme={toggleTheme} />
              </ProtectedRoutes>
            }
          />
          <Route
            path="/image"
            element={
              <ProtectedRoutes loginStatus={loginStat}>
                <ImagesPage theme={theme} toggleTheme={toggleTheme} />
              </ProtectedRoutes>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoutes loginStatus={loginStat}>
                <ProfilePage theme={theme} toggleTheme={toggleTheme} />
              </ProtectedRoutes>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoutes loginStatus={loginStat}>
                <SettingsPage theme={theme} toggleTheme={toggleTheme} />
              </ProtectedRoutes>
            }
          />
          <Route path="/shared/:token" element={<SharePage />} />

          {/* Catch-all Route for undefined paths */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
