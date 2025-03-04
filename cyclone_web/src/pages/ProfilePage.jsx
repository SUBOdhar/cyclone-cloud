import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Avatar,
  Typography,
  Popper,
  Paper,
  ClickAwayListener,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import Topbar from "../components/Topbar";
import { useNavigate } from "react-router-dom";

const ProfilePage = ({ theme, toggleTheme }) => {
  // Popper state and anchor element
  const [popperOpen, setPopperOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();

  // Toggle Popper on Avatar click
  const handleAvatarClick = (event) => {
    setAnchorEl(event.currentTarget);
    setPopperOpen((prev) => !prev);
  };
  const url = import.meta.env.VITE_url || "";

  const handleLogout = async () => {
    await fetch(`${url}/api/logout`, {
      method: "POST",
      credentials: "include",
    });
    localStorage.setItem("loginstat", false);
    navigate("/");
  };

  // Close Popper when clicking outside
  const handleClickAway = () => {
    setPopperOpen(false);
  };

  return (
    <Box position={"relative"}>
      <Topbar
        pageTitle="Profile"
        searchQuery=""
        setSearchQuery={() => {}}
        fileInputRef={null}
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
      <Box
        sx={{
          p: 2,
          flexGrow: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Card sx={{ maxWidth: 500, width: "100%", p: 2 }}>
          <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                bgcolor: "primary.main",
                cursor: "pointer",
              }}
              onClick={handleAvatarClick}
            >
              <PersonIcon sx={{ fontSize: 40 }} />
            </Avatar>
            <Box>
              <Typography variant="h5" component="div">
                John Doe
              </Typography>
              <Typography variant="body2" color="text.secondary">
                john.doe@example.com
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
      <Popper open={popperOpen} anchorEl={anchorEl} placement="bottom-start">
        <ClickAwayListener onClickAway={handleClickAway}>
          <Paper sx={{ p: 1, width: 200 }}>
            <List>
              <ListItem disablePadding>
                <ListItemButton onClick={() => alert("View Profile clicked")}>
                  <ListItemText primary="View Profile" />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton onClick={() => alert("Edit Profile clicked")}>
                  <ListItemText primary="Edit Profile" />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton onClick={() => handleLogout()}>
                  <ListItemText primary="Logout" />
                </ListItemButton>
              </ListItem>
            </List>
          </Paper>
        </ClickAwayListener>
      </Popper>
    </Box>
  );
};

export default ProfilePage;
