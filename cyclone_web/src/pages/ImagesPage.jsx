import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  use,
} from "react";
import Hero from "image-hero";
import Topbar from "../components/Topbar";
import AlertDialog from "../components/AlertDialog"; // Custom AlertDialog component
import {
  X,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  FlipHorizontal,
  FlipVertical,
  Maximize,
  Play,
  Pause,
  Download,
  Share2,
  Heart,
  MoreVertical,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import ImageList from "@mui/material/ImageList";
import ImageListItem from "@mui/material/ImageListItem";
import Box from "@mui/material/Box";
import Cookies from "js-cookie";
import {
  useMediaQuery,
  useTheme,
  MenuItem,
  Menu,
  Tooltip,
  ListItemIcon,
  IconButton,
} from "@mui/material";

const ImagesPage = ({ theme, toggleTheme, toggleDrawer }) => {
  const [images, setImages] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [flipHorizontal, setFlipHorizontal] = useState(false);
  const [flipVertical, setFlipVertical] = useState(false);
  const [loading, setLoading] = useState(false);
  const [slideshow, setSlideshow] = useState(false);
  const [anchorE2, setAnchorE2] = useState(null); // For mobile "More" menu
  const handleClick2 = (event) => setAnchorE2(event.currentTarget);
  const handleClose2 = () => setAnchorE2(null);
  // dummyRef is available if needed for file input operations
  const dummyRef = useRef(null);
  const url = import.meta.env.VITE_url || "";
  const ownerId = Cookies.get("userid");
  const navigate = useNavigate();

  // State to control hero z-index in modal
  const [heroMaxZ, setHeroMaxZ] = useState(false);

  // Handler to set hero z-index to maximum
  const handleHeroClick = useCallback(() => {
    setHeroMaxZ(true);
  }, []);

  // Alert dialog state & helper
  const [alertConfig, setAlertConfig] = useState({
    open: false,
    title: "",
    body: "",
    onOk: null,
  });
  const showAlert = (body, title = "Alert", onOk = null) => {
    setAlertConfig({ open: true, title, body, onOk });
  };

  const handleUnauthorized = useCallback(async () => {
    const res = await fetch(`${url}/api/refresh`, {
      method: "POST",
      mode: "cors",

      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        refreshToken: Cookies.get("refreshToken"),
      }),
    });
    console.log("Logged ");
    const data = await res.json();
    if (data.error === "Token expired") {
      Cookies.remove("loginstat");
      Cookies.remove("userid");
      showAlert(
        "Your session has expired. Please log in again.",
        "Unauthorized"
      );
      navigate("/");
    }
    return data.error === "Token expired";
  }, [url, navigate]);
  useEffect(() => {
    handleUnauthorized();
  }, [url]);

  // Favorites stored in localStorage
  const [favorites, setFavorites] = useState(() => {
    const stored = localStorage.getItem("favorites");
    return stored ? JSON.parse(stored) : [];
  });

  // Fetch images from the API with owner id
  const fetchImages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${url}/api/images`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner_id: ownerId,
          refreshToken: Cookies.get("refreshToken"),
        }),
      });
      if (!res.ok) {
        if (await handleUnauthorized()) return;
        throw new Error("Failed to fetch image");
      }
      const data = await res.json();
      console.log(data);
      if (data.message == "No images found") {
        showAlert("No images found");
        setImages([]);
        return;
      }
      if (
        data.message ==
        "Too many requests from this IP, please try again later after 15 minutes."
      ) {
        showAlert(
          "Too many requests, please try again later after 15 minutes."
        );
        setImages([]);
        setTimeout(fetchImages, 15 * 60 * 1010);
        return;
      }
      setImages(data);
    } catch (error) {
      showAlert("Error fetching images");
    } finally {
      setLoading(false);
    }
  }, [url, ownerId, handleUnauthorized]);

  useEffect(() => {
    fetchImages();
  }, [url, fetchImages]);

  // Filter images based on the search query
  const filteredImages = useMemo(
    () =>
      images.filter((image) =>
        image?.filename?.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [images, searchQuery]
  );
  const hasImages = useMemo(() => {
    return filteredImages.length > 0;
  }, [filteredImages]);
  // Helper to truncate long filenames
  const truncateFileName = useCallback((filename, maxLength = 20) => {
    if (filename.length <= maxLength) return filename;
    const extension = filename.split(".").pop();
    const nameWithoutExtension = filename.slice(
      0,
      filename.length - extension.length - 1
    );
    return `${nameWithoutExtension.slice(
      0,
      maxLength - extension.length - 4
    )}...${extension}`;
  }, []);

  // Helper to reset transformation states
  const resetTransformations = useCallback(() => {
    setRotation(0);
    setZoom(1);
    setFlipHorizontal(false);
    setFlipVertical(false);
    setHeroMaxZ(false); // reset hero z-index when closing modal or resetting transformations
  }, []);

  // Close the modal and reset states
  const closeModal = useCallback(() => {
    setSelectedImageIndex(null);
    resetTransformations();
    setSlideshow(false);
  }, [resetTransformations]);

  // Transformation handlers
  const handleRotate = useCallback(() => setRotation((prev) => prev + 90), []);
  const handleZoomIn = useCallback(
    () => setZoom((prev) => Math.min(prev + 0.1, 3)),
    []
  );
  const handleZoomOut = useCallback(
    () => setZoom((prev) => Math.max(prev - 0.1, 0.5)),
    []
  );
  const handleFlipHorizontal = useCallback(
    () => setFlipHorizontal((prev) => !prev),
    []
  );
  const handleFlipVertical = useCallback(
    () => setFlipVertical((prev) => !prev),
    []
  );
  const handleResetTransform = useCallback(() => {
    resetTransformations();
  }, [resetTransformations]);

  // Navigation handlers to switch images
  const handlePrev = useCallback(() => {
    setSelectedImageIndex((prev) => {
      if (prev > 0) {
        resetTransformations();
        return prev - 1;
      }
      return prev;
    });
  }, [resetTransformations]);

  const handleNext = useCallback(() => {
    setSelectedImageIndex((prev) => {
      if (prev < filteredImages.length - 1) {
        resetTransformations();
        return prev + 1;
      }
      return prev;
    });
  }, [filteredImages.length, resetTransformations]);

  // Helper to handle image click
  const handleImageClick = useCallback(
    (index) => {
      setSelectedImageIndex(index);
      resetTransformations();
    },
    [resetTransformations]
  );

  // Helper to wrap button callbacks with stopPropagation
  const createButtonHandler = useCallback(
    (callback) => (e) => {
      e.stopPropagation();
      callback();
    },
    []
  );

  // Compute the transform style for the modal container
  const transformStyle = useMemo(
    () => ({
      transform: `rotate(${rotation}deg) scale(${zoom}) ${
        flipHorizontal ? "scaleX(-1)" : ""
      } ${flipVertical ? "scaleY(-1)" : ""}`,
      transition: "transform 0.3s ease-in-out",
    }),
    [rotation, zoom, flipHorizontal, flipVertical]
  );

  // Get the current image (if any)
  const currentImage =
    selectedImageIndex !== null ? filteredImages[selectedImageIndex] : null;

  // Slideshow effect: auto-navigate images every 3 seconds
  useEffect(() => {
    let interval;
    if (slideshow && selectedImageIndex !== null) {
      interval = setInterval(() => {
        setSelectedImageIndex((prev) =>
          prev < filteredImages.length - 1 ? prev + 1 : 0
        );
        resetTransformations();
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [
    slideshow,
    selectedImageIndex,
    filteredImages.length,
    resetTransformations,
  ]);

  // Keyboard shortcuts for modal navigation and transformations
  useEffect(() => {
    if (selectedImageIndex !== null) {
      const handleKeyDown = (e) => {
        switch (e.key) {
          case "Escape":
            closeModal();
            break;
          case "ArrowLeft":
            handlePrev();
            break;
          case "ArrowRight":
            handleNext();
            break;
          case "r":
          case "R":
            handleRotate();
            break;
          case "+":
          case "=":
            handleZoomIn();
            break;
          case "-":
            handleZoomOut();
            break;
          case "h":
          case "H":
            handleFlipHorizontal();
            break;
          case "v":
          case "V":
            handleFlipVertical();
            break;
          default:
            break;
        }
      };
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [
    selectedImageIndex,
    closeModal,
    handlePrev,
    handleNext,
    handleRotate,
    handleZoomIn,
    handleZoomOut,
    handleFlipHorizontal,
    handleFlipVertical,
  ]);

  // Download handler
  const handleDownload = useCallback(() => {
    if (currentImage) {
      const link = document.createElement("a");
      link.href = `${url}/images/${currentImage.filename}`;
      link.download = currentImage.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, [currentImage, url]);

  const themes = useTheme();
  const isMobile = useMediaQuery(themes.breakpoints.down("sm"));

  // Share handler: Pass owner_id along with fileId
  const handleShare = async (fileId) => {
    try {
      const res = await fetch(`${url}/gsl`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileId, owner_id: ownerId }),
      });
      const data = await res.json();
      navigator.clipboard.writeText(data.shareableLink);
      showAlert("Share URL copied to clipboard!");
    } catch (error) {
      showAlert("Error sharing file");
    }
  };

  // Fullscreen toggle handler
  const handleToggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement
        .requestFullscreen()
        .catch((err) =>
          showAlert(
            `Error attempting to enable full-screen mode: ${err.message} (${err.name})`
          )
        );
    } else {
      document.exitFullscreen();
    }
  }, []);

  // Toggle favorite for the current image
  const toggleFavorite = useCallback(() => {
    if (currentImage) {
      setFavorites((prev) => {
        const newFavs = prev.includes(currentImage.filename)
          ? prev.filter((f) => f !== currentImage.filename)
          : [...prev, currentImage.filename];
        localStorage.setItem("favorites", JSON.stringify(newFavs));
        return newFavs;
      });
    }
  }, [currentImage]);

  // Image Modal Component (could be moved to its own file for further separation)
  const ImageModal = () => (
    <div className="fixed flex justify-center items-center inset-0 z-10000">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={closeModal}
      />
      {/* Modal content */}
      <div className="relative z-[110]">
        {/* Transformation Controls (Top Left) */}
        {!isMobile && (
          <div className="fixed top-4 left-4 flex items-center space-x-2 z-[120] flex-wrap">
            <button
              className="bg-gray-700 text-white p-2 rounded-full hover:bg-gray-600 focus:outline-none"
              onClick={createButtonHandler(handleRotate)}
              aria-label="Rotate image"
            >
              <RotateCcw />
            </button>
            <button
              className="bg-gray-700 text-white p-2 rounded-full hover:bg-gray-600 focus:outline-none"
              onClick={createButtonHandler(handleZoomIn)}
              aria-label="Zoom in"
            >
              <ZoomIn />
            </button>
            <button
              className="bg-gray-700 text-white p-2 rounded-full hover:bg-gray-600 focus:outline-none"
              onClick={createButtonHandler(handleZoomOut)}
              aria-label="Zoom out"
            >
              <ZoomOut />
            </button>
            <button
              className="bg-gray-700 text-white p-2 rounded-full hover:bg-gray-600 focus:outline-none"
              onClick={createButtonHandler(handleFlipHorizontal)}
              aria-label="Flip horizontally"
            >
              <FlipHorizontal />
            </button>
            <button
              className="bg-gray-700 text-white p-2 rounded-full hover:bg-gray-600 focus:outline-none"
              onClick={createButtonHandler(handleFlipVertical)}
              aria-label="Flip vertically"
            >
              <FlipVertical />
            </button>
            <button
              className="bg-gray-700 text-white p-2 rounded-full hover:bg-gray-600 focus:outline-none"
              onClick={createButtonHandler(handleResetTransform)}
              aria-label="Reset transformation"
            >
              Reset
            </button>
          </div>
        )}
        {/* Utility Controls (Top Right) */}
        <div className="fixed top-4 right-4 flex items-center space-x-2 z-[120] flex-wrap">
          {isMobile ? (
            <>
              <Tooltip title="More">
                <IconButton
                  onClick={handleClick2}
                  variant="contained"
                  size="small"
                  sx={{ ml: 0, boxShadow: 0, padding: 0 }}
                  aria-controls={Boolean(anchorE2) ? "more-menu" : undefined}
                  aria-haspopup="true"
                  aria-expanded={Boolean(anchorE2) ? "true" : undefined}
                >
                  <MoreVertical color="white" />
                </IconButton>
              </Tooltip>
              {/* Only render the menu if the anchor is rendered */}
              {Boolean(anchorE2) && (
                <Menu
                  anchorEl={anchorE2}
                  id="more-menu"
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
                  <MenuItem onClick={createButtonHandler(handleDownload)}>
                    <ListItemIcon>
                      <Download fontSize="small" />
                    </ListItemIcon>
                    Download
                  </MenuItem>
                  <MenuItem
                    onClick={createButtonHandler(() =>
                      handleShare(currentImage.file_id)
                    )}
                  >
                    <ListItemIcon>
                      <Share2 fontSize="small" />
                    </ListItemIcon>
                    Share
                  </MenuItem>
                  <MenuItem
                    onClick={createButtonHandler(handleToggleFullscreen)}
                  >
                    <ListItemIcon>
                      <Maximize fontSize="small" />
                    </ListItemIcon>
                    Fullscreen
                  </MenuItem>
                </Menu>
              )}
            </>
          ) : (
            <>
              <button
                className="bg-gray-700 text-white p-2 rounded-full hover:bg-gray-600 focus:outline-none"
                onClick={createButtonHandler(handleDownload)}
                aria-label="Download image"
              >
                <Download />
              </button>
              <button
                className="bg-gray-700 text-white p-2 rounded-full hover:bg-gray-600 focus:outline-none"
                onClick={createButtonHandler(() =>
                  handleShare(currentImage.file_id)
                )}
                aria-label="Share image"
              >
                <Share2 />
              </button>
              <button
                className="bg-gray-700 text-white p-2 rounded-full hover:bg-gray-600 focus:outline-none"
                onClick={createButtonHandler(handleToggleFullscreen)}
                aria-label="Toggle fullscreen"
              >
                <Maximize />
              </button>
            </>
          )}
          <button
            className="bg-gray-700 text-white p-2 rounded-full hover:bg-gray-600 focus:outline-none"
            onClick={createButtonHandler(() => setSlideshow((prev) => !prev))}
            aria-label={slideshow ? "Stop Slideshow" : "Start Slideshow"}
          >
            {slideshow ? <Pause /> : <Play />}
          </button>
          <button
            className={`p-2 rounded-full focus:outline-none ${
              favorites.includes(currentImage.filename)
                ? "bg-red-500 text-white"
                : "bg-gray-700 text-white hover:bg-gray-600"
            }`}
            onClick={createButtonHandler(toggleFavorite)}
            aria-label="Toggle favorite"
          >
            <Heart />
          </button>
          {/* Close Modal */}
          <button
            className="bg-black text-white p-2 rounded-full hover:bg-red-500 focus:outline-none"
            onClick={createButtonHandler(closeModal)}
            aria-label="Close modal"
          >
            <X />
          </button>
        </div>

        {/* Navigation controls: Previous and Next */}
        <div className="fixed left-4 top-1/2 transform -translate-y-1/2 z-[120]">
          <button
            className="bg-gray-700 text-white p-2 rounded-full hover:bg-gray-600 focus:outline-none disabled:opacity-50"
            onClick={createButtonHandler(handlePrev)}
            disabled={selectedImageIndex === 0}
            aria-label="Previous image"
          >
            <ChevronLeft />
          </button>
        </div>
        <div className="fixed right-4 top-1/2 transform -translate-y-1/2 z-[120]">
          <button
            className="bg-gray-700 text-white p-2 rounded-full hover:bg-gray-600 focus:outline-none disabled:opacity-50"
            onClick={createButtonHandler(handleNext)}
            disabled={selectedImageIndex === filteredImages.length - 1}
            aria-label="Next image"
          >
            <ChevronRight />
          </button>
        </div>

        {/* Centered image container with transform applied */}
        <div className="flex justify-center items-center">
          <div
            className="bg-white dark:bg-gray-800 p-4 rounded-lg relative"
            style={transformStyle}
          >
            {/* When the Hero component is clicked, handleHeroClick is called to set its z-index to max */}
            <Hero
              id={currentImage.file_id}
              style={heroMaxZ ? { zIndex: 10999 } : {}}
            >
              <img
                src={`${url}/file/${ownerId}/${currentImage.filename}`}
                alt={currentImage.filename}
                className="max-w-full object-contain mx-auto"
                style={{ maxHeight: "80vh" }}
                loading="lazy"
              />
            </Hero>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Box position={"relative"}>
      <Topbar
        pageTitle="Images"
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        fileInputRef={dummyRef}
        createNewFile={() => {}}
        toggleTheme={toggleTheme}
        theme={theme}
        handleFileChange={() => {}}
        showSearch
        showUploadActions={false}
        toggleViewMode={() => {}}
        showGridAction={false}
        viewMode={() => {}}
        toggleSidebar={toggleDrawer}
      />
      <div className="p-6 flex-1 flex flex-col">
        <ImageList variant="standard" cols={isMobile ? 2 : 3} gap={8}>
          {loading ? (
            <div className="text-center text-gray-500 dark:text-gray-400">
              Loading images...
            </div>
          ) : !hasImages ? (
            <div className="text-center text-gray-500 dark:text-gray-400">
              {searchQuery
                ? "No images match your search."
                : "No images available."}
            </div>
          ) : (
            filteredImages.map((image, index) => (
              <ImageListItem key={image?.file_id}>
                <Hero
                  id={image.file_id}
                  style={heroMaxZ ? { zIndex: 9999 } : {}}
                  onClick={handleHeroClick}
                >
                  <img
                    src={`${url}/file/${ownerId}/${image.filename}`}
                    alt={truncateFileName(image.filename)}
                    loading="lazy"
                    style={{ borderRadius: 5 }}
                    onClick={() => handleImageClick(index)}
                  />
                </Hero>
              </ImageListItem>
            ))
          )}
        </ImageList>

        {/* Modal for selected image */}
        {currentImage && <ImageModal />}

        {/* Custom Alert Dialog */}
        {alertConfig.open && (
          <AlertDialog
            title={alertConfig.title}
            body={alertConfig.body}
            onOk={() => {
              setAlertConfig({ ...alertConfig, open: false });
              if (alertConfig.onOk) alertConfig.onOk();
            }}
            onCancel={() => setAlertConfig({ ...alertConfig, open: false })}
          />
        )}
      </div>
    </Box>
  );
};

export default ImagesPage;
