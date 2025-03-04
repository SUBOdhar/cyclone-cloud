import React from "react";
import { Link } from "react-router-dom";
import { Folder, Image, User, Settings } from "lucide-react";
import {
  Drawer,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  useMediaQuery,
  useTheme,
  Typography,
} from "@mui/material";

const drawerWidth = 240;

const Sidebar = ({ open, toggleDrawer }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Drawer
      variant={isMobile ? "temporary" : "permanent"}
      anchor="left"
      open={open || !isMobile}
      onClose={isMobile ? toggleDrawer(false) : undefined}
      ModalProps={{ keepMounted: true }}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
          backgroundColor: "#1f2937",
          color: "white",
          position: isMobile ? "fixed" : "relative", // Prevents overlapping on large screens
        },
      }}
    >
      <Toolbar>
        <Typography
          style={{ marginTop: 10 }}
          variant="h5"
          fontFamily={"poppins"}
        >
          Cyclone Cloud
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {[
          { text: "Files", icon: <Folder />, path: "/files" },
          { text: "Images", icon: <Image />, path: "/image" },
          { text: "Profile", icon: <User />, path: "/profile" },
          { text: "Settings", icon: <Settings />, path: "/settings" },
        ].map(({ text, icon, path }) => (
          <ListItem key={text} disablePadding>
            <ListItemButton
              component={Link}
              to={path}
              onClick={isMobile ? toggleDrawer(false) : undefined}
            >
              <ListItemIcon sx={{ color: "white" }}>{icon}</ListItemIcon>
              <ListItemText primary={text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
};

export default Sidebar;
