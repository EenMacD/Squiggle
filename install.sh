
#!/bin/bash
set -e

echo "Starting Node.js/React backend..."
# Navigate to the frontend/backend directory if needed
cd /app
npm run dev &

echo "Starting C# backend..."
cd /app/CSharpBackend
dotnet run &

# Wait for all background processes to finish
wait

echo "All services are running."

# --- Browser Prompt (for non-Docker environments) ---
if command -v xdg-open &> /dev/null; then
    echo "Opening browser..."
    xdg-open "http://localhost:3000"
else
    echo "xdg-open not found. Please open http://localhost:3000 manually."
fi
