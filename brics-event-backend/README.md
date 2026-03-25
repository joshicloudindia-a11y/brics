BACKEND (Node.js + Express)
📌 Details

Image name: brics_event_backend
Container name: brics_event_backend
Internal port: 3000
Public port: 5000

⚠️ Environment Variables

Create a .env file in backend root (NO SPACES around =):

PORT=3000
MONGO_URI=mongodb://localhost:27017/brics_event
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=example@gmail.com
SMTP_PASS=yourpassword

▶ Build Backend Docker Image

Run this inside the backend project root:

docker build -t brics_event_backend .

▶ Run Backend Container
docker run -d -p 5000:3000 --name brics_event_backend --env-file .env brics_event_backend

⏹ Stop Backend Container
docker stop brics_event_backend

🗑 Remove Backend Container
docker rm brics_event_backend

🔁 Redeploy Backend (One Command)
docker rm -f brics_event_backend && docker run -d -p 5000:3000 --name brics_event_backend --env-file .env brics_event_backend

📄 View Backend Logs
docker logs brics_event_backend

🌐 Backend Access
http://localhost:5000

Swagger API Docs
http://localhost:5000/api-docs

🔍 COMMON DOCKER COMMANDS
List running containers
docker ps

List all containers
docker ps -a

List images
docker images
