# Dockerfile - Combined Node.js and .NET container
FROM node:latest

# Install .NET SDK 7.0
RUN apt-get update \
    && apt-get install -y wget apt-transport-https \
    && wget https://packages.microsoft.com/config/debian/11/packages-microsoft-prod.deb -O packages-microsoft-prod.deb \
    && dpkg -i packages-microsoft-prod.deb \
    && rm packages-microsoft-prod.deb \
    && apt-get update \
    && apt-get install -y dotnet-sdk-7.0 \
    && apt-get install -y postgresql-client \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g pm2


# Set up Node.js part
WORKDIR /app
COPY package*.json ./
RUN npm install
RUN npm install dotenv

# Copy .NET project
COPY ./CSharpBackend /app/CSharpBackend
# clear cached folders
RUN rm -rf /app/CSharpBackend/obj/ /app/CSharpBackend/bin/

RUN dotnet restore /app/CSharpBackend

# Copy the rest of the application
COPY . .

# Make setup script executable
COPY setup.sh /app/setup.sh
RUN chmod +x /app/setup.sh


# Copy PM2 configuration file
COPY process.json /app/process.json


# Expose ports for both applications
EXPOSE 8080 5001

# Command to run the setup script and start both services
CMD ["bash", "/app/setup.sh"]