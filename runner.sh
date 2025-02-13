#!/bin/bash
echo "Starting server and cyclone_web..."

# Open first terminal for server
gnome-terminal -- bash -c "cd server && node index.js; exec bash"

# Open second terminal for cyclone_web
gnome-terminal -- bash -c "cd cyclone_web && npm run dev; exec bash"

echo "Both scripts started!"
