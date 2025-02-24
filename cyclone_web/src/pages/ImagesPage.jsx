import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
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
} from "lucide-react";

const ImagesPage = ({ theme, toggleTheme }) => {
  const [images, setImages] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  // Store the selected image index instead of its filename
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [flipHorizontal, setFlipHorizontal] = useState(false);
  const [flipVertical, setFlipVertical] = useState(false);
  const [loading, setLoading] = useState(false);
  const [slideshow, setSlideshow] = useState(false);
  const dummyRef = useRef(null);
  const url = import.meta.env.VITE_url || "";

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

  // Favorites stored in localStorage
  const [favorites, setFavorites] = useState(() => {
    const stored = localStorage.getItem("favorites");
    return stored ? JSON.parse(stored) : [];
  });

  // Fetch images from the API
  const fetchImages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${url}/api/images`);
      if (!res.ok) throw new Error("Failed to fetch images");
      const data = await res.json();
      setImages(data);
    } catch (error) {
      console.error(error);
      showAlert("Error fetching images");
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  // Filter images based on the search query
  const filteredImages = useMemo(
    () =>
      images.filter((image) =>
        image.filename.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [images, searchQuery]
  );

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
        setSelectedImageIndex(
          (prev) => (prev < filteredImages.length - 1 ? prev + 1 : 0) // Loop back to first image
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
        if (e.key === "Escape") {
          closeModal();
        } else if (e.key === "ArrowLeft") {
          handlePrev();
        } else if (e.key === "ArrowRight") {
          handleNext();
        } else if (e.key.toLowerCase() === "r") {
          handleRotate();
        } else if (e.key === "+" || e.key === "=") {
          handleZoomIn();
        } else if (e.key === "-") {
          handleZoomOut();
        } else if (e.key.toLowerCase() === "h") {
          handleFlipHorizontal();
        } else if (e.key.toLowerCase() === "v") {
          handleFlipVertical();
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

  // Share handler (POST request returns a shareable link)
  const handleShare = async (fileId) => {
    try {
      const res = await fetch(`${url}/gsl`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileId }),
      });
      const data = await res.json();
      navigator.clipboard.writeText(data.shareableLink);
      showAlert("Share URL copied to clipboard!");
    } catch (error) {
      console.error("Error sharing file:", error);
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
        let newFavs;
        if (prev.includes(currentImage.filename)) {
          newFavs = prev.filter((f) => f !== currentImage.filename);
        } else {
          newFavs = [...prev, currentImage.filename];
        }
        localStorage.setItem("favorites", JSON.stringify(newFavs));
        return newFavs;
      });
    }
  }, [currentImage]);

  // Separate Modal component for better readability
  const ImageModal = () => (
    <div className="fixed flex justify-center items-center inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={closeModal}
      />
      {/* Modal content */}
      <div className="relative z-[110]">
        {/* Transformation Controls (Top Left) */}
        <div className="fixed top-4 left-4 flex items-center space-x-2 z-[120] flex-wrap">
          <button
            className="bg-gray-700 text-white p-2 rounded-full hover:bg-gray-600 focus:outline-none"
            onClick={(e) => {
              e.stopPropagation();
              handleRotate();
            }}
            aria-label="Rotate image"
          >
            <RotateCcw />
          </button>
          <button
            className="bg-gray-700 text-white p-2 rounded-full hover:bg-gray-600 focus:outline-none"
            onClick={(e) => {
              e.stopPropagation();
              handleZoomIn();
            }}
            aria-label="Zoom in"
          >
            <ZoomIn />
          </button>
          <button
            className="bg-gray-700 text-white p-2 rounded-full hover:bg-gray-600 focus:outline-none"
            onClick={(e) => {
              e.stopPropagation();
              handleZoomOut();
            }}
            aria-label="Zoom out"
          >
            <ZoomOut />
          </button>
          <button
            className="bg-gray-700 text-white p-2 rounded-full hover:bg-gray-600 focus:outline-none"
            onClick={(e) => {
              e.stopPropagation();
              handleFlipHorizontal();
            }}
            aria-label="Flip horizontally"
          >
            <FlipHorizontal />
          </button>
          <button
            className="bg-gray-700 text-white p-2 rounded-full hover:bg-gray-600 focus:outline-none"
            onClick={(e) => {
              e.stopPropagation();
              handleFlipVertical();
            }}
            aria-label="Flip vertically"
          >
            <FlipVertical />
          </button>
          <button
            className="bg-gray-700 text-white p-2 rounded-full hover:bg-gray-600 focus:outline-none"
            onClick={(e) => {
              e.stopPropagation();
              handleResetTransform();
            }}
            aria-label="Reset transformation"
          >
            Reset
          </button>
        </div>

        {/* Utility Controls (Top Right) */}
        <div className="fixed top-4 right-4 flex items-center space-x-2 z-[120] flex-wrap">
          <button
            className="bg-gray-700 text-white p-2 rounded-full hover:bg-gray-600 focus:outline-none"
            onClick={(e) => {
              e.stopPropagation();
              handleDownload();
            }}
            aria-label="Download image"
          >
            <Download />
          </button>
          <button
            className="bg-gray-700 text-white p-2 rounded-full hover:bg-gray-600 focus:outline-none"
            onClick={(e) => {
              e.stopPropagation();
              handleShare(currentImage.id);
            }}
            aria-label="Share image"
          >
            <Share2 />
          </button>
          <button
            className="bg-gray-700 text-white p-2 rounded-full hover:bg-gray-600 focus:outline-none"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleFullscreen();
            }}
            aria-label="Toggle fullscreen"
          >
            <Maximize />
          </button>
          <button
            className="bg-gray-700 text-white p-2 rounded-full hover:bg-gray-600 focus:outline-none"
            onClick={(e) => {
              e.stopPropagation();
              setSlideshow((prev) => !prev);
            }}
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
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite();
            }}
            aria-label="Toggle favorite"
          >
            <Heart />
          </button>
          {/* Close Modal */}
          <button
            className="bg-black text-white p-2 rounded-full hover:bg-red-500 focus:outline-none"
            onClick={(e) => {
              e.stopPropagation();
              closeModal();
            }}
            aria-label="Close modal"
          >
            <X />
          </button>
        </div>

        {/* Navigation controls: Previous and Next */}
        <div className="fixed left-4 top-1/2 transform -translate-y-1/2 z-[120]">
          <button
            className="bg-gray-700 text-white p-2 rounded-full hover:bg-gray-600 focus:outline-none disabled:opacity-50"
            onClick={(e) => {
              e.stopPropagation();
              handlePrev();
            }}
            disabled={selectedImageIndex === 0}
            aria-label="Previous image"
          >
            <ChevronLeft />
          </button>
        </div>
        <div className="fixed right-4 top-1/2 transform -translate-y-1/2 z-[120]">
          <button
            className="bg-gray-700 text-white p-2 rounded-full hover:bg-gray-600 focus:outline-none disabled:opacity-50"
            onClick={(e) => {
              e.stopPropagation();
              handleNext();
            }}
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
            <img
              src={`${url}/images/${currentImage.filename}`}
              alt={currentImage.filename}
              className="max-w-full object-contain mx-auto"
              style={{ maxHeight: "80vh" }}
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 flex-1 flex flex-col">
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
      />

      <div
        className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6"
        style={{ maxHeight: "calc(100vh - 100px)", overflowY: "auto" }}
      >
        {loading ? (
          <div className="text-center text-gray-500 dark:text-gray-400">
            Loading images...
          </div>
        ) : filteredImages.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400">
            {searchQuery
              ? "No images match your search."
              : "No images available."}
          </div>
        ) : (
          filteredImages.map((image, index) => (
            <div
              key={image.filename}
              className="bg-white w-54 dark:bg-gray-700 rounded-2xl shadow-lg p-3 flex flex-col items-center cursor-pointer hover:shadow-2xl transition duration-300 relative"
              onClick={() => {
                setSelectedImageIndex(index);
                resetTransformations();
              }}
            >
              {/* Optional favorite badge */}
              {favorites.includes(image.filename) && (
                <div className="absolute top-2 right-2">
                  <Heart className="text-red-500" />
                </div>
              )}
              <div className="w-24 h-24 overflow-hidden rounded-lg mb-2">
                <img
                  src={`${url}/images/${image.filename}`}
                  alt={image.filename}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <span className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {truncateFileName(image.filename)}
              </span>
            </div>
          ))
        )}
      </div>

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
  );
};

export default ImagesPage;
