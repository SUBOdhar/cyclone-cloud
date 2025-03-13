import React, { useState, useEffect, useCallback } from "react";
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
  ListItemIcon,
  ListItemText,
  Divider,
  Button,
  Container,
  Grid,
  TextField,
  IconButton,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import EmailIcon from "@mui/icons-material/Email";
import EditIcon from "@mui/icons-material/Edit";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import Topbar from "../components/Topbar";
import { useNavigate } from "react-router-dom";
import { deleteCookie, getCookie } from "../components/Cookies";

const ProfilePage = ({ theme, toggleTheme, toggleDrawer }) => {
  const [popperOpen, setPopperOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");

  const navigate = useNavigate();
  const url = import.meta.env.VITE_url || "";
  const userId = getCookie("userid");

  const muiTheme = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down("sm"));

  useEffect(() => {
    const userName = getCookie("username");
    const userEmail = getCookie("useremail");
    if (userName) {
      setUserName(userName);
    }
    if (userEmail) {
      setUserEmail(userEmail);
    }
  }, []);

  const handleLogout = async () => {
    await fetch(`${url}/api/logout`, {
      method: "POST",
      credentials: "include",
    });
    deleteCookie("loginstat");
    deleteCookie("userid");
    navigate("/");
  };
  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  const handleSave = async () => {
    // Here you would typically send the updated data to your backend
    console.log("Saving:", { userName, userEmail });
    setIsEditing(false); // Exit edit mode
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleAvatarClick = (event) => {
    setAnchorEl(event.currentTarget);
    setPopperOpen((prev) => !prev);
  };

  const handleClickAway = () => {
    setPopperOpen(false);
  };

  return (
    <Box position={"relative"} sx={{ minHeight: "100vh" }}>
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
        toggleSidebar={toggleDrawer}
      />
      <Container
        maxWidth="sm"
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "calc(100vh - 64px)", // Adjust based on Topbar height
        }}
      >
        <Card sx={{ width: "100%" }}>
          <CardContent>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                mb: 3,
              }}
            >
              <Avatar
                sx={{
                  width: 100,
                  height: 100,
                  bgcolor: "primary.main",
                  cursor: "pointer",
                }}
                onClick={handleAvatarClick}
              >
                <PersonIcon sx={{ fontSize: 60 }} />
              </Avatar>
              <Typography variant="h5" component="div" mt={1}>
                {isEditing ? (
                  <TextField
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    label="Name"
                    fullWidth
                  />
                ) : (
                  userName
                )}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {isEditing ? (
                  <TextField
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    label="Email"
                    fullWidth
                    type="email"
                  />
                ) : (
                  userEmail
                )}
              </Typography>
            </Box>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
              {!isEditing && (
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={handleEditToggle}
                  color="primary"
                  size={isMobile ? "small" : "medium"}
                >
                  Edit Profile
                </Button>
              )}
              {isEditing && (
                <>
                  <Button
                    variant="contained"
                    onClick={handleSave}
                    color="primary"
                    size={isMobile ? "small" : "medium"}
                  >
                    Save
                  </Button>
                  <Button
                    onClick={handleCancel}
                    color="secondary"
                    size={isMobile ? "small" : "medium"}
                  >
                    Cancel
                  </Button>
                </>
              )}
            </Box>
          </CardContent>
        </Card>
      </Container>
      <Popper open={popperOpen} anchorEl={anchorEl} placement="bottom-end">
        <ClickAwayListener onClickAway={handleClickAway}>
          <Paper sx={{ width: 200 }}>
            <List>
              <ListItem disablePadding>
                <ListItemButton onClick={() => alert("View Profile clicked")}>
                  <ListItemIcon>
                    <PersonIcon />
                  </ListItemIcon>
                  <ListItemText primary="View Profile" />
                </ListItemButton>
              </ListItem>

              <ListItem disablePadding>
                <ListItemButton onClick={() => handleLogout()}>
                  <ListItemIcon>
                    <ExitToAppIcon />
                  </ListItemIcon>
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
