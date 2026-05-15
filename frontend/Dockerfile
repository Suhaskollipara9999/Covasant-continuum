# Stage 1: Build the React application
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Build the application
# We accept the Backend URL as a build argument
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build


# Stage 2: Serve with Nginx
FROM nginx:1.25-alpine

# Copy the built files from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy our template config
# The official nginx image automatically extracts variables from *.template files 
# into /etc/nginx/conf.d/ upon startup using envsubst
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Cloud Run sets the PORT environment variable. Nginx needs to listen on this port.
# The template will replace ${PORT} with the actual runtime port.
EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
