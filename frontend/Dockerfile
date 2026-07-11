# Stage 1: Build the React application
FROM node:20-alpine AS build

WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
# Use legacy peer deps and install ajv explicitly to bypass conflicts
RUN npm ci --legacy-peer-deps
RUN npm install ajv --legacy-peer-deps

# Copy the rest of the application
COPY . .

# Set environment variables for build
ENV REACT_APP_BACKEND_URL=""

# Build the app
RUN npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from the build stage
COPY --from=build /app/build /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
