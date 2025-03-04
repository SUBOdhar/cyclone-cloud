import React, { useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  InputBase,
  MenuItem,
  Button,
  Avatar,
  Box,
  Tooltip,
  ListItemIcon,
  Divider,
  InputAdornment,
  TextField,
} from "@mui/material";
import Menu from "@mui/material/Menu";
import Logout from "@mui/icons-material/Logout";
import {
  Upload,
  Add,
  ViewModule,
  ViewList,
  PersonAdd,
  Settings,
} from "@mui/icons-material";
import { Moon, Search, Sun, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
export default function Topbar({
  pageTitle,
  searchQuery,
  setSearchQuery,
  fileInputRef,
  createNewFile,
  toggleTheme,
  theme,
  handleFileChange,
  showSearch = false,
  showUploadActions = false,
  toggleViewMode,
  showGridAction = false,
  viewMode,
  uploading = false,
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [displaySearch, setDisplaySearch] = useState(false);
  const open = Boolean(anchorEl);
  const navigate = useNavigate();

  const handleClick = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleLogout = () => {
    localStorage.removeItem("loginstat");
    handleClose();
    navigate("/");
  };

  const toggleSearch = () => setDisplaySearch((prev) => !prev);

  return (
    <AppBar
      position="static"
      sx={{
        background: "transparent",
        color: "text.white",
        boxShadow: 0,
      }}
    >
      <Toolbar
        sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}
      >
        {/* Page Title */}
        <Typography variant="h6" fontWeight="bold">
          {pageTitle}
        </Typography>

        {/* Actions */}
        <Box display="flex" gap={1} alignItems="center">
          {showUploadActions && (
            <Button
              variant="contained"
              color="primary"
              onClick={() => fileInputRef.current.click()}
              disabled={uploading}
              startIcon={<Upload />}
            >
              Upload
            </Button>
          )}

          {/* Search Box */}
          {showSearch && (
            <>
              {displaySearch ? (
                <TextField
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  sx={{
                    input: {
                      color: "white", // Change the text color
                    },
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 5,
                      height: 50,
                      width: 200,
                      "& fieldset": {
                        borderColor: "white", // Change the border color
                      },
                      "&:hover fieldset": {
                        borderColor: "lightgray", // Change border color on hover
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "white", // Change the border color when focused
                      },
                    },
                  }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <>
                          <InputAdornment position="start">
                            <Search color="white" />
                          </InputAdornment>
                        </>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={toggleSearch}>
                            <X color="white" />
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
              ) : (
                <IconButton color="inherit" onClick={toggleSearch}>
                  <Search />
                </IconButton>
              )}
            </>
          )}

          {/* Theme Toggle */}
          <IconButton onClick={toggleTheme} color="inherit">
            {theme === "Dark" ? <Sun /> : <Moon />}
          </IconButton>

          {/* Toggle Grid/List View */}
          {showGridAction && (
            <IconButton
              onClick={toggleViewMode}
              title="Toggle View Mode"
              color="inherit"
            >
              {viewMode === "grid" ? <ViewList /> : <ViewModule />}
            </IconButton>
          )}

          {/* Profile Menu */}
          <Tooltip title="Account settings">
            <IconButton
              onClick={handleClick}
              size="small"
              sx={{ ml: 2 }}
              aria-controls={open ? "account-menu" : undefined}
              aria-haspopup="true"
              aria-expanded={open ? "true" : undefined}
            >
              <Avatar sx={{ width: 32, height: 32 }}>M</Avatar>
            </IconButton>
          </Tooltip>
        </Box>

        {/* Account Menu */}
        <Menu
          anchorEl={anchorEl}
          id="account-menu"
          open={open}
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
          {/* <MenuItem onClick={handleClose}>
            <Avatar /> Profile
          </MenuItem>
          <MenuItem onClick={handleClose}>
            <Avatar /> My account
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleClose}>
            <ListItemIcon>
              <PersonAdd fontSize="small" />
            </ListItemIcon>
            Add another account
          </MenuItem> */}
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

        {/* Hidden File Input */}
        {showUploadActions && (
          <input
            type="file"
            multiple
            ref={fileInputRef}
            className="hidden"
            onChange={handleFileChange}
          />
        )}
      </Toolbar>
    </AppBar>
  );
}
