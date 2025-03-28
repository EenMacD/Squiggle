#!/bin/bash
set -e

# Build the Docker image
echo "Building the Docker image..."
docker build -t squiggle .

# Run the container in interactive mode, mapping required ports
echo "Starting the container..."
docker run -it --rm -p 3000:3000 -p 4000:4000 squiggle
