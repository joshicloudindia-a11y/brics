// brics-event-backend/src/utils/scheduler.js

import cron from 'node-cron';
import Event from '../models/Event.js';
import Session from '../models/Session.js';
import User from '../models/User.js';
import UserEvent from '../models/UserEvent.js';
import SessionParticipant from '../models/SessionParticipant.js';
import { sendPushNotification } from './notification.js';

export const initNotificationsCron = () => {
  
  cron.schedule('0 * * * *', async () => {
    console.log("🕒 Running Cron: Checking for Event Reminders (24h)...");
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
          await sendPushNotification(
            user.fcm_token,
            "Event Reminder! ⏳",
            `Hi ${user.first_name}, the event '${event.name}' starts in 24 hours. See you there!`
          );
        }
        console.log(`✅ Sent 24h reminders for event: ${event.name}`);
      }
    } catch (err) {
      console.error("❌ Event Cron Error:", err.message);
    }
  });

  cron.schedule('*/30 * * * *', async () => {
    console.log("🕒 Running Cron: Checking for Session Reminders (1h)...");
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
            `Hi ${user.first_name}, your session '${session.name}' starts in 1 hour.`
          );
        }
        console.log(`✅ Sent 1h reminders for session: ${session.name}`);
      }
    } catch (err) {
      console.error("❌ Session Cron Error:", err.message);
    }
  });
};