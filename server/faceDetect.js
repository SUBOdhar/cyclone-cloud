const faceapi = require("face-api.js");
const canvas = require("canvas");
const fs = require("fs-extra");
const path = require("path");

global.fetch = fetch;

// Define directories
const IMAGE_FOLDER = "uploads";
const OUTPUT_FOLDER = "grouped_faces";

// Ensure output directory exists
fs.ensureDirSync(OUTPUT_FOLDER);

// Load models
const { Canvas, Image } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image });

async function loadModels() {
  const modelPath = path.join(__dirname, "models");
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);
  console.log("Models Loaded!");
}

// Function to check if a file is an image (based on file extension)
function isImage(file) {
  return /\.(jpg|jpeg|png|bmp)$/i.test(file);
}

async function getFaceDescriptor(imagePath) {
  try {
    const img = await canvas.loadImage(imagePath);
    const detection = await faceapi
      .detectSingleFace(img)
      .withFaceLandmarks()
      .withFaceDescriptor();
    return detection ? detection.descriptor : null;
  } catch (error) {
    console.error(`Error processing ${imagePath}: ${error.message}`);
    return null;
  }
}

async function groupImages() {
  // Get only image files from the uploads folder
  const imageFiles = fs.readdirSync(IMAGE_FOLDER).filter(isImage);

  // Array to store labeled face descriptors
  const labeledDescriptors = [];
  let faceMatcher = null; // Will be initialized once we have at least one descriptor

  for (const file of imageFiles) {
    const imgPath = path.join(IMAGE_FOLDER, file);
    const descriptor = await getFaceDescriptor(imgPath);
    if (!descriptor) continue; // Skip if no face detected

    if (labeledDescriptors.length === 0) {
      // First face encountered, create new labeled descriptor and folder
      const newLabel = `Person_1`;
      const labeledDescriptor = new faceapi.LabeledFaceDescriptors(newLabel, [
        descriptor,
      ]);
      labeledDescriptors.push(labeledDescriptor);
      faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.5);

      const newFolder = path.join(OUTPUT_FOLDER, newLabel);
      fs.ensureDirSync(newFolder);
      fs.moveSync(imgPath, path.join(newFolder, file), { overwrite: true });
    } else {
      // Update or create the faceMatcher with the current labeled descriptors
      faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.5);
      const bestMatch = faceMatcher.findBestMatch(descriptor);

      if (bestMatch.label !== "unknown") {
        // Match found, copy image into the corresponding folder
        const folder = path.join(OUTPUT_FOLDER, bestMatch.label);
        fs.ensureDirSync(folder);
        fs.copySync(imgPath, path.join(folder, file), { overwrite: true });
      } else {
        // No match found, create a new labeled descriptor and folder
        const newLabel = `Person_${labeledDescriptors.length + 1}`;
        const labeledDescriptor = new faceapi.LabeledFaceDescriptors(newLabel, [
          descriptor,
        ]);
        labeledDescriptors.push(labeledDescriptor);
        faceMatcher = new faceapi.FaceMatcher(labeledDescriptors, 0.5);

        const newFolder = path.join(OUTPUT_FOLDER, newLabel);
        fs.ensureDirSync(newFolder);
        fs.moveSync(imgPath, path.join(newFolder, file), { overwrite: true });
      }
    }
  }
  console.log("Images have been grouped successfully!");
}

// Run the script
(async () => {
  await loadModels();
  await groupImages();
})();
