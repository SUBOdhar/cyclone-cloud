#!/bin/bash

if [ -d "server/dist" ]; then
    echo "Starting build..."
    ./build
fi

cd server
npm install
node index.js
