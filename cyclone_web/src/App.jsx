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
import NotFoundPage from "./pages/NotFoundPage";
import Cookies from "js-cookie";

const App = () => {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("theme") || "Light"
  );
  const location = useLocation();
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const loginStat = Cookies.get("loginstat") === "true";
  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };
  const [user, setUser] = useState({ username: "", useremail: "", userid: "" });
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "Dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "Dark" ? "Light" : "Dark"));
  };

  const validPaths = [
    "/files/:folderPath?",
    "/files",
    "/image",
    "/profile",
    "/settings",
  ];

  const shouldShowSidebar = validPaths.some((path) => {
    if (path.endsWith("?")) {
      const basePath = path.slice(0, -2);
      return location.pathname.startsWith(basePath);
    }
    return location.pathname === path;
  });

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800">
      {shouldShowSidebar && (
        <Sidebar open={isDrawerOpen} toggleDrawer={toggleDrawer} />
      )}
      <main className="flex-1 overflow-auto p-4">
        <Routes>
          <Route path="/" element={<SignIn />} />
          <Route
            path="/files/:folderPath?"
            element={
              <ProtectedRoutes loginStatus={loginStat}>
                <FilesUploadPage
                  theme={theme}
                  toggleTheme={toggleTheme}
                  toggleDrawer={toggleDrawer}
                />
              </ProtectedRoutes>
            }
          />
          <Route
            path="/files"
            element={
              <ProtectedRoutes loginStatus={loginStat}>
                <FilesUploadPage
                  theme={theme}
                  toggleTheme={toggleTheme}
                  toggleDrawer={toggleDrawer}
                />
              </ProtectedRoutes>
            }
          />
          <Route
            path="/image"
            element={
              <ProtectedRoutes loginStatus={loginStat}>
                <ImagesPage
                  theme={theme}
                  toggleTheme={toggleTheme}
                  toggleDrawer={toggleDrawer}
                />
              </ProtectedRoutes>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoutes loginStatus={loginStat}>
                <ProfilePage
                  theme={theme}
                  toggleTheme={toggleTheme}
                  toggleDrawer={toggleDrawer}
                />
              </ProtectedRoutes>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoutes loginStatus={loginStat}>
                <SettingsPage
                  theme={theme}
                  toggleTheme={toggleTheme}
                  toggleDrawer={toggleDrawer}
                />
              </ProtectedRoutes>
            }
          />
          <Route path="/shared/:token" element={<SharePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
