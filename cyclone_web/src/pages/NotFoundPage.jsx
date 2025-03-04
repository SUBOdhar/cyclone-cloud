// NotFoundPage.js
import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@mui/material";

const NotFoundPage = () => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        textAlign: "center",

        color: "white",
      }}
      className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800"
    >
      <h1 style={{ fontSize: "6rem", margin: 0 }}>404</h1>
      <p style={{ fontSize: "1.5rem", margin: "10px 0" }}>
        Oops! The page you're looking for doesn't exist.
      </p>
      <p style={{ marginBottom: "30px" }}>
        It seems we can't find the page you're looking for.
      </p>

      <Button
        variant="contained"
        color="primary"
        size="large"
        component={Link}
        to="/"
        style={{
          fontSize: "1rem",
          padding: "10px 20px",
          textDecoration: "none",
        }}
      >
        Go to Home
      </Button>
    </div>
  );
};

export default NotFoundPage;
