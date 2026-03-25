FROM node:18-alpine

WORKDIR /usr/src/app

# Copy dependency files
COPY package.json package-lock.json ./

# Install only production dependencies
RUN npm install --production

# Copy source code
COPY . .

# App runs on PORT (default 3000)
EXPOSE 3000

# Start server
CMD ["node", "src/app.js"]
