import { createClient } from "redis";

const redisClient = createClient({
  url: process.env.REDIS_URL,
  socket: {
    // tls: true,
    rejectUnauthorized: false,
    reconnectStrategy: (retries) => {
      return Math.min(retries * 100, 5000);
    },
  },
});

/* ================= EVENTS ================= */

redisClient.on("connect", () => {
  console.log("Redis connecting (TLS)...");
});

redisClient.on("ready", () => {
  console.log("Redis connected securely via TLS");
});

redisClient.on("error", (err) => {
  console.error("Redis Error:", err.message);
});

redisClient.on("end", () => {
  console.warn("Redis connection closed");
});

/* ================= CONNECT SAFELY ================= */

const connectRedis = async () => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  } catch (err) {
    console.error("Failed to connect to Redis:", err.message);
  }
};

await connectRedis();

export default redisClient;
