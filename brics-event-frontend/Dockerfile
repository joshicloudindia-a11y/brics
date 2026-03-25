### STAGE 1: Build ###
FROM node:18 AS build

WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN npm install --force

COPY . .
RUN npm run build


### STAGE 2: Run ###
FROM node:18

WORKDIR /usr/src/app

RUN npm install -g serve

COPY --from=build /usr/src/app/dist ./dist
EXPOSE 80

# Serve Vite build
CMD ["serve", "-s", "dist", "-l", "80"]
