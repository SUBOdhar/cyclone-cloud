import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import Topbar from "../components/Topbar";
import {
  X,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const ImagesPage = ({ theme, toggleTheme }) => {
  const [images, setImages] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  // Instead of storing the selected image filename, we now store its index
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(false);
  const dummyRef = useRef(null);

  // Fetch images from the API
  const fetchImages = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:3001/api/images");
      if (!res.ok) throw new Error("Failed to fetch images");
      const data = await res.json();
      setImages(data);
    } catch (error) {
      console.error(error);
      alert("Error fetching images");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  // Compute the filtered images based on the search query
  const filteredImages = useMemo(
    () =>
      images.filter((image) =>
        image.filename.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [images, searchQuery]
  );

  // Helper function to truncate long filenames
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

  // Close the modal and reset transform values
  const closeModal = useCallback(() => {
    setSelectedImageIndex(null);
    setRotation(0);
    setZoom(1);
  }, []);

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

  // Navigation handlers to switch between images
  const handlePrev = useCallback(() => {
    setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : prev));
    // Reset transformation when switching images
    // setRotation(0);
    setZoom(1);
  }, []);

  const handleNext = useCallback(() => {
    setSelectedImageIndex((prev) =>
      prev < filteredImages.length - 1 ? prev + 1 : prev
    );
    // Reset transformation when switching images
    // setRotation(0);
    setZoom(1);
  }, [filteredImages.length]);

  // Compute the transform style for the modal container
  const transformStyle = useMemo(
    () => ({
      transform: `rotate(${rotation}deg) scale(${zoom})`,
      transition: "transform 0.3s ease-in-out",
    }),
    [rotation, zoom]
  );

  // Get the current image (if any)
  const currentImage =
    selectedImageIndex !== null ? filteredImages[selectedImageIndex] : null;

  // Keyboard shortcuts for modal navigation and transformation
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
  ]);

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
              className="bg-white w-54 dark:bg-gray-700 rounded-2xl shadow-lg p-3 flex flex-col items-center cursor-pointer hover:shadow-2xl transition duration-300"
              onClick={() => {
                setSelectedImageIndex(index);
                // Reset transformation when switching to a new image
                setRotation(0);
                setZoom(1);
              }}
            >
              <div className="w-24 h-24 overflow-hidden rounded-lg mb-2">
                <img
                  src={`http://localhost:3001/images/${image.filename}`}
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
      {currentImage && (
        <div className=" fixed flex justify-center items-center inset-0 z-50">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={closeModal}
          />
          {/* Modal content */}
          <div className="relative z-[110]">
            {/* Fixed transformation controls at top left */}
            <div className="fixed top-4 left-4 flex items-center space-x-2 z-[120]">
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
            </div>

            {/* Fixed close button at top right */}
            <div className="fixed top-4 right-4 z-[120]">
              <button
                className="bg-black text-white p-2 rounded-full hover:bg-red-500 focus:outline-none"
                onClick={(e) => {
                  e.stopPropagation();
                  closeModal();
                }}
                aria-label="Close modal"
              >
                <X className="rounded-lg" />
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
                style={{ ...transformStyle }}
              >
                <img
                  src={`http://localhost:3001/images/${currentImage.filename}`}
                  alt={currentImage.filename}
                  className="max-w-full object-contain mx-auto"
                  style={{ maxHeight: "80vh" }}
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImagesPage;
