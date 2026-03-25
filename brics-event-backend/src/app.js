import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import multer from "multer";
import helmet from "helmet";
import morgan from "morgan";
import cron from "node-cron"; 
import Travel from "./models/Travel.js";
import Hotel from "./models/Hotel.js";
import connectMongo from "./config/mongo.js";
import seedAdminUser from './data/userSeed.js'; 
import { sendPushNotification } from "./utils/notification.js";
import authRoutes from "./routes/auth.routes.js";
import roleRoutes from "./routes/role.routes.js";
import eventRoutes from "./routes/event.routes.js";
import travelRoutes from "./routes/travel.routes.js";
import hotelRoutes from "./routes/hotel.routes.js";
import hotelMasterRoutes from "./routes/hotelmaster.routes.js";
import conferenceHallRoutes from "./routes/conferenceHall.routes.js";
import sessionRoutes from "./routes/session.routes.js";
import speakerRoutes from "./routes/speaker.routes.js";
import activityRoutes from "./routes/activity.routes.js";
import ministryRoutes from "./routes/ministry.routes.js";
import organizationRoutes from "./routes/organization.routes.js";
import agendaRoutes from "./routes/agenda.routes.js";
import masterDesignationRoutes from "./routes/masterDesignation.routes.js";

import Event from "./models/Event.js";
import Session from "./models/Session.js";
import User from "./models/User.js";
import UserEvent from "./models/UserEvent.js";
import SessionParticipant from "./models/SessionParticipant.js";

import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger.js";
import seedDatabase from "./config/seed.js";

dotenv.config();
const app = express();

app.use(
  cors({
    origin: [process.env.FRONTEND_URL],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
    exposedHeaders: ["Content-Disposition"],
  }),
);
app.use(morgan("combined"));
app.disable("x-powered-by");

app.use(helmet());
app.use(
  helmet.hsts({
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  }),
);
app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "https:"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  }),
);
app.use(helmet.referrerPolicy({ policy: "no-referrer" }));
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));

app.use(express.json({
  limit: "10mb",
  strict: true
}));

app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/api/auth", authRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/travel", travelRoutes);
app.use("/api/hotel", hotelRoutes);
app.use("/api/hotel-master", hotelMasterRoutes);
app.use("/api/conference/halls", conferenceHallRoutes);
app.use("/api", sessionRoutes);
app.use("/api/speakers", speakerRoutes);
app.use("/api/activities", activityRoutes);
app.use("/api/ministries", ministryRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api", agendaRoutes);
app.use("/api/designations", masterDesignationRoutes);

app.post("/api/communications/push", async (req, res) => {
  const { targetToken, title, body } = req.body;
  const result = await sendPushNotification(targetToken, title, body);
  if (result.success) {
    res.json({ message: "Push Sent Successfully!" });
  } else {
    res.status(500).json({ error: result.error });
  }
});

if (process.env.NODE_ENV !== "production") {
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

app.get("/api/health", (req, res) => {
  res.send("BRICS Event Management API is running");
});

app.use((err, req, res, next) => {
  console.error(err);
  if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
    return res.status(400).json({
      success: false,
      message: "Invalid JSON format",
    });
  }
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: "Invalid file upload",
    });
  }
  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
});

const initAutoReminders = () => {

  cron.schedule("0 * * * *", async () => {
    try {
      const sevenDaysStart = new Date();
      sevenDaysStart.setDate(sevenDaysStart.getDate() + 6);
      sevenDaysStart.setHours(sevenDaysStart.getHours() + 23);
      
      const sevenDaysEnd = new Date();
      sevenDaysEnd.setDate(sevenDaysEnd.getDate() + 7);
      sevenDaysEnd.setHours(sevenDaysEnd.getHours() + 25);

      const upcomingEvents = await Event.find({
        start_date: { $gte: sevenDaysStart, $lte: sevenDaysEnd }
      });

      for (const event of upcomingEvents) {
        const userMappings = await UserEvent.find({ event_id: event._id });
        const userIds = userMappings.map(m => m.user_id);
        const users = await User.find({ id: { $in: userIds }, fcm_token: { $exists: true } });

        for (const user of users) {
          await sendPushNotification(
            user.fcm_token,
            "Event Reminder! 📅",
            `Hello, just a reminder that the event '${event.name}' is starting in 7 days.`
          );
        }
        console.log(`✅ Sent 7-day reminders for event: ${event.name}`);
      }
    } catch (err) {
      console.error("❌ 7-Day Cron Error:", err.message);
    }
  });

  cron.schedule("0 * * * *", async () => {
    console.log("🕒 Running Auto-Reminder: Checking for Events starting in 24 hours...");
    try {
      const tomorrowStart = new Date();
      tomorrowStart.setHours(tomorrowStart.getHours() + 23);
      const tomorrowEnd = new Date();
      tomorrowEnd.setHours(tomorrowEnd.getHours() + 25);

      const upcomingEvents = await Event.find({
        start_date: { $gte: tomorrowStart, $lte: tomorrowEnd }
      });

      for (const event of upcomingEvents) {
        const userMappings = await UserEvent.find({ event_id: event._id });
        const userIds = userMappings.map(m => m.user_id);
        const users = await User.find({ id: { $in: userIds }, fcm_token: { $exists: true } });

        for (const user of users) {
          const roleMap = userMappings.find(m => m.user_id === user.id);
          const roleText = roleMap?.role === "DAO" ? "DAO" : "Delegate";
          
          await sendPushNotification(
            user.fcm_token,
            "Event Reminder! ⏳",
            `Hello ${roleText}, just a reminder that the event '${event.name}' is starting in 24 hours. See you there!`
          );
        }
        console.log(`✅ Sent 24h reminders for event: ${event.name}`);
      }
    } catch (err) {
      console.error("❌ Event Cron Error:", err.message);
    }
  });

  cron.schedule("*/30 * * * *", async () => {
    console.log("🕒 Running Auto-Reminder: Checking for Sessions starting in 1 hour...");
    try {
      const soonStart = new Date();
      soonStart.setMinutes(soonStart.getMinutes() + 50);
      const soonEnd = new Date();
      soonEnd.setMinutes(soonEnd.getMinutes() + 70);

      const upcomingSessions = await Session.find({
        start_datetime: { $gte: soonStart, $lte: soonEnd }
      });

      for (const session of upcomingSessions) {
        const participants = await SessionParticipant.find({ session_id: session._id });
        const userIds = participants.map(p => p.user_id);
        const users = await User.find({ id: { $in: userIds }, fcm_token: { $exists: true } });

        for (const user of users) {
          await sendPushNotification(
            user.fcm_token,
            "Session Starting Soon! 🎙️",
            `Hi ${user.first_name}, a quick reminder that your session '${session.name}' is starting in 1 hour.`
          );
        }
        console.log(`✅ Sent 1h reminders for session: ${session.name}`);
      }
    } catch (err) {
      console.error("❌ Session Cron Error:", err.message);
    }
  });

  cron.schedule("*/5 * * * *", async () => {
    console.log("🕒 Running Auto-Reminder: Checking for missing Profile, Travel & Hotel details (5 min)...");
    try {
      const activeEvents = await Event.find({
        event_type: { $in: ["physical", "hybrid", "Physical", "Hybrid", "PHYSICAL", "HYBRID"] },
        status: "published",
        end_date: { $gte: new Date() } 
      });

      const allowedRoles = ["DAO", "DELEGATE", "HEAD OF DELEGATE", "SECURITY OFFICER", "INTERPRETER", "MEDIA", "DEPUTY", "DELEGATION CONTACT OFFICER", "SPEAKER"];

      for (const event of activeEvents) {
        const userMappings = await UserEvent.find({ 
          event_id: event._id,
          role: { $in: allowedRoles },
          status: { $ne: "cancelled" }
        });

        for (const mapping of userMappings) {
          const user = await User.findOne({ id: mapping.user_id, fcm_token: { $exists: true } });
          if (!user) continue;

          const isProfileIncomplete = !user.first_name || !user.mobile || !user.country;
          const travelRecord = await Travel.findOne({ user_id: user.id, event_id: event._id });
          const hotelRecord = await Hotel.findOne({ user_id: user.id, event_id: event._id });

          if (isProfileIncomplete || !travelRecord || !hotelRecord) {
            const missing = [];
            if (isProfileIncomplete) missing.push("Profile");
            if (!travelRecord) missing.push("Travel");
            if (!hotelRecord) missing.push("Hotel");

            await sendPushNotification(
              user.fcm_token,
              "Action Required ⚠️",
              `Reminder: Please complete your ${missing.join(", ")} details for the event '${event.name}'.`
            );
          }
        }
      }
    } catch (err) {
      console.error("❌ 5-Min Cron Error:", err.message);
    }
  });
};

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectMongo();
    
    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on ${PORT}`);
      initAutoReminders(); 
    });

    server.on("error", (err) => {
      if (err && err.code === "EADDRINUSE") {
        console.error(`Port ${PORT} already in use. Is another server running?`);
        process.exit(1);
      }
      console.error("Server error:", err);
      process.exit(1);
    });

    await seedDatabase();
    await seedAdminUser();

  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();