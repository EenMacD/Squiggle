
#!/bin/bash

# Make the script exit on any error
set -e

echo "Setting up environment..."
# Use 0.0.0.0 instead of localhost to make it accessible
export DATABASE_URL="postgresql://postgres:postgres@0.0.0.0:5432/postgres"

echo "Installing dependencies..."
npm install

echo "Setting up database..."
# Run database migrations 
npx drizzle-kit push

echo "Starting services..."

# Start PostgreSQL if not running
pg_ctl status || pg_ctl start

# Start C# backend
cd CSharpBackend 
dotnet build
dotnet run &
cd ..

# Start Node.js/Express backend and React frontend
npm run dev &

# Wait for all background processes
wait
