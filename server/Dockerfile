# Use a lightweight Node.js image
FROM node:18-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to leverage caching
COPY package*.json ./

# Install only production dependencies
RUN npm install --production

# Copy the rest of your application's source code
COPY . .

# Expose the port your server listens on (it's 3001 in app.js)
EXPOSE 3001

# The command to start your server
CMD ["node", "app.js"]
