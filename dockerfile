# Use the official .NET 7 SDK image as the base image (includes .NET 7)
FROM mcr.microsoft.com/dotnet/sdk:7.0 AS base
WORKDIR /app

# Install Node.js and npm (adjust the Node version as needed)
RUN apt-get update && \
    apt-get install -y curl gnupg && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs


# (Optional) Install PostgreSQL client utilities if needed for migrations
RUN apt-get install -y postgresql-client

# Copy your application source code into the container
COPY . .

WORKDIR /app
# Install Node dependencies and run database migrations
RUN npm install
RUN npm install dotenv
RUN apt-get update && apt-get install -y bash && rm -rf /var/lib/apt/lists/*



RUN npx drizzle-kit push

# Build the .NET project located in the CSharpBackend folder
WORKDIR /app/CSharpBackend
RUN dotnet build

# Return to the application root directory
WORKDIR /app

# Expose any necessary ports (adjust as needed)
EXPOSE 3000
EXPOSE 4000

# Copy the startup script into the container and ensure it’s executable
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# COPY start.sh /app/install.sh
# RUN chmod +x /app/install.sh

# The container will run this script when started
# CMD ["/app/install.sh"]
# CMD ["/app/install.sh"]

