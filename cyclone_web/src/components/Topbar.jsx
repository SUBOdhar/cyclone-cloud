import React, { useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  MenuItem,
  Button,
  Avatar,
  Box,
  Tooltip,
  ListItemIcon,
  InputAdornment,
  useMediaQuery,
  useTheme,
  TextField,
  IconButton,
  Menu,
} from "@mui/material";
import MoreVert from "@mui/icons-material/MoreVert";
import Logout from "@mui/icons-material/Logout";
import { Upload, ViewModule, ViewList, Settings } from "@mui/icons-material";
import { AlignJustify, Folder, Moon, Plus, Sun, X, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";

export default function Topbar({
  pageTitle,
  searchQuery,
  setSearchQuery,
  fileInputRef,
  toggleTheme,
  theme,
  handleFileChange,
  showSearch = false,
  showUploadActions = false,
  toggleViewMode,
  showGridAction = false,
  viewMode,
  uploading = false,
  showNewButton = true,
  toggleSidebar,
  currentFolder = "",
}) {
  const [anchorEl, setAnchorEl] = useState(null); // For account menu (desktop)
  const [anchorE2, setAnchorE2] = useState(null); // For "New" menu (desktop)
  const [displaySearch, setDisplaySearch] = useState(false); // For inline search (desktop)
  const [mobileMenuAnchorEl, setMobileMenuAnchorEl] = useState(null);
  const isMobileMenuOpen = Boolean(mobileMenuAnchorEl);

  const navigate = useNavigate();
  const url = import.meta.env.VITE_url || "";
  const themes = useTheme();
  const isMobile = useMediaQuery(themes.breakpoints.down("sm"));

  // Handlers for the desktop account and new menus
  const handleClick = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);
  const handleClick2 = (event) => setAnchorE2(event.currentTarget);
  const handleClose2 = () => setAnchorE2(null);

  // Mobile menu handlers
  const handleMobileMenuOpen = (event) =>
    setMobileMenuAnchorEl(event.currentTarget);
  const handleMobileMenuClose = () => setMobileMenuAnchorEl(null);

  // New Folder creation handler
  const handelCreateNewFolder = async (cf) => {
    const newFolder = prompt("Enter the new folder name:");
    if (!newFolder) return;
    try {
      const res = await fetch(`${url}/api/create-folder`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentFolder: cf,
          refreshToken: Cookies.get("refreshToken"),
          newFolder: newFolder,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("Folder created successfully at: " + data.folderPath);
      } else {
        alert("Error: " + data.error);
      }
    } catch (error) {
      alert("Error creating folder: " + error.message);
    }
  };

  const handleLogout = async () => {
    await fetch(`${url}/api/logout`, {
      method: "POST",
      credentials: "include",
    });
    Cookies.remove("loginstat");
    navigate("/");
  };
  const username = Cookies.get("username");
  const toggleSearch = () => setDisplaySearch((prev) => !prev);

  // Render the mobile version if on a small screen.
  if (isMobile) {
    return (
      <>
        <AppBar
          position="static"
          sx={{
            background: "transparent",
            boxShadow: 0,
            color: "text.white",
          }}
        >
          <Toolbar
            sx={{ display: "flex", justifyContent: "space-between", px: 1 }}
          >
            <Box display="flex" alignItems="center" gap={1}>
              <IconButton onClick={toggleSidebar} sx={{ p: 0 }}>
                <AlignJustify color="white" />
              </IconButton>
              <Typography variant="subtitle1" fontWeight="bold">
                {pageTitle}
              </Typography>
            </Box>
            <IconButton
              onClick={handleMobileMenuOpen}
              color="inherit"
              size="small"
            >
              <MoreVert />
            </IconButton>
          </Toolbar>
          {/* Optional: Render mobile search as a full–width bar */}
          {showSearch && displaySearch && (
            <Box sx={{ p: 1 }}>
              <TextField
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{
                  input: {
                    color: "white",
                  },
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 5,

                    "& fieldset": {
                      borderColor: "white",
                    },
                    "&:hover fieldset": {
                      borderColor: "lightgray",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: "white",
                    },
                  },
                }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search color="white" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <Button onClick={toggleSearch}>
                          <X color="white" />
                        </Button>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Box>
          )}
        </AppBar>
        {/* Mobile Overflow Menu */}
        <Menu
          anchorEl={mobileMenuAnchorEl}
          open={isMobileMenuOpen}
          onClose={handleMobileMenuClose}
          anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
          transformOrigin={{ horizontal: "right", vertical: "top" }}
          sx={{ mt: 1 }}
        >
          {showUploadActions && (
            <MenuItem
              onClick={() => {
                fileInputRef.current.click();
                handleMobileMenuClose();
              }}
            >
              <ListItemIcon>
                <Upload fontSize="small" />
              </ListItemIcon>
              Upload
            </MenuItem>
          )}
          {showNewButton && (
            <MenuItem
              onClick={() => {
                handelCreateNewFolder(currentFolder);
                handleMobileMenuClose();
              }}
            >
              <ListItemIcon>
                <Folder fontSize="small" />
              </ListItemIcon>
              New Folder
            </MenuItem>
          )}
          {showSearch && (
            <MenuItem
              onClick={() => {
                toggleSearch();
                handleMobileMenuClose();
              }}
            >
              <ListItemIcon>
                <Search color="gray" fontSize="small" />
              </ListItemIcon>
              Search
            </MenuItem>
          )}
          <MenuItem
            onClick={() => {
              toggleTheme();
              handleMobileMenuClose();
            }}
          >
            <ListItemIcon>
              {theme === "Dark" ? (
                <Sun fontSize="small" />
              ) : (
                <Moon fontSize="small" />
              )}
            </ListItemIcon>
            Toggle Theme
          </MenuItem>
          {showGridAction && (
            <MenuItem
              onClick={() => {
                toggleViewMode();
                handleMobileMenuClose();
              }}
            >
              <ListItemIcon>
                {viewMode === "grid" ? (
                  <ViewList fontSize="small" />
                ) : (
                  <ViewModule fontSize="small" />
                )}
              </ListItemIcon>
              Toggle View
            </MenuItem>
          )}
          <MenuItem
            onClick={() => {
              navigate("/settings");
              handleMobileMenuClose();
            }}
          >
            <ListItemIcon>
              <Settings fontSize="small" />
            </ListItemIcon>
            Settings
          </MenuItem>
          <MenuItem
            onClick={() => {
              handleLogout();
              handleMobileMenuClose();
            }}
          >
            <ListItemIcon>
              <Logout fontSize="small" />
            </ListItemIcon>
            Logout
          </MenuItem>
        </Menu>
        {showUploadActions && (
          <input
            type="file"
            multiple
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileChange}
          />
        )}
      </>
    );
  }

  // Desktop version (unchanged from previous implementation)
  return (
    <AppBar
      position="static"
      sx={{
        background: "transparent",
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        overflow: "hidden",
        color: "text.white",
        boxShadow: 0,
      }}
    >
      <Box display="flex" alignItems="center" gap={1}>
        <Typography variant="h6" fontWeight="bold">
          {pageTitle}
        </Typography>
      </Box>
      <Box display="flex" gap={1} alignItems="center">
        {showUploadActions && (
          <Button
            variant="contained"
            color="primary"
            onClick={() => fileInputRef.current.click()}
            disabled={uploading}
            startIcon={<Upload />}
            size="medium"
          >
            Upload
          </Button>
        )}
        {showNewButton && (
          <>
            <Tooltip title="New">
              <Button
                onClick={handleClick2}
                variant="contained"
                color="success"
                size="small"
                startIcon={<Plus />}
                sx={{ ml: 2 }}
                aria-controls={Boolean(anchorE2) ? "new-menu" : undefined}
                aria-haspopup="true"
                aria-expanded={Boolean(anchorE2) ? "true" : undefined}
              >
                New
              </Button>
            </Tooltip>
            <Menu
              anchorEl={anchorE2}
              id="new-menu"
              open={Boolean(anchorE2)}
              onClose={handleClose2}
              onClick={handleClose2}
              slotProps={{
                paper: {
                  elevation: 0,
                  sx: {
                    overflow: "visible",
                    filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.32))",
                    mt: 1.5,
                    "& .MuiAvatar-root": {
                      width: 32,
                      height: 32,
                      ml: -0.5,
                      mr: 1,
                    },
                    "&::before": {
                      content: '""',
                      display: "block",
                      position: "absolute",
                      top: 0,
                      right: 14,
                      width: 10,
                      height: 10,
                      bgcolor: "background.paper",
                      transform: "translateY(-50%) rotate(45deg)",
                      zIndex: 0,
                    },
                  },
                },
              }}
              transformOrigin={{ horizontal: "right", vertical: "top" }}
              anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
            >
              <MenuItem onClick={() => handelCreateNewFolder(currentFolder)}>
                <ListItemIcon>
                  <Folder fontSize="small" />
                </ListItemIcon>
                New Folder
              </MenuItem>
            </Menu>
          </>
        )}
        {showSearch && (
          <>
            {displaySearch ? (
              <TextField
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{
                  input: {
                    color: "white",
                  },
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 5,
                    height: 50,
                    width: 200,
                    "& fieldset": {
                      borderColor: "white",
                    },
                    "&:hover fieldset": {
                      borderColor: "lightgray",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: "white",
                    },
                  },
                }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search color="white" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <Button onClick={toggleSearch}>
                          <X color="white" />
                        </Button>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            ) : (
              <IconButton onClick={toggleSearch} color="inherit" size="small">
                <Search />
              </IconButton>
            )}
          </>
        )}
        <IconButton onClick={toggleTheme} color="inherit" size="small">
          {theme === "Dark" ? <Sun /> : <Moon />}
        </IconButton>
        {showGridAction && (
          <IconButton
            onClick={toggleViewMode}
            title="Toggle View Mode"
            color="inherit"
            size="small"
          >
            {viewMode === "grid" ? <ViewList /> : <ViewModule />}
          </IconButton>
        )}
        <Tooltip title="Account settings">
          <IconButton
            onClick={handleClick}
            size="small"
            sx={{ ml: 2 }}
            aria-controls={Boolean(anchorEl) ? "account-menu" : undefined}
            aria-haspopup="true"
            aria-expanded={Boolean(anchorEl) ? "true" : undefined}
          >
            <Avatar sx={{ width: 32, height: 32 }}>
              {username.charAt(0).toUpperCase()}
            </Avatar>
          </IconButton>
        </Tooltip>
      </Box>
      <Menu
        anchorEl={anchorEl}
        id="account-menu"
        open={Boolean(anchorEl)}
        onClose={handleClose}
        onClick={handleClose}
        slotProps={{
          paper: {
            elevation: 0,
            sx: {
              overflow: "visible",
              filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.32))",
              mt: 1.5,
              "& .MuiAvatar-root": { width: 32, height: 32, ml: -0.5, mr: 1 },
              "&::before": {
                content: '""',
                display: "block",
                position: "absolute",
                top: 0,
                right: 14,
                width: 10,
                height: 10,
                bgcolor: "background.paper",
                transform: "translateY(-50%) rotate(45deg)",
                zIndex: 0,
              },
            },
          },
        }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        <MenuItem
          onClick={() => {
            handleClose();
            navigate("/settings");
          }}
        >
          <ListItemIcon>
            <Settings fontSize="small" />
          </ListItemIcon>
          Settings
        </MenuItem>
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <Logout fontSize="small" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>
      {showUploadActions && (
        <input
          type="file"
          multiple
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileChange}
        />
      )}
    </AppBar>
  );
}
