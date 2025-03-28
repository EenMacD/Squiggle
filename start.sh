
#!/bin/bash

# Make the script exit on any error
set -e

echo "Setting up environment..."
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres"

echo "Setting up database..."
# Run database migrations
npx drizzle-kit push:pg

echo "Starting services..."

# Start C# backend
cd CSharpBackend && dotnet run &

# Go back to root directory
cd ..

# Start Node.js/Express backend and React frontend
npm run dev &

# Wait for all background processes
wait
