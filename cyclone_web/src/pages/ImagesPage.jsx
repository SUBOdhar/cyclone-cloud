import React, { useState, useEffect, useRef } from "react";
import Topbar from "../components/Topbar";
import { Flag, X } from "lucide-react";

const ImagesPage = ({ theme, toggleTheme }) => {
  const [images, setImages] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedImage, setSelectedImage] = useState(null); // New state for selected image
  const dummyRef = useRef(null);

  // Fetch the list of images from the API
  const fetchImages = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/images");
      if (!res.ok) throw new Error("Failed to fetch images");
      const data = await res.json();
      setImages(data);
    } catch (error) {
      console.error(error);
      alert("Error fetching images");
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  const filteredImages = images.filter((image) =>
    image.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Helper function to truncate long file names
  const truncateFileName = (filename, maxLength = 20) => {
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
  };

  // Close the modal
  const closeModal = () => setSelectedImage(null);

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
        showSearch={true}
        showUploadActions={false}
        toggleViewMode={() => {}}
        showGridAction={false}
        viewMode={() => {}}
      />
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6">
        {filteredImages.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400">
            {searchQuery
              ? "No images match your search."
              : "No images available."}
          </div>
        ) : (
          filteredImages.map((image) => (
            <div
              key={image.filename}
              className="bg-white w-54 dark:bg-gray-700 rounded-2xl shadow-lg p-3 flex flex-col items-center cursor-pointer hover:shadow-2xl transition duration-300"
              onClick={() => setSelectedImage(image.filename)} // Set the selected image on click
            >
              <div className="w-24 h-24 overflow-hidden rounded-lg mb-2">
                <img
                  src={`http://localhost:3001/images/${image.filename}`}
                  alt={image.filename}
                  className="w-full h-full object-cover"
                />
              </div>
              <span className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {truncateFileName(image.filename)}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Modal to display the selected image */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"
          onClick={closeModal} // Close modal when clicking outside
        >
          <div
            className="bg-white dark:bg-gray-800 p-4 rounded-lg"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
          >
            <img
              src={`http://localhost:3001/images/${selectedImage}`}
              alt={selectedImage}
              className="max-w-full  object-contain"
              style={{maxHeight:'40vw'}}
            />
            <button
              className="absolute top-2 right-2 text-white bg-black p-2 rounded-full"
              onClick={closeModal}
            >
              <X />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImagesPage;
