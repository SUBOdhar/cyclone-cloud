import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { CircularProgress, Box } from "@mui/material"; // Import CircularProgress

export default function ProtectedRoutes({ children, loginStatus }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true); // Add state to manage loading status
  useEffect(() => {
    if (!loginStatus) {
      navigate("/"); // Redirect to home or login page if not logged in
    } else {
      setLoading(false); // Set loading to false when the loginStatus is true
    }
  }, [loginStatus, navigate]);

  if (loading) {
    // Show a loading spinner while checking the login status
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
      >
        <CircularProgress /> {/* Material UI loading spinner */}
      </Box>
    );
  }

  // If logged in, render the children components
  return children;
}
