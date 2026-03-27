// brics-event-backend/src/controllers/auth.controller.js

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import nodemailer from "nodemailer";
import redisClient from "../config/redis.js";
import crypto from "crypto";
import User from "../models/User.js";
import Role from "../models/Role.js";
import Event from "../models/Event.js";
import UserEvent from "../models/UserEvent.js";
import Activity from "../models/Activity.js";
import Session from "../models/Session.js";
import SessionParticipant from "../models/SessionParticipant.js";
import Speaker from "../models/Speaker.js";
import { getSignedS3Url, uploadToS3 } from "../config/uploadToS3.js";
import { sendEmail } from "../config/sendEmail.js";
import { superAdminOtpTemplate } from "../template/superAdminOtp.template.js";
import { otpEmailTemplate } from "../template/otpEmail.template.js";
import { capitalizeName } from "../config/capitalizeName.js";
import { delegateInviteTemplate } from "../template/delegateInvite.template.js";
import { daoInviteTemplate } from "../template/daoInvite.template.js";
import { speakerInviteTemplate } from "../template/speakerInvite.template.js";
import { speakerWelcomeTemplate } from "../template/speakerWelcome.template.js";
import Travel from "../models/Travel.js";
import Hotel from "../models/Hotel.js";
import {
  signRefreshToken,
  signToken,
  verifyRefreshToken,
  verifyToken,
} from "../data/jwt.js";
import { sanitizeHtmlString } from "../data/sanitize.js";
import { isDisposableEmail } from "../validators/email.js";
import { decryptOTP, hashOTP, verifyEncryptedOTP, encryptOTPBackend } from "../utils/otpEncryption.js";
import { sendPushNotification } from "../utils/notification.js";

export const ROLE_POWER = {
  "SUPER ADMIN": 4,
  "EVENT MANAGER": 3,
  DAO: 2,
  SPEAKER: 1,
  "HEAD OF DELEGATE": 1,
  DELEGATE: 0,
  "SECURITY OFFICER": 0,
  DEPUTY: 0,
  "DELEGATION CONTACT OFFICER": 0,
  INTERPRETER: 0,
  MEDIA: 0,
  SPEAKER: 0,
};

export const updateFcmToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    const userId = req.user?.sub || req.user?.id || req.user?.user_id;

    if (!fcmToken) return res.status(400).json({ success: false, message: "FCM Token required" });

    const user = await User.findOne({ id: userId });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    const isTokenUpdated = user.fcm_token !== fcmToken;

    if (isTokenUpdated) {
      user.fcm_token = fcmToken;
      await user.save();

      try {
        const allowedRoles = ["DAO", "DELEGATE", "HEAD OF DELEGATE", "SECURITY OFFICER", "INTERPRETER", "MEDIA", "DEPUTY", "DELEGATION CONTACT OFFICER", "SPEAKER"];
        const userEvents = await UserEvent.find({ user_id: userId, role: { $in: allowedRoles }, status: { $ne: "cancelled" } });
        
        let missingDetailsStr = "";
        
        for (const ue of userEvents) {
          const event = await Event.findById(ue.event_id);
          if (event && ["physical", "hybrid"].includes(event.event_type?.toLowerCase()) && new Date(event.end_date) >= new Date()) {
            const isProfileIncomplete = !user.first_name || !user.mobile || !user.country;
            const travelRecord = await Travel.findOne({ user_id: userId, event_id: event._id });
            const hotelRecord = await Hotel.findOne({ user_id: userId, event_id: event._id });

            if (isProfileIncomplete || !travelRecord || !hotelRecord) {
              const missing = [];
              if (isProfileIncomplete) missing.push("Profile");
              if (!travelRecord) missing.push("Travel");
              if (!hotelRecord) missing.push("Hotel");
              missingDetailsStr = missing.join(", ");
              break; 
            }
          }
        }

        if (missingDetailsStr) {
          await sendPushNotification(
            fcmToken,
            "Welcome & Action Required! ⚠️",
            `Hi ${user.first_name || 'User'}, welcome back! Please complete your pending ${missingDetailsStr} details to proceed.`
          );
        } else {
          await sendPushNotification(
            fcmToken,
            "Welcome To BRICS India 2026 🇮🇳",
            `Welcome back, ${user.first_name || 'User'}! Your registration is complete. Great to see you.`
          );
        }
        
        console.log(`✅ Smart Login Push sent to ${user.email}`);
      } catch (pushErr) {
        console.error("❌ Smart Notification failed:", pushErr.message);
      }
    } else {
      console.log(`ℹ️ Token matches DB for ${user.email}. Skipping notifications.`);
    }

    return res.status(200).json({ success: true, message: "FCM Sync Complete" });
  } catch (error) {
    console.error("FCM Registration Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const generateUserCode = () => {
  const year = new Date().getFullYear();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `USR-${year}-${random}`;
};

const isValidEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

export const getJwtTtlSeconds = () => {
  const val = process.env.JWT_EXPIRES_IN || "15m";

  if (val.endsWith("m")) return parseInt(val) * 60;
  if (val.endsWith("h")) return parseInt(val) * 60 * 60;
  if (val.endsWith("d")) return parseInt(val) * 60 * 60 * 24;

  return parseInt(val);
};

/* =========================================================
   SEND OTP (Login)
   ========================================================= */
export const sendLoginOtp = async (req, res) => {
  try {
    if (typeof req.body.email !== "string") {
      return res.status(400).json({
        message: "Invalid email format"
      });
    }

    const email = sanitizeHtmlString(req.body.email);


    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }



    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({
        message: "No account found with this email",
      });
    }

    // Check if user account is blocked or inactive
    if (user.account_status === "blocked") {
      return res.status(403).json({
        message: "Account is deactivated",
      });
    }

    if (user.account_status !== "active") {
      return res.status(403).json({
        message: "Account is not active",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Hash OTP for storage (one-way encryption)
    const hashedOtp = hashOTP(otp);

    await sendEmail({
      to: normalizedEmail,
      subject: "Your Login OTP",
      html: otpEmailTemplate({ otp }),
    });

    // Store hashed OTP in Redis (secret, cannot be reversed)
    await redisClient.set(
      `login_otp:${normalizedEmail}`,
      JSON.stringify({ hashedOtp, attempts: 0 }),
      { EX: 300 },
    );

    return res.status(200).json({
      message: "OTP sent to your email",
    });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error", error: err.message });
  }
};

export const verifyLoginOtp = async (req, res) => {
  try {
    const encryptedPayload = sanitizeHtmlString(req.body.encryptedPayload);

    if (!encryptedPayload) {
      return res.status(400).json({ message: "Invalid request. Please try again." });
    }

    const decryptedPayloadString = decryptOTP(encryptedPayload);
    const payload = JSON.parse(decryptedPayloadString);

    const email = sanitizeHtmlString(payload.email);
    const otp = sanitizeHtmlString(payload.otp);

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required to proceed." });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      await Activity.logActivity({
        activityType: "LOGIN",
        description: `Failed login attempt for ${normalizedEmail}`,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get("user-agent"),
        status: "FAILED",
        errorMessage: "User not found",
      });
      return res.status(400).json({ message: "Email not registered. Please check and try again." });
    }

    if (user.account_status === "blocked") {
      await Activity.logActivity({
        activityType: "LOGIN",
        description: `Blocked user login attempt: ${normalizedEmail}`,
        userId: user.id,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get("user-agent"),
        status: "FAILED",
        errorMessage: "Account is blocked",
      });
      return res.status(403).json({ message: "Your account has been deactivated. Please contact support." });
    }

    if (user.account_status !== "active") {
      await Activity.logActivity({
        activityType: "LOGIN",
        description: `Inactive user login attempt: ${normalizedEmail}`,
        userId: user.id,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get("user-agent"),
        status: "FAILED",
        errorMessage: "Account not active",
      });
      return res.status(403).json({ message: "Your account is not active yet. Please complete the registration process." });
    }

    const storedData = await redisClient.get(`login_otp:${normalizedEmail}`);
    if (!storedData) {
      await Activity.logActivity({
        activityType: "LOGIN",
        description: `OTP expired for ${normalizedEmail}`,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get("user-agent"),
        status: "FAILED",
        errorMessage: "OTP expired",
      });
      return res.status(400).json({ message: "OTP has expired. Please request a new one." });
    }

    const { hashedOtp: storedHashedOtp } = JSON.parse(storedData);
    const receivedHashedOtp = hashOTP(otp);

    if (storedHashedOtp !== receivedHashedOtp) {
      await Activity.logActivity({
        activityType: "LOGIN",
        description: `Failed login attempt for ${normalizedEmail} - invalid OTP`,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get("user-agent"),
        status: "FAILED",
        errorMessage: "OTP mismatch",
      });
      return res.status(400).json({ message: "The OTP you entered is incorrect. Please try again." });
    }

    await redisClient.del(`login_otp:${normalizedEmail}`);

    const sessionId = uuidv4();
    const ttl = getJwtTtlSeconds();

    const accessToken = signToken({
      sub: user.id,
      session_id: sessionId,
    });

    const refreshToken = signRefreshToken({
      sub: user.id,
    });

    await redisClient.set(`user_session:${user.id}`, sessionId, { EX: ttl });
    await redisClient.set(`refresh_session:${user.id}`, refreshToken, {
      EX: 7 * 24 * 60 * 60,
    });

    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    await Activity.logActivity({
      activityType: "LOGIN",
      description: `User ${user.email} logged in successfully`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get("user-agent"),
      status: "SUCCESS",
    });

    return res.json({ token: accessToken });
  } catch (error) {
    console.error("Login error:", error.message);
    await Activity.logActivity({
      activityType: "LOGIN",
      description: `Login error: ${error.message}`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get("user-agent"),
      status: "FAILED",
      errorMessage: error.message,
    });
    return res.status(409).json({ message: "OTP you entered is incorrect. Please try again." });
  }
};

export const refreshAccessToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refresh_token;
    if (!refreshToken) {
      return res.status(401).json({ message: "No refresh token" });
    }

    const decoded = verifyRefreshToken(refreshToken);

    const storedRefresh = await redisClient.get(
      `refresh_session:${decoded.sub}`,
    );

    if (!storedRefresh || storedRefresh !== refreshToken) {
      return res.status(401).json({ message: "Session expired" });
    }

    // const oldSession = await redisClient.get(
    //   `user_session:${decoded.sub}`
    // );

    const sessionId = uuidv4();
    const ttl = getJwtTtlSeconds();

    // GRACE WINDOW (DISABLED)
    /*
    if (oldSession) {
      await redisClient.set(
        `user_session_prev:${decoded.sub}`,
        oldSession,
        { EX: 10 }
      );
    }
    */

    // Strict overwrite
    await redisClient.set(`user_session:${decoded.sub}`, sessionId, {
      EX: ttl,
    });

    const newAccessToken = signToken({
      sub: decoded.sub,
      session_id: sessionId,
    });

    return res.json({ token: newAccessToken });
  } catch {
    return res.status(401).json({ message: "Invalid refresh token" });
  }
};

/* =========================================================
   LOGOUT USER
   ========================================================= */
export const logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = verifyToken(token);

    await redisClient.del(`user_session:${decoded.sub}`);
    await redisClient.del(`refresh_session:${decoded.sub}`);

    res.clearCookie("refresh_token", {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    });

    // Get user MongoDB _id for activity logging
    const user = await User.findOne({ id: decoded.sub });

    await Activity.logActivity({
      activityType: "LOGOUT",
      description: "User logged out",
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get("user-agent"),
      status: "SUCCESS",
    });

    return res.json({ message: "Logged out successfully" });
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
};

/* =========================================================
   SAVE / UPDATE USER PROFILE
   ========================================================= */
export const saveUserProfile = async (req, res) => {
  try {
    const user_id = sanitizeHtmlString(req.body.user_id);
    const first_name = sanitizeHtmlString(req.body.first_name);
    const last_name = sanitizeHtmlString(req.body.last_name);

    // Required validation
    if (!user_id || !first_name || !last_name) {
      return res.status(400).json({
        message: "user_id, first_name and last_name are required",
      });
    }

    // Fetch user
    const user = await User.findOne({ id: user_id });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Generate user_code only once
    if (!user.user_code) {
      const now = new Date();
      user.user_code = `ADS${now.getFullYear().toString().slice(-2)}${String(
        now.getMonth() + 1,
      ).padStart(2, "0")}${Math.floor(1000 + Math.random() * 9000)}`;
    }

    const sanitizedBody = {};
    for (const key in req.body) {
      sanitizedBody[key] = sanitizeHtmlString(req.body[key]);
    }

    // Assign fields
    Object.assign(user, sanitizedBody);
    user.name = `${first_name} ${last_name}`;

    await user.save();

    await Activity.logActivity({
      activityType: "REGISTER",
      description: `New user profile created: ${user.email}`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get("user-agent"),
      status: "SUCCESS",
      resourceType: "USER",
      resourceId: user._id,
    });

    res.json({
      message: "User profile saved successfully",
      user_code: user.user_code,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

export const calculateProfileCompletion = (user) => {
  let completed = 0;
  let totalFields = 0;

  // ===== CORE INFO ===== (3)
  totalFields += 3;
  if (user.first_name) completed++;
  if (user.last_name) completed++;
  if (user.email) completed++;

  // ===== PERSONAL INFO ===== (2)
  totalFields += 2;
  if (user.title) completed++;
  if (user.gender) completed++;

  // ===== CONTACT INFO ===== (2)
  totalFields += 2;
  if (user.mobile) completed++;
  if (user.country) completed++;

  // ===== PASSPORT INFO ===== (3) → only if NOT India
  const isIndia = user.country?.toLowerCase() === "india";

  if (!isIndia) {
    totalFields += 4;
    if (user.passport?.passport_number) completed++;
    if (user.passport?.place_of_issue) completed++;
    if (user.passport?.expiry_date) completed++;
    if (user.documents?.passport_document_url) completed++;
  }

  // ===== DOCUMENTS ===== (2)
  totalFields += 1;
  if (user.documents?.photo_url) completed++;

  const percentage = Math.round((completed / totalFields) * 100);

  return {
    completed_fields: completed,
    total_fields: totalFields,
    percentage,
  };
};

/* =========================================================
   GET LOGGED-IN USER PROFILE
   ========================================================= */
export const getMyProfile = async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.user_id }).select(
      "-password_hash -__v",
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const role = await Role.findOne({ id: user.role_id });

    const userObj = user.toObject();

    if (userObj.documents?.photo_url) {
      userObj.documents.photo_url = await getSignedS3Url(
        userObj.documents.photo_url,
      );
    }

    if (userObj.documents?.passport_document_url) {
      userObj.documents.passport_document_url = await getSignedS3Url(
        userObj.documents.passport_document_url,
      );
    }

    // If speaker, get assigned sessions
    let sessions = [];
    if (role?.name === "SPEAKER") {
      const participantRecords = await SessionParticipant.find({
        user_id: user.id,
        participant_type: "speaker",
      }).lean();

      sessions = await Promise.all(
        participantRecords.map(async (record) => {
          const session = await Session.findById(record.session_id)
            .select("_id name description event_id start_datetime end_datetime")
            .lean();
          return {
            session_id: record.session_id,
            session_name: session?.name,
            session_description: session?.description,
            event_id: session?.event_id,
            start_datetime: session?.start_datetime,
            end_datetime: session?.end_datetime,
            registration_status: record.registration_status,
            attendance_status: record.attendance_status,
            check_in_time: record.check_in_time,
          };
        })
      );
    }

    const profileProgress = calculateProfileCompletion(user);

    return res.json({
      user: userObj,
      role,
      sessions: sessions.length > 0 ? sessions : undefined,
      profile_completion: profileProgress,
    });
  } catch (err) {
    console.error("getMyProfile error:", err);
    return res.status(500).json({
      message: "Unable to fetch profile",
    });
  }
};


export const updateMyProfile = async (req, res) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) return res.status(401).json({ message: "Invalid token" });

    const user = await User.findOne({ id: userId });
    if (!user) return res.status(404).json({ message: "User not found" });

    const title = sanitizeHtmlString(req.body.title);
    const first_name = sanitizeHtmlString(req.body.first_name);
    const middle_name = sanitizeHtmlString(req.body.middle_name);
    const last_name = sanitizeHtmlString(req.body.last_name);
    const mobile = sanitizeHtmlString(req.body.mobile);
    const country = sanitizeHtmlString(req.body.country);
    const state = sanitizeHtmlString(req.body.state);
    const city = sanitizeHtmlString(req.body.city);
    const pincode = sanitizeHtmlString(req.body.pincode);
    const full_address = sanitizeHtmlString(req.body.full_address);
    const position = sanitizeHtmlString(req.body.position);
    const position_held_since = req.body.position_held_since;
    const gender = sanitizeHtmlString(req.body.gender);
    const blood_group = sanitizeHtmlString(req.body.blood_group);
    const medical_conditions = sanitizeHtmlString(req.body.medical_conditions);
    const dietary_preferences = sanitizeHtmlString(req.body.dietary_preferences);
    const passport_type = sanitizeHtmlString(req.body.passport_type);
    const passport_number = sanitizeHtmlString(req.body.passport_number);
    const place_of_issue = sanitizeHtmlString(req.body.place_of_issue);
    const expiry_date = req.body.expiry_date;
    const document_type = sanitizeHtmlString(req.body.document_type);
    const document_number = sanitizeHtmlString(req.body.document_number);

    const updatePayload = {
      title,
      first_name,
      middle_name: middle_name || null,
      last_name,
      name: first_name ? `${first_name} ${last_name || ""}` : undefined,
      mobile,
      country,
      state,
      city,
      pincode,
      full_address,
      position,
      position_held_since: position_held_since ? new Date(position_held_since) : null,
      gender,
      blood_group,
      medical_conditions,
      document_number,
      document_type,
      dietary_preferences,
      passport: passport_type || passport_number || place_of_issue || expiry_date
          ? {
            passport_type,
            passport_number,
            place_of_issue,
            expiry_date: expiry_date ? new Date(expiry_date) : null,
          }
          : undefined,
    };

    const documents = { ...(user.documents || {}) };

    if (req.files?.photo?.[0]) {
      const photoKey = await uploadToS3(req.files.photo[0], userId, "profile-photos");
      documents.photo_url = photoKey;
    } else if (req.body.photo_base64) {
      const photoKey = await uploadToS3(req.body.photo_base64, userId, "profile-photos");
      documents.photo_url = photoKey;
    }

    if (req.files?.passport_document?.[0]) {
      const passportKey = await uploadToS3(req.files.passport_document[0], userId, "passport-documents");
      documents.passport_document_url = passportKey;
    } else if (req.body.passport_document_base64) {
      const passportKey = await uploadToS3(req.body.passport_document_base64, userId, "passport-documents");
      documents.passport_document_url = passportKey;
    }

    if (Object.keys(documents).length > 0) updatePayload.documents = documents;

    Object.keys(updatePayload).forEach(key => updatePayload[key] === undefined && delete updatePayload[key]);

    const updatedUser = await User.findOneAndUpdate(
      { id: userId },
      { $set: updatePayload },
      { new: true },
    ).select("-password_hash -__v");

    const pushUser = await User.findOne({ id: userId });

    if (pushUser && pushUser.fcm_token) {
      console.log("🚀 FCM Token mil gaya! Bhej rahe hain:", pushUser.fcm_token);
      try {
        await sendPushNotification(
          pushUser.fcm_token,
          "Profile Updated Successfully! ✅",
          `Hi ${updatedUser.first_name || 'Admin'}, your BRICS 2026 profile has been updated.`
        );
        console.log("✅ Backend se push notification send ho gaya!");
      } catch (pushErr) {
        if (pushErr.message.includes('Requested entity was not found') || pushErr.code === 'messaging/registration-token-not-registered') {
           console.warn(`⚠️ Token expired for user ${userId}. Clearing token from DB.`);
           await User.findOneAndUpdate({ id: userId }, { $unset: { fcm_token: "" } });
        } else {
           console.error("❌ Auto-Push Firebase Error:", pushErr.message || pushErr);
        }
      }
    } else {
      console.log("⚠️ PUSH FAILED: User ke pass fcm_token nahi hai DB mein!");
    }

    await Activity.logActivity({
      activityType: "PROFILE_UPDATE",
      description: `User updated their profile`,
      userId: user.id,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get("user-agent"),
      status: "SUCCESS",
    });

    return res.json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    console.error("updateMyProfile error:", err);
    return res.status(500).json({ message: "Unable to update profile" });
  }
};





const canUpdateUser = async (authUserId, authRoleId, targetUserId) => {
  try {
    // If updating self, always allowed
    if (authUserId === targetUserId) {
      return { allowed: true, reason: "Updating own profile" };
    }

    // Get auth user role
    const authRole = await Role.findOne({ id: authRoleId });
    if (!authRole) {
      console.error("Auth role not found for ID:", authRoleId);
      return { allowed: false, reason: "Auth role not found" };
    }

    // SUPER ADMIN can update anyone - regardless of event membership
    const normalizedRoleName = authRole.name
      .toUpperCase()
      .replace(/[\s_-]/g, "");
    if (normalizedRoleName === "SUPERADMIN") {
      return { allowed: true, reason: "Super Admin can update any user" };
    }

    // Get target user
    const targetUser = await User.findOne({ id: targetUserId });
    if (!targetUser) {
      return { allowed: false, reason: "Target user not found" };
    }

    const targetRole = await Role.findOne({ id: targetUser.role_id });
    if (!targetRole) {
      return { allowed: false, reason: "Target user role not found" };
    }

    // EVENT MANAGER can update DAOs and Delegates
    if (
      authRole.name === "EVENT MANAGER" ||
      authRole.name === "EVENT_MANAGER" ||
      authRole.name === "EVENTMANAGER"
    ) {
      if (
        [
          "DAO",
          "DELEGATE",
          "HEAD OF DELEGATE",
          "HEADOFDELEGATE",
          "SECURITY OFFICER",
          "INTERPRETER",
          "MEDIA",
          "DEPUTY",
          "DELEGATION CONTACT OFFICER",
          "SPEAKER",
        ].includes(targetRole.name)
      ) {
        return { allowed: true, reason: "Event Manager can update this role" };
      }
      return {
        allowed: false,
        reason: "Event Manager cannot update this role",
      };
    }

    // DAO can only update Delegates they invited
    if (authRole.name === "DAO") {
      if (
        [
          "DELEGATE",
          "HEAD OF DELEGATE",
          "HEADOFDELEGATE",
          "SECURITY OFFICER",
          "INTERPRETER",
          "MEDIA",
          "DEPUTY",
          "DELEGATION CONTACT OFFICER",
          "SPEAKER",
        ].includes(targetRole.name)
      ) {
        // Check if DAO and delegate are in the same event
        const daoEvents = await UserEvent.find({ user_id: authUserId });
        const targetEvents = await UserEvent.find({ user_id: targetUserId });

        // Check for common events
        const commonEvent = daoEvents.find((daoEvent) =>
          targetEvents.some(
            (targetEvent) => targetEvent.event_id === daoEvent.event_id,
          ),
        );

        if (commonEvent) {
          return {
            allowed: true,
            reason: "DAO can update delegates in same event",
          };
        }
        return {
          allowed: false,
          reason: "You are not in the same event as this delegate",
        };
      }
      return { allowed: false, reason: "DAO cannot update this role" };
    }

    // DELEGATE, HEAD OF DELEGATE, SECURITY OFFICER, INTERPRETER, MEDIA, DEPUTY, DELEGATION CONTACT OFFICER can only update themselves (already checked above)
    return { allowed: false, reason: "Delegates cannot update other users" };
  } catch (error) {
    console.error("canUpdateUser error:", error);
    return { allowed: false, reason: "Permission check failed" };
  }
};


export const updateUserProfile = async (req, res) => {
  try {
    const authUserId = req.user?.user_id;
    const { userId } = req.params;

    if (!authUserId) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const authUser = await User.findOne({ id: authUserId });
    if (!authUser) {
      return res.status(401).json({ message: "User not found" });
    }

    const authRoleId = authUser.role_id;
    const targetUserId = userId || authUserId;

    const permission = await canUpdateUser(authUserId, authRoleId, targetUserId);
    if (!permission.allowed) {
      return res.status(403).json({ message: permission.reason });
    }

    const user = await User.findOne({ id: targetUserId });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const updatePayload = {
      title: sanitizeHtmlString(req.body.title),
      first_name: sanitizeHtmlString(req.body.first_name),
      middle_name: req.body.middle_name ? sanitizeHtmlString(req.body.middle_name) : null,
      last_name: sanitizeHtmlString(req.body.last_name),
      name: req.body.first_name ? `${sanitizeHtmlString(req.body.first_name)} ${sanitizeHtmlString(req.body.last_name || "")}`.trim() : undefined,
      mobile: sanitizeHtmlString(req.body.mobile),
      country: sanitizeHtmlString(req.body.country),
      state: sanitizeHtmlString(req.body.state),
      city: sanitizeHtmlString(req.body.city),
      pincode: sanitizeHtmlString(req.body.pincode),
      full_address: sanitizeHtmlString(req.body.full_address),
      position: sanitizeHtmlString(req.body.position),
      position_held_since: req.body.position_held_since ? new Date(req.body.position_held_since) : null,
      gender: sanitizeHtmlString(req.body.gender),
      blood_group: sanitizeHtmlString(req.body.blood_group),
      medical_conditions: sanitizeHtmlString(req.body.medical_conditions),
      document_number: sanitizeHtmlString(req.body.document_number),
      document_type: sanitizeHtmlString(req.body.document_type),
      dietary_preferences: sanitizeHtmlString(req.body.dietary_preferences),
      passport: (req.body.passport_type || req.body.passport_number) ? {
        passport_type: sanitizeHtmlString(req.body.passport_type),
        passport_number: sanitizeHtmlString(req.body.passport_number),
        place_of_issue: sanitizeHtmlString(req.body.place_of_issue),
        expiry_date: req.body.expiry_date ? new Date(req.body.expiry_date) : null,
      } : undefined
    };

    const documents = { ...(user.documents || {}) };
    if (req.files?.photo?.[0]) {
      documents.photo_url = await uploadToS3(req.files.photo[0], targetUserId, "profile-photos");
    } else if (req.body.photo_base64) {
      documents.photo_url = await uploadToS3(req.body.photo_base64, targetUserId, "profile-photos");
    }

    if (req.files?.passport_document?.[0]) {
      documents.passport_document_url = await uploadToS3(req.files.passport_document[0], targetUserId, "passport-documents");
    } else if (req.body.passport_document_base64) {
      documents.passport_document_url = await uploadToS3(req.body.passport_document_base64, targetUserId, "passport-documents");
    }

    if (Object.keys(documents).length > 0) updatePayload.documents = documents;

    Object.keys(updatePayload).forEach(key => updatePayload[key] === undefined && delete updatePayload[key]);

    const updatedUser = await User.findOneAndUpdate(
      { id: targetUserId },
      { $set: updatePayload },
      { new: true },
    ).select("-password_hash -__v");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found during update" });
    }

    if (updatedUser.fcm_token) {
      try {
        await sendPushNotification(
          updatedUser.fcm_token,
          "Profile Updated 🛡️",
          "An administrator has updated your profile details. Log in to review the changes."
        );
      } catch (pushErr) {
        if (pushErr.message.includes('Requested entity was not found') || pushErr.code === 'messaging/registration-token-not-registered') {
           console.warn(`⚠️ Token expired for target user ${targetUserId}. Clearing token from DB.`);
           await User.findOneAndUpdate({ id: targetUserId }, { $unset: { fcm_token: "" } });
        }
        console.warn("FCM Notification failed but profile saved:", pushErr.message);
      }
    }

    const userObj = updatedUser.toObject();
    if (userObj.documents?.photo_url) userObj.documents.photo_url = await getSignedS3Url(userObj.documents.photo_url);
    if (userObj.documents?.passport_document_url) userObj.documents.passport_document_url = await getSignedS3Url(userObj.documents.passport_document_url);

    await Activity.logActivity({
      activityType: "PROFILE_UPDATE",
      description: `Admin (${authUser.email}) updated profile for ${updatedUser.email}`,
      userId: authUserId,
      targetUserId: updatedUser.id,
      status: "SUCCESS",
      resourceType: "USER",
      resourceId: updatedUser._id
    });

    return res.json({
      message: "Profile updated successfully",
      user: userObj,
    });

  } catch (err) {
    console.error("updateUserProfile error:", err);
    return res.status(500).json({ message: "Internal server error", error: err.message });
  }
};


export const verifyQrAccreditation = async (req, res) => {
  try {
    const { accreditationId } = req.params;

    if (!accreditationId) {
      return res.status(400).json({
        message: "Accreditation ID is required",
        verified: false,
      });
    }

    const userEvent = await UserEvent.findOne({ _id: accreditationId });
    if (!userEvent) {
      return res.status(404).json({
        message: "Invalid or expired QR code",
        verified: false,
      });
    }

    const user = await User.findOne({ id: userEvent?.user_id });
    if (!user) {
      return res.status(404).json({
        message: "Associated user not found",
        verified: false,
      });
    }

    const event = await Event.findById(userEvent.event_id);
    if (!event) {
      return res.status(404).json({
        message: "Associated event not found",
        verified: false,
      });
    }

    try {
      if (!userEvent.attended) {
        userEvent.attended = true;
        userEvent.check_in_time = new Date();
        await userEvent.save();
      }

      if (user.fcm_token) {
        await sendPushNotification(
          user.fcm_token,
          "Check-in Successful! ✅",
          `Welcome ${user.first_name || ''}! Your QR verification for ${event.name} is successful.`
        );
        console.log(`✅ Push sent to Delegate (${user.email}) for successful Check-in.`);
      }
    } catch (pushErr) {
      console.error("❌ Failed to push Check-in notice:", pushErr.message);
    }
    const userObj = user.toObject();

    if (userObj.documents?.photo_url) {
      userObj.documents.photo_url = await getSignedS3Url(
        userObj.documents.photo_url,
      );
    }

    return res.status(200).json({
      message: "QR verified successfully",
      verified: true,
      user: userObj, 
      event,
      accreditation: userEvent,
    });
  } catch (err) {
    console.error("QR verification error:", err);
    return res.status(500).json({
      message: "Unable to verify QR at the moment. Please try again.",
      verified: false,
    });
  }
};


export const inviteDelegateToEvent = async (req, res) => {
  try {
    const inviterUserId = req.user.user_id;
    const { event_id, delegates, daoId } = req.body;

    if (!event_id || !Array.isArray(delegates) || delegates.length === 0) {
      return res.status(400).json({
        message: "event_id and delegates are required",
      });
    }

    const event = await Event.findById(event_id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const inviterUser = await User.findOne({ id: inviterUserId });
    if (!inviterUser) {
      return res.status(404).json({ message: "Inviter user not found" });
    }

    const inviterRole = await Role.findOne({ id: inviterUser.role_id });
    const inviterRoleName = inviterRole?.name || null;

    let delegateCreatorId = inviterUserId;

    if (daoId) {
      if (!["SUPER ADMIN", "EVENT MANAGER"].includes(inviterRoleName)) {
        return res.status(403).json({
          message: "Only Super Admin or Event Manager can assign delegates to a DAO",
        });
      }

      const daoUser = await User.findOne({ id: daoId });
      if (!daoUser) {
        return res.status(404).json({ message: "Specified DAO not found" });
      }

      const daoRole = await Role.findOne({ id: daoUser.role_id });
      if (!daoRole || daoRole.name !== "DAO") {
        return res.status(400).json({
          message: "Specified user is not a DAO",
        });
      }

      const daoUserEvent = await UserEvent.findOne({
        user_id: daoId,
        event_id: event_id,
      });

      if (!daoUserEvent) {
        return res.status(400).json({
          message: "Specified DAO is not part of this event",
        });
      }

      delegateCreatorId = daoId;
    }

    const results = [];

    for (const delegate of delegates) {
      const firstName = sanitizeHtmlString(delegate.firstName);
      const middleName = sanitizeHtmlString(delegate.middleName || "");
      const lastName = sanitizeHtmlString(delegate.lastName || "");
      const email = sanitizeHtmlString(delegate.email);
      const inviteAs = sanitizeHtmlString(delegate.inviteAs);

      if (!firstName || !email || !inviteAs) {
        results.push({
          email,
          status: "failed",
          reason: "First name, email and role are required",
        });
        continue;
      }

      const delegateRole = await Role.findOne({ name: inviteAs });
      if (!delegateRole) {
        results.push({ email, status: "failed", reason: "Role not found" });
        continue;
      }

      const normalizedEmail = email.toLowerCase().trim();
      const delegateName = capitalizeName(`${firstName} ${lastName}`.trim());
      const now = new Date();

      let user = await User.findOne({ email: normalizedEmail });

      if (!user) {
        user = await User.create({
          id: uuidv4(),
          user_code: `USR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          email: normalizedEmail,
          role_id: delegateRole.id,
          first_name: firstName,
          middle_name: middleName,
          last_name: lastName,
          name: delegateName,
          created_by: inviterUserId,
        });
      } else {
        const currentSystemRole = await Role.findOne({ id: user.role_id });
        if (currentSystemRole) {
          const currentPower = ROLE_POWER[currentSystemRole.name] ?? -1;
          const newPower = ROLE_POWER[inviteAs] ?? -1;

          if (newPower >= currentPower && currentSystemRole.name !== inviteAs) {
            user.role_id = delegateRole.id;
            await user.save();
          }
        }
      }

      const userEvent = await UserEvent.findOne({
        user_id: user.id,
        event_id,
      });

      const safeEventName = sanitizeHtmlString(event.name);
      const safeVenue = sanitizeHtmlString(event.venue);

      if (userEvent && userEvent.role === inviteAs) {
        await sendEmail({
          to: normalizedEmail,
          subject: `Already Registered – ${safeEventName}`,
          html: `Dear ${delegateName}, You are already registered for ${safeEventName}.`,
        });

        results.push({ email: normalizedEmail, status: "resent", delegate_name: delegateName }); // Status set to 'resent' for Matrix
        continue;
      }

      if (userEvent) {
        const existingPower = ROLE_POWER[userEvent.role] ?? -1;
        const newPower = ROLE_POWER[inviteAs] ?? -1;

        if (newPower >= existingPower) {
          userEvent.role = inviteAs;
          userEvent.status = "confirmed";
          await userEvent.save();

          results.push({ 
            email: normalizedEmail, 
            status: "role_updated",
            delegate_name: delegateName 
          });
        } else {
          results.push({ email: normalizedEmail, status: "role_not_promoted" });
        }
        continue;
      }

      const newUserEvent = await UserEvent.create({
        user_id: user.id,
        event_id,
        registration_id: generateRegistrationId(),
        role: inviteAs,
        status: "confirmed",
        attended: false,
        created_by: delegateCreatorId,
      });

      await sendEmail({
        to: normalizedEmail,
        subject: `Invitation to Attend ${safeEventName}`,
        html: delegateInviteTemplate({
          name: delegateName,
          eventName: safeEventName,
          start: formatDateTime(event.start_date),
          end: formatDateTime(event.end_date),
          venue: safeVenue || "Venue to be communicated",
        }),
      });

      results.push({ 
        email: normalizedEmail, 
        status: "invited",
        delegate_name: delegateName 
      });
    }

    try {
      if (inviterUser && inviterUser.fcm_token) {
        const successDelegates = results.filter(r => ["invited", "role_updated", "resent"].includes(r.status));
        
        if (successDelegates.length > 0) {
          const delegateNamesList = successDelegates.map(d => d.delegate_name || d.email).join(", ");
          
          const notifTitle = "Delegates Processed 📩";
          const notifBody = `Delegate ${delegateNamesList} invited / resent for the event ${event.name}.`;

          await sendPushNotification(inviterUser.fcm_token, notifTitle, notifBody);
          console.log(`✅ Push sent to Inviter (${inviterUser.email}) for Delegate(s) processing.`);
        }
      }
    } catch (pushErr) {
      console.error("❌ Failed to push Delegate Invitation notice:", pushErr.message);
    }

    await Activity.logActivity({
      activityType: "EMAIL_SENT",
      description: `Invited ${results.length} delegates to event`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get("user-agent"),
      status: "SUCCESS",
      resourceType: "EVENT",
      resourceId: event._id,
      metadata: {
        eventId: event_id,
        delegateCount: results.length,
        eventName: event.name,
      },
    });

    return res.json({
      message: "Delegates processed successfully",
      event_id,
      delegates: results,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};


const formatTimeAMPM = (time24) => {
  if (!time24) return "";

  const [hour, minute] = time24.split(":").map(Number);
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;

  return `${hour12}:${minute.toString().padStart(2, "0")} ${period}`;
};

const formatDateTime = (date) => {
  if (!date) return "";

  const d = new Date(date);
  d.setHours(0, 0, 0, 0); // Reset time to midnight

  const datePart = d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return `${datePart}`;
};

export const inviteDaoToEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { daos } = req.body;

    if (!Array.isArray(daos) || daos.length === 0) {
      return res.status(400).json({ message: "DAO list is required" });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    const daoRole = await Role.findOne({ name: "DAO" });
    if (!daoRole) {
      return res.status(500).json({ message: "DAO role not configured" });
    }

    const assignedDaos = [];
    const skipped = [];

    for (const dao of daos) {
      if (!dao.firstName || !dao.email) {
        skipped.push(dao.email || "unknown");
        continue;
      }

      const safeFirstName = sanitizeHtmlString(dao.firstName);
      const safeMiddleName = sanitizeHtmlString(dao.middleName || "");
      const safeLastName = sanitizeHtmlString(dao.lastName || "");
      const normalizedEmail = dao.email.toLowerCase().trim();
      const safeCountry = dao.country
        ? sanitizeHtmlString(dao.country)
        : undefined;
      const safeCitizenship = dao.citizenship
        ? sanitizeHtmlString(dao.citizenship)
        : undefined;
      const safeOrganisation = dao.organisation
        ? sanitizeHtmlString(dao.organisation)
        : undefined;

      let user = await User.findOne({ email: normalizedEmail });
      let orgChanged = false;

      if (!user) {
        user = await User.create({
          id: uuidv4(),
          user_code: `USR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          role_id: daoRole.id,
          email: normalizedEmail,
          first_name: safeFirstName,
          middle_name: safeMiddleName,
          last_name: safeLastName,
          name: `${safeFirstName} ${safeLastName}`.trim(),
          country: safeCountry,
          citizenship: safeCitizenship,
          organisation: safeOrganisation,
          created_by: req.user.user_id,
        });
      } else {
        const currentSystemRole = await Role.findOne({ id: user.role_id });

        if (!currentSystemRole) {
          return res.status(500).json({
            message: "User system role misconfigured",
          });
        }

        if (ROLE_POWER["DAO"] > ROLE_POWER[currentSystemRole.name]) {
          user.role_id = daoRole.id;
        }

        if (safeOrganisation && user.organisation !== safeOrganisation) {
          user.organisation = safeOrganisation;
          orgChanged = true;
        }

        await user.save();
      }

      const existingMapping = await UserEvent.findOne({
        user_id: user.id,
        event_id: eventId,
      });

      const daoName = capitalizeName(`${safeFirstName} ${safeLastName}`);
      const logo = process.env.BRICS_LOGO_URL;
      const portalUrl = `${process.env.FRONTEND_URL}/login`;
      const safeEventName = sanitizeHtmlString(event.name);

      if (existingMapping) {
        const existingPower = ROLE_POWER[existingMapping.role] ?? -1;
        const daoPower = ROLE_POWER["DAO"];

        if (existingMapping.role === "DAO") {
          if (orgChanged) {
            assignedDaos.push({
              user_id: user.id,
              email: normalizedEmail,
              registration_id: existingMapping.registration_id,
              status: "organisation_updated",
              email_sent: false,
              dao_name: daoName 
            });
            continue;
          }

          await sendEmail({
            to: normalizedEmail,
            subject: `Already Registered – ${safeEventName}`,
            html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td align="center" style="padding:50px 20px;">
<table width="520" cellpadding="0" cellspacing="0">
<tr>
<td style="padding:20px 30px;">
<img src="${logo}" width="150" style="display:block;margin:0 auto 25px;" />
<p>Dear ${daoName},</p>
<p>You are already registered for <strong>${safeEventName}</strong> as <strong>DAO</strong>.</p>
<p>No further action is required.</p>
<div style="margin:30px 0;">
<a href="${portalUrl}" style="background:#f37021;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;">Accreditation Portal Link</a>
</div>
<p style="color:#bfbfbf;">Regards,<br/>Admin BRICS INDIA</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>
`,
          });

          skipped.push(normalizedEmail);
          continue;
        }

        if (daoPower > existingPower) {
          const oldRole = existingMapping.role;
          existingMapping.status = "confirmed";
          existingMapping.attended = true;
          await existingMapping.save();

          await sendEmail({
            to: normalizedEmail,
            subject: `Role Updated – ${safeEventName}`,
            html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td align="center" style="padding:50px 20px;">
<table width="520">
<tr>
<td style="padding:20px 30px;">
<img src="${logo}" width="150" style="display:block;margin:0 auto 25px;" />
<p>Dear ${daoName},</p>
<p>You were earlier registered as <strong>${oldRole}</strong>.</p>
<p>Your role has now been <strong>upgraded to DAO</strong>.</p>
<div style="margin:30px 0;">
<a href="${portalUrl}" style="background:#f37021;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;">Accreditation Portal Link</a>
</div>
<p style="color:#bfbfbf;">Regards,<br/>Admin BRICS INDIA</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>
`,
          });

          assignedDaos.push({
            user_id: user.id,
            email: normalizedEmail,
            registration_id: existingMapping.registration_id,
            status: "role_promoted",
            email_sent: true,
            dao_name: daoName 
          });
          continue;
        }

        await sendEmail({
          to: normalizedEmail,
          subject: `Role Information – ${safeEventName}`,
          html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td align="center" style="padding:50px 20px;">
<table width="520">
<tr>
<td style="padding:20px 30px;">
<img src="${logo}" width="150" style="display:block;margin:0 auto 25px;" />
<p>Dear ${daoName},</p>
<p>You already hold a higher role (<strong>${existingMapping.role}</strong>) for this event.</p>
<p>The requested role <strong>DAO</strong> does not supersede your existing role.</p>
<div style="margin:30px 0;">
<a href="${portalUrl}" style="background:#f37021;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;">Accreditation Portal Link</a>
</div>
<p style="color:#bfbfbf;">Regards,<br/>Admin BRICS INDIA</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>
`,
        });

        skipped.push(normalizedEmail);
        continue;
      }

      const userEvent = await UserEvent.create({
        user_id: user.id,
        event_id: eventId,
        registration_id: generateRegistrationId(),
        role: "DAO",
        status: "invited",
        attended: false,
        check_in_time: null,
        check_out_time: null,
        created_by: req.user.user_id,
      });

      try {
        await sendEmail({
          to: normalizedEmail,
          subject: `Invitation to Undertake Delegate Accreditation – ${safeEventName}`,
          html: daoInviteTemplate({
            name: daoName,
            eventName: safeEventName,
            start: formatDateTime(event.start_date),
            end: formatDateTime(event.end_date),
            venue: sanitizeHtmlString(
              event.venue || "Venue to be communicated",
            ),
          }),
        });

        assignedDaos.push({
          user_id: user.id,
          email: normalizedEmail,
          registration_id: userEvent.registration_id,
          status: "assigned",
          email_sent: true,
          dao_name: daoName 
        });
      } catch {
        assignedDaos.push({
          user_id: user.id,
          email: normalizedEmail,
          registration_id: userEvent.registration_id,
          status: "assigned",
          email_sent: false,
          dao_name: daoName 
        });
      }
    }

    try {
      const inviter = await User.findOne({ id: req.user.user_id });
      
      if (inviter && inviter.fcm_token) {
        const successDaos = assignedDaos.filter(d => 
          d.status === "assigned" || 
          d.status === "role_promoted" || 
          d.status === "organisation_updated" || 
          d.email_sent === true
        );

        if (successDaos.length > 0) {
          const daoNamesList = successDaos.map(d => d.dao_name || d.email.split('@')[0]).join(", ");
          
          const notifTitle = "DAO Invited 📩";
          const notifBody = `DAO ${daoNamesList} invited for the event ${event.name}`;

          await sendPushNotification(inviter.fcm_token, notifTitle, notifBody);
          console.log(`✅ Push sent to Inviter (${inviter.email}) regarding DAO invitation.`);
        }
      }
    } catch (pushErr) {
      console.error("❌ Failed to push DAO Invitation notice:", pushErr.message);
    }

    await Activity.logActivity({
      activityType: "EMAIL_SENT",
      description: `Invited ${assignedDaos.length} DAOs to event`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get("user-agent"),
      status: "SUCCESS",
      resourceType: "EVENT",
      resourceId: event._id,
      metadata: {
        eventId: eventId,
        daoCount: assignedDaos.length,
        eventName: event.name,
      },
    });

    return res.status(201).json({
      message: "DAO assigned to event successfully",
      event_id: eventId,
      assigned_count: assignedDaos.length,
      skipped,
      daos: assignedDaos,
    });
  } catch (error) {
    console.error("inviteDaoToEvent error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const generateRegistrationId = () => {
  return `REG-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
};

// generateOpenInviteSingle
// - Expects: { delegate: { firstName, lastName, email, inviteAs }, expires_in_days? }
// - Creates/updates User (is_active=false, status='inactive')
// - Creates UserEvent with status='invited' (inactive/pending approval)
// - Stores token in Event.invites and returns link (no email sent)

export const saveOpenInvitedetails = async (req, res) => {
  try {
    const { event_id } = req.params;

    // ===== FLAT PAYLOAD FROM FORMDATA =====
    const {
      firstName,
      lastName,
      email,
      phoneCountry,
      phone,
      gender,
      dob,
      country,
      inviteAs,
      docType,
      docNumber,
      declaration1,
      declaration2,
      inviteToken,
      expires_in_days = 7,
    } = req.body;

    if (!event_id || !firstName || !email || !inviteAs || !inviteToken) {
      return res.status(400).json({
        message:
          "event_id, firstName, email, inviteAs and inviteToken are required",
      });
    }

    // ===== FIND EVENT =====
    const event = await Event.findById(event_id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // ===== VALIDATE INVITE TOKEN =====
    const now = new Date();
    const invite = event.invites?.find(
      (inv) =>
        inv.token === inviteToken &&
        (!inv.expires_at || new Date(inv.expires_at) > now),
    );

    if (!invite) {
      return res
        .status(400)
        .json({ message: "Invalid or expired invite token" });
    }

    // ===== SANITIZE =====
    const firstNameClean = sanitizeHtmlString(firstName || "");
    const lastNameClean = sanitizeHtmlString(lastName || "");
    const emailRaw = sanitizeHtmlString(email || "");
    const inviteAsClean = sanitizeHtmlString(inviteAs || "");

    const normalizedEmail = emailRaw.toLowerCase().trim();
    const delegateName = capitalizeName(
      `${firstNameClean} ${lastNameClean || ""}`.trim(),
    );

    // ===== ROLE =====
    const roleDoc = await Role.findOne({ name: "DELEGATE" });
    if (!roleDoc) {
      return res.status(400).json({ message: "Role not found" });
    }

    // ===== CREATE / UPDATE USER =====
    let user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      user = await User.create({
        id: uuidv4(),
        user_code: `USR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        email: normalizedEmail,
        role_id: roleDoc.id,

        first_name: firstNameClean,
        last_name: lastNameClean,
        name: delegateName,
        gender: gender || null,
        date_of_birth: dob || null,
        mobile: phoneCountry ? `${phoneCountry}${phone}` : phone,
        country: country || null,

        document_type: docType || null,
        document_number: docNumber || null,

        // NEW: Open Invite Fields
        registration_source: "open_invite",
        account_status: "pending", // Cannot login until approved
        created_by: event_id, // Store event_id
      });
    } else {
      user.first_name = firstNameClean;
      user.last_name = lastNameClean;
      user.name = delegateName;
      user.gender = gender || user.gender;
      user.date_of_birth = dob || user.date_of_birth;
      user.mobile = phoneCountry ? `${phoneCountry}${phone}` : phone;
      user.country = country || user.country;
      user.document_type = docType || user.document_type;
      user.document_number = docNumber || user.document_number;

      // Update to open_invite if not already
      if (!user.registration_source || user.registration_source === "normal") {
        user.registration_source = "open_invite";
        user.account_status = "pending";
        user.created_by = event_id;
      }
    }

    // ===== DOCUMENT UPLOAD (File OR Base64) =====
    const documents = {};

    // PASSPORT DOCUMENT - Accept file upload OR base64 string
    if (req.files?.passport_document?.[0]) {
      const passportKey = await uploadToS3(
        req.files.passport_document[0],
        user.id,
        "passport-documents",
      );
      documents.passport_document_url = passportKey;
    } else if (req.body.passport_document_base64) {
      const passportKey = await uploadToS3(
        req.body.passport_document_base64,
        user.id,
        "passport-documents",
      );
      documents.passport_document_url = passportKey;
    }

    // PROFILE PHOTO - Accept file upload OR base64 string
    if (req.files?.photo?.[0]) {
      const photoKey = await uploadToS3(
        req.files.photo[0],
        user.id,
        "profile-photos",
      );
      documents.photo_url = photoKey;
    } else if (req.body.photo_base64) {
      const photoKey = await uploadToS3(
        req.body.photo_base64,
        user.id,
        "profile-photos",
      );
      documents.photo_url = photoKey;
    }

    if (Object.keys(documents).length > 0) {
      user.documents = {
        ...(user.documents || {}),
        ...documents,
      };
    }

    await user.save();

    return res.json({
      message: "User details submitted successfully",
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        mobile: user.mobile,
        country: user.country,
        registration_source: user.registration_source,
        account_status: user.account_status,
      },
    });
  } catch (error) {
    console.error("saveOpenInvitedetails error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* =========================================================
   ACTIVATE / DEACTIVATE USER (SUPER ADMIN & EVENT MANAGER)
   =========================================================
   - Allows SUPER ADMIN and EVENT MANAGER to change user status
   - If target is DAO, cascades to all their delegates
   - Tracks manual vs cascade deactivation
   ========================================================= */
export const activateDeactivateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { action } = req.body; // 'activate' or 'deactivate'
    const authUserId = req.user.user_id;

    // Validate action
    if (!action || !["activate", "deactivate"].includes(action)) {
      return res.status(400).json({
        message: "Action must be 'activate' or 'deactivate'",
      });
    }

    // Get authenticated user
    const authUser = await User.findOne({ id: authUserId });
    if (!authUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Check auth user role
    const authRole = await Role.findOne({ id: authUser.role_id });
    if (
      !authRole ||
      !["SUPER ADMIN", "EVENT MANAGER"].includes(authRole.name)
    ) {
      return res.status(403).json({
        message:
          "Access denied. Only Super Admin and Event Manager can perform this action.",
      });
    }

    // Get target user
    const targetUser = await User.findOne({ id: userId });
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get target user role
    const targetRole = await Role.findOne({ id: targetUser.role_id });
    if (!targetRole) {
      return res.status(500).json({ message: "User role not configured" });
    }

    // Prevent modifying SUPER ADMIN (only SUPER ADMIN can modify other SUPER ADMINs)
    if (targetRole.name === "SUPER ADMIN" && authRole.name !== "SUPER ADMIN") {
      return res.status(403).json({
        message: "Only Super Admin can modify other Super Admin accounts",
      });
    }

    const newStatus = action === "activate" ? "active" : "blocked";
    const affectedUsers = [];

    // Update target user
    targetUser.account_status = newStatus;

    // If manually deactivating/activating, mark it
    if (action === "deactivate") {
      targetUser.deactivated_manually = true;
    } else if (action === "activate") {
      // When activating, reset manual flag
      targetUser.deactivated_manually = false;
    }

    await targetUser.save();

    affectedUsers.push({
      user_id: targetUser.id,
      email: targetUser.email,
      name: targetUser.name,
      role: targetRole.name,
      status: newStatus,
      action_type: "direct",
    });

    // If target is DAO, cascade to their delegates
    if (targetRole.name === "DAO") {
      // Find all delegates created by this DAO across all events
      const delegateUserEvents = await UserEvent.find({
        created_by: userId,
      });

      if (delegateUserEvents.length > 0) {
        const delegateUserIds = [
          ...new Set(delegateUserEvents.map((ue) => ue.user_id)),
        ];
        const delegates = await User.find({ id: { $in: delegateUserIds } });

        for (const delegate of delegates) {
          if (action === "deactivate") {
            // Cascade deactivate: mark as NOT manually deactivated
            delegate.account_status = "blocked";
            delegate.deactivated_manually = false; // Cascade deactivation
            await delegate.save();

            affectedUsers.push({
              user_id: delegate.id,
              email: delegate.email,
              name: delegate.name,
              role: "DELEGATE",
              status: "blocked",
              action_type: "cascade",
            });
          } else if (action === "activate") {
            // Only reactivate delegates that were NOT manually deactivated
            if (!delegate.deactivated_manually) {
              delegate.account_status = "active";
              await delegate.save();

              affectedUsers.push({
                user_id: delegate.id,
                email: delegate.email,
                name: delegate.name,
                role: "DELEGATE",
                status: "active",
                action_type: "cascade",
              });
            } else {
              // Skip manually deactivated delegates
              affectedUsers.push({
                user_id: delegate.id,
                email: delegate.email,
                name: delegate.name,
                role: "DELEGATE",
                status: "blocked",
                action_type: "skipped_manual_deactivation",
              });
            }
          }
        }
      }
    }

    // Log activity
    await Activity.logActivity({
      activityType:
        action === "activate" ? "USER_ACTIVATED" : "USER_DEACTIVATED",
      description: `${authRole.name} ${action}d user ${targetUser.email} (${targetRole.name})`,
      userId: authUserId,
      targetUserId: userId,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get("user-agent"),
      status: "SUCCESS",
      metadata: {
        affected_users_count: affectedUsers.length,
        target_role: targetRole.name,
      },
    });

    return res.json({
      message: `User ${action}d successfully`,
      affected_users: affectedUsers,
      total_affected: affectedUsers.length,
    });
  } catch (error) {
    console.error("activateDeactivateUser error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const inviteBulkDaosToEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { daos } = req.body;

    /* ================= VALIDATION ================= */
    if (!Array.isArray(daos) || daos.length === 0) {
      return res
        .status(400)
        .json({ message: "DAO list is required and must not be empty" });
    }

    /* ================= EVENT ================= */
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    /* ================= DAO ROLE ================= */
    const daoRole = await Role.findOne({ name: "DAO" });
    if (!daoRole) {
      return res.status(500).json({ message: "DAO role not configured" });
    }

    const assignedDaos = [];
    const skipped = [];
    const failed = [];
    let emailsSent = 0;
    let emailsFailed = 0;

    /* ================= BULK PROCESS ================= */
    for (let index = 0; index < daos.length; index++) {
      const dao = daos[index];

      try {
        /* ================= FIELD VALIDATION ================= */
        if (!dao.firstName || !dao.email) {
          skipped.push({
            index: index + 1,
            email: dao.email || "unknown",
            reason: "Missing required fields: firstName and email",
          });
          continue;
        }

        /* ================= SANITIZATION ================= */
        const safeFirstName = sanitizeHtmlString(dao.firstName);
        const safeMiddleName = sanitizeHtmlString(dao.middleName || "");
        const safeLastName = sanitizeHtmlString(dao.lastName || "");
        const normalizedEmail = dao.email.toLowerCase().trim();
        const safeTitle = dao.title ? sanitizeHtmlString(dao.title) : undefined;
        const safeMobile = dao.mobile
          ? sanitizeHtmlString(dao.mobile)
          : undefined;
        const safeCountry = dao.country
          ? sanitizeHtmlString(dao.country)
          : undefined;
        const safeState = dao.state ? sanitizeHtmlString(dao.state) : undefined;
        const safeCity = dao.city ? sanitizeHtmlString(dao.city) : undefined;
        const safeOrganisation = dao.organisation
          ? sanitizeHtmlString(dao.organisation)
          : undefined;
        const safePosition = dao.position
          ? sanitizeHtmlString(dao.position)
          : undefined;
        const safeGender = dao.gender
          ? sanitizeHtmlString(dao.gender)
          : undefined;
        const safeNationality = dao.nationality
          ? sanitizeHtmlString(dao.nationality)
          : undefined;
        const safeCitizenship = dao.citizenship
          ? sanitizeHtmlString(dao.citizenship)
          : undefined;
        const safeBloodGroup = dao.bloodGroup
          ? sanitizeHtmlString(dao.bloodGroup)
          : undefined;
        const safeMedicalConditions = dao.medicalConditions
          ? sanitizeHtmlString(dao.medicalConditions)
          : undefined;
        const safeDietaryPreferences = dao.dietaryPreferences
          ? sanitizeHtmlString(dao.dietaryPreferences)
          : undefined;

        /* ================= USER ================= */
        let user = await User.findOne({ email: normalizedEmail });

        if (!user) {
          user = await User.create({
            id: uuidv4(),
            user_code: `USR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            role_id: daoRole.id,
            email: normalizedEmail,
            first_name: safeFirstName,
            middle_name: safeMiddleName,
            last_name: safeLastName,
            name: `${safeFirstName} ${safeLastName}`.trim(),
            title: safeTitle,
            mobile: safeMobile,
            country: safeCountry,
            state: safeState,
            city: safeCity,
            organisation: safeOrganisation,
            position: safePosition,
            date_of_birth: dao.dateOfBirth ? new Date(dao.dateOfBirth) : null,
            gender: safeGender,
            nationality: safeNationality,
            citizenship: safeCitizenship,
            blood_group: safeBloodGroup,
            medical_conditions: safeMedicalConditions,
            dietary_preferences: safeDietaryPreferences,
            created_by: req.user.user_id,
          });
        } else {
          const currentSystemRole = await Role.findOne({ id: user.role_id });

          if (!currentSystemRole) {
            failed.push({
              index: index + 1,
              email: normalizedEmail,
              reason: "User system role misconfigured",
            });
            continue;
          }

          // Only upgrade system role if DAO has higher power than current role
          if (ROLE_POWER["DAO"] > ROLE_POWER[currentSystemRole.name]) {
            user.role_id = daoRole.id;
            await user.save();
          }
        }

        /* ================= USER EVENT ================= */
        const existingMapping = await UserEvent.findOne({
          user_id: user.id,
          event_id: eventId,
        });

        const daoName = capitalizeName(`${safeFirstName} ${safeLastName}`);
        const logo = process.env.BRICS_LOGO_URL;
        const portalUrl = `${process.env.FRONTEND_URL}/login`;
        const safeEventName = sanitizeHtmlString(event.name);

        // Handle existing event registration
        if (existingMapping) {
          const existingPower = ROLE_POWER[existingMapping.role] ?? -1;
          const daoPower = ROLE_POWER["DAO"];

          // Same role - already registered as DAO
          if (existingMapping.role === "DAO") {
            try {
              await sendEmail({
                to: normalizedEmail,
                subject: `Already Registered – ${safeEventName}`,
                html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td align="center" style="padding:50px 20px;">
<table width="520" cellpadding="0" cellspacing="0">
<tr>
<td style="padding:20px 30px;">
<img src="${logo}" width="150" style="display:block;margin:0 auto 25px;" />
<p>Dear ${daoName},</p>
<p>You are already registered for <strong>${safeEventName}</strong> as <strong>DAO</strong>.</p>
<p>No further action is required.</p>
<div style="margin:30px 0;">
<a href="${portalUrl}" style="background:#f37021;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;">Accreditation Portal Link</a>
</div>
<p style="color:#bfbfbf;">Regards,<br/>Admin BRICS INDIA</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>
`,
              });
              emailsSent++;
            } catch (emailError) {
              emailsFailed++;
            }

            skipped.push({
              index: index + 1,
              email: normalizedEmail,
              reason: "Already registered as DAO",
            });
            continue;
          }

          // Role promotion - upgrade to DAO
          if (daoPower > existingPower) {
            const oldRole = existingMapping.role;
            existingMapping.role = "DAO";
            existingMapping.status = "invited";
            await existingMapping.save();

            try {
              await sendEmail({
                to: normalizedEmail,
                subject: `Role Updated – ${safeEventName}`,
                html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td align="center" style="padding:50px 20px;">
<table width="520">
<tr>
<td style="padding:20px 30px;">
<img src="${logo}" width="150" style="display:block;margin:0 auto 25px;" />
<p>Dear ${daoName},</p>
<p>You were earlier registered as <strong>${oldRole}</strong>.</p>
<p>Your role has now been <strong>upgraded to DAO</strong>.</p>
<div style="margin:30px 0;">
<a href="${portalUrl}" style="background:#f37021;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;">Accreditation Portal Link</a>
</div>
<p style="color:#bfbfbf;">Regards,<br/>Admin BRICS INDIA</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>
`,
              });
              emailsSent++;
            } catch (emailError) {
              emailsFailed++;
            }

            assignedDaos.push({
              index: index + 1,
              user_id: user.id,
              email: normalizedEmail,
              registration_id: existingMapping.registration_id,
              status: "role_promoted",
              email_sent: true,
            });
            continue;
          }

          // Already has higher role
          try {
            await sendEmail({
              to: normalizedEmail,
              subject: `Role Information – ${safeEventName}`,
              html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td align="center" style="padding:50px 20px;">
<table width="520">
<tr>
<td style="padding:20px 30px;">
<img src="${logo}" width="150" style="display:block;margin:0 auto 25px;" />
<p>Dear ${daoName},</p>
<p>You already hold a higher role (<strong>${existingMapping.role}</strong>) for this event.</p>
<p>The requested role <strong>DAO</strong> does not supersede your existing role.</p>
<div style="margin:30px 0;">
<a href="${portalUrl}" style="background:#f37021;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;">Accreditation Portal Link</a>
</div>
<p style="color:#bfbfbf;">Regards,<br/>Admin BRICS INDIA</p>
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>
`,
            });
            emailsSent++;
          } catch (emailError) {
            emailsFailed++;
          }

          skipped.push({
            index: index + 1,
            email: normalizedEmail,
            reason: `Already has higher role: ${existingMapping.role}`,
          });
          continue;
        }

        // Create new UserEvent mapping
        const userEvent = await UserEvent.create({
          user_id: user.id,
          event_id: eventId,
          registration_id: generateRegistrationId(),
          role: "DAO",
          status: "invited",
          attended: false,
          check_in_time: null,
          check_out_time: null,
          created_by: req.user.user_id,
        });

        /* ================= EMAIL (SANITIZED) ================= */
        try {
          await sendEmail({
            to: normalizedEmail,
            subject: `Invitation to Undertake Delegate Accreditation – ${safeEventName}`,
            html: daoInviteTemplate({
              name: daoName,
              eventName: safeEventName,
              start: formatDateTime(event.start_date),
              end: formatDateTime(event.end_date),
              venue: sanitizeHtmlString(
                event.venue || "Venue to be communicated",
              ),
            }),
          });

          assignedDaos.push({
            index: index + 1,
            user_id: user.id,
            email: normalizedEmail,
            registration_id: userEvent.registration_id,
            status: "assigned",
            email_sent: true,
          });
          emailsSent++;
        } catch (emailError) {
          assignedDaos.push({
            index: index + 1,
            user_id: user.id,
            email: normalizedEmail,
            registration_id: userEvent.registration_id,
            status: "assigned",
            email_sent: false,
          });
          emailsFailed++;
        }
      } catch (daoError) {
        console.error(`Error processing DAO at index ${index + 1}:`, daoError);
        failed.push({
          index: index + 1,
          email: dao.email || "unknown",
          reason: daoError.message,
        });
      }
    }

    /* ================= ACTIVITY LOG ================= */
    await Activity.logActivity({
      activityType: "BULK_DAO_IMPORT",
      description: `Bulk imported ${assignedDaos.length} DAOs to event`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get("user-agent"),
      status: "SUCCESS",
      resourceType: "EVENT",
      resourceId: event._id,
      metadata: {
        eventId: eventId,
        totalProcessed: daos.length,
        assignedCount: assignedDaos.length,
        skippedCount: skipped.length,
        failedCount: failed.length,
        emailsSent: emailsSent,
        emailsFailed: emailsFailed,
        eventName: event.name,
      },
    });

    return res.status(201).json({
      message: `Bulk DAO import completed: ${assignedDaos.length} assigned, ${skipped.length} skipped, ${failed.length} failed`,
      event_id: eventId,
      summary: {
        total_processed: daos.length,
        assigned_count: assignedDaos.length,
        skipped_count: skipped.length,
        failed_count: failed.length,
        emails_sent: emailsSent,
        emails_failed: emailsFailed,
      },
      assigned: assignedDaos,
      skipped: skipped,
      failed: failed,
    });
  } catch (error) {
    console.error("inviteBulkDaosToEvent error:", error);

    /* ================= ERROR ACTIVITY LOG ================= */
    await Activity.logActivity({
      activityType: "BULK_DAO_IMPORT",
      description: `Bulk DAO import failed`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get("user-agent"),
      status: "ERROR",
      resourceType: "EVENT",
      resourceId: req.params.eventId,
      metadata: {
        error: error.message,
      },
    });

    return res.status(500).json({
      message: "Internal server error during bulk DAO import",
      error: error.message,
    });
  }
};

export const inviteSpeakersToEvent = async (req, res) => {
  try {
    const inviterUserId = req.user.user_id;
    let { event_id, speakers } = req.body;

    if (!speakers) {
      speakers = req.body;
      event_id = req.body.event_id || req.body.session;
    }

    if (typeof speakers === 'string') {
      try {
        speakers = JSON.parse(speakers);
      } catch (parseErr) {
        return res.status(400).json({
          message: "speakers must be a valid JSON array or object",
          error: parseErr.message
        });
      }
    }

    if (typeof speakers === 'object' && !Array.isArray(speakers)) {
      speakers = [speakers];
    }

    if (!Array.isArray(speakers) || speakers.length === 0) {
      return res.status(400).json({
        message: "speakers array is required",
      });
    }

    const inviterUser = await User.findOne({ id: inviterUserId });
    if (!inviterUser) {
      return res.status(404).json({ message: "Inviter user not found" });
    }

    const inviterRole = await Role.findOne({ id: inviterUser.role_id });
    const inviterRoleName = inviterRole?.name || null;

    if (!["SUPER ADMIN", "EVENT MANAGER"].includes(inviterRoleName)) {
      return res.status(403).json({
        message: "Only Super Admin and Event Manager can create speakers",
      });
    }

    let event = null;
    if (event_id) {
      event = await Event.findById(event_id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
    }

    const speakerRole = await Role.findOne({ name: "SPEAKER" });
    if (!speakerRole) {
      return res.status(500).json({ message: "SPEAKER role not configured" });
    }

    const results = [];
    let emailsSent = 0;
    let emailsFailed = 0;

    for (const speaker of speakers) {
      const firstName = sanitizeHtmlString(speaker.firstName || speaker.first_name || "");
      const middleName = sanitizeHtmlString(speaker.middleName || speaker.middle_name || "");
      const lastName = sanitizeHtmlString(speaker.lastName || speaker.last_name || "");
      const title = sanitizeHtmlString(speaker.title || "");
      const email = sanitizeHtmlString(speaker.email || "");
      const organisationName = sanitizeHtmlString(speaker.organisationName || speaker.organisation || "");
      const designation = sanitizeHtmlString(speaker.designation || "");
      const session = sanitizeHtmlString(speaker.session || speaker.session_id || "");
      const about_yourself = sanitizeHtmlString(speaker.about_yourself || speaker.about || "");
      const linkedin = sanitizeHtmlString(speaker.linkedin || speaker.social_media?.linkedin || "");
      const youtube = sanitizeHtmlString(speaker.youtube || speaker.social_media?.youtube || "");
      const instagram = sanitizeHtmlString(speaker.instagram || speaker.social_media?.instagram || "");
      const twitter = sanitizeHtmlString(speaker.twitter || speaker.social_media?.twitter || "");

      const professional_title = sanitizeHtmlString(speaker.professional_title || "");
      const country = sanitizeHtmlString(speaker.country || "");
      const blood_group = sanitizeHtmlString(speaker.blood_group || speaker.bloodGroup || "");
      const dietary_preferences = sanitizeHtmlString(speaker.dietary_preferences || speaker.dietaryPreferences || speaker.dietary || "");
      const photoIdType = sanitizeHtmlString(speaker.photoIdType || speaker.photoIdType || "");
      const photoIdNumber = sanitizeHtmlString(speaker.photoIdNumber || speaker.photoIdNumber || "");
      const passportType = sanitizeHtmlString(speaker.passportType || speaker.passport_type || speaker.passport?.passport_type || "");
      const passportNumber = sanitizeHtmlString(speaker.passportNumber || speaker.passport_number || speaker.passport?.passport_number || "");
      const placeOfIssue = sanitizeHtmlString(speaker.placeOfIssue || speaker.place_of_issue || speaker.passport?.place_of_issue || "");
      const passportExpiry = speaker.passportExpiry || speaker.passport_expiry || speaker.passport?.expiry_date ? new Date(speaker.passportExpiry || speaker.passport_expiry || speaker.passport?.expiry_date) : null;

      const photoBase64 = speaker.photo || null;
      const passportDocumentBase64 = speaker.passport_document || null;

      if (!firstName || !email) {
        results.push({
          email,
          status: "failed",
          reason: "First name and email are required",
        });
        continue;
      }

      const normalizedEmail = email.toLowerCase().trim();
      const speakerName = capitalizeName(`${firstName} ${lastName || ""}`);
      const now = new Date();

      try {
        let user = await User.findOne({ email: normalizedEmail });

        if (!user) {
          user = await User.create({
            id: uuidv4(),
            user_code: `SPK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            email: normalizedEmail,
            role_id: speakerRole.id,
            title: title || null,
            first_name: firstName,
            middle_name: middleName,
            last_name: lastName,
            name: `${firstName} ${lastName || ""}`.trim(),
            organisation: organisationName || null,
            designation: designation || null,
            professional_title: professional_title || null,
            about_yourself: about_yourself || null,
            blood_group: blood_group || null,
            dietary_preferences: dietary_preferences || null,
            country: country || null,
            has_other_citizenship: speaker.has_other_citizenship !== undefined ? speaker.has_other_citizenship : false,
            is_oci_card_holder: speaker.is_oci_card_holder !== undefined ? speaker.is_oci_card_holder : false,
            passport: {
              passport_type: passportType || 'ordinary',
              passport_number: passportNumber || null,
              place_of_issue: placeOfIssue || null,
              expiry_date: passportExpiry || null,
            },
            social_media: {
              linkedin: linkedin || null,
              youtube: youtube || null,
              instagram: instagram || null,
              twitter: twitter || null,
            },
            account_status: "active",
            created_by: inviterUserId,
          });
        } else {
          const currentRole = await Role.findOne({ id: user.role_id });
          const currentPower = ROLE_POWER[currentRole?.name] ?? -1;
          const speakerPower = ROLE_POWER["SPEAKER"] ?? -1;

          if (speakerPower > currentPower) {
            user.role_id = speakerRole.id;
          }

          if (title) user.title = title;
          if (organisationName) user.organisation = organisationName;
          if (designation) user.designation = designation;
          if (professional_title) user.professional_title = professional_title;
          if (about_yourself) user.about_yourself = about_yourself;
          if (blood_group) user.blood_group = blood_group;
          if (dietary_preferences) user.dietary_preferences = dietary_preferences;
          if (country) user.country = country;
          if (photoIdType) user.document_type = photoIdType;
          if (photoIdNumber) user.document_number = photoIdNumber;
          if (speaker.has_other_citizenship !== undefined) user.has_other_citizenship = speaker.has_other_citizenship;
          if (speaker.is_oci_card_holder !== undefined) user.is_oci_card_holder = speaker.is_oci_card_holder;
          if (passportType || passportNumber || placeOfIssue || passportExpiry) {
            if (!user.passport) user.passport = {};
            if (passportType) user.passport.passport_type = passportType;
            if (passportNumber) user.passport.passport_number = passportNumber;
            if (placeOfIssue) user.passport.place_of_issue = placeOfIssue;
            if (passportExpiry) user.passport.expiry_date = passportExpiry;
          }
          if (linkedin || youtube || instagram || twitter) {
            user.social_media = {
              linkedin: linkedin || user.social_media?.linkedin || null,
              youtube: youtube || user.social_media?.youtube || null,
              instagram: instagram || user.social_media?.instagram || null,
              twitter: twitter || user.social_media?.twitter || null,
            };
          }

          await user.save();
        }

        if (req.files?.photo?.[0]) {
          try {
            const photoKey = await uploadToS3(
              req.files.photo[0],
              user.id,
              "profile-photos"
            );
            if (!user.documents) user.documents = {};
            user.documents.photo_url = photoKey;
            await user.save();
          } catch (uploadErr) {
            console.error("Photo upload failed:", uploadErr);
          }
        } else if (req.body.photo_base64 || photoBase64) {
          try {
            const photoData = req.body.photo_base64 || photoBase64;
            const photoKey = await uploadToS3(
              photoData,
              user.id,
              "profile-photos"
            );
            if (!user.documents) user.documents = {};
            user.documents.photo_url = photoKey;
            await user.save();
          } catch (uploadErr) {
            console.error("Photo base64 upload failed:", uploadErr);
          }
        }

        if (req.files?.passport_document?.[0]) {
          try {
            const passportKey = await uploadToS3(
              req.files.passport_document[0],
              user.id,
              "speaker-passports"
            );
            if (!user.documents) user.documents = {};
            user.documents.passport_document_url = passportKey;
            await user.save();
          } catch (uploadErr) {
            console.error("Passport document upload failed:", uploadErr);
          }
        } else if (req.body.passport_document_base64 || passportDocumentBase64) {
          try {
            const passportData = req.body.passport_document_base64 || passportDocumentBase64;
            const passportKey = await uploadToS3(
              passportData,
              user.id,
              "speaker-passports"
            );
            if (!user.documents) user.documents = {};
            user.documents.passport_document_url = passportKey;
            await user.save();
          } catch (uploadErr) {
            console.error("Passport document base64 upload failed:", uploadErr);
          }
        }

        const existingSpeaker = await Speaker.findOne({ id: user.id });
        if (!existingSpeaker) {
          await Speaker.create({
            id: user.id,
            firstname: firstName || null,
            lastname: lastName || null,
            middlename: middleName || null,
            email: normalizedEmail,
            organizationName: organisationName || null,
            designation: designation || null,
            professional_title: professional_title || null,
            blood_group: blood_group || null,
            dietary_preferences: dietary_preferences || null,
            country: country || null,
            photoIdType: photoIdType || null,
            photoIdNumber: photoIdNumber || null,
            passportType: passportType || null,
            passportNumber: passportNumber || null,
            placeOfIssue: placeOfIssue || null,
            passportExpiry: passportExpiry || null,
            passportDocument: user.documents?.passport_document_url || null,
            image: user.documents?.photo_url || null,
            createdBy: inviterUser._id
          });
        } else {
          existingSpeaker.firstname = firstName || existingSpeaker.firstname;
          existingSpeaker.lastname = lastName || existingSpeaker.lastname;
          existingSpeaker.middlename = middleName || existingSpeaker.middlename;
          existingSpeaker.organizationName = organisationName || existingSpeaker.organizationName;
          existingSpeaker.designation = designation || existingSpeaker.designation;
          existingSpeaker.professional_title = professional_title || existingSpeaker.professional_title;
          existingSpeaker.country = country || existingSpeaker.country;
          existingSpeaker.photoIdType = photoIdType || existingSpeaker.photoIdType;
          existingSpeaker.photoIdNumber = photoIdNumber || existingSpeaker.photoIdNumber;
          existingSpeaker.passportType = passportType || existingSpeaker.passportType;
          existingSpeaker.passportNumber = passportNumber || existingSpeaker.passportNumber;
          existingSpeaker.placeOfIssue = placeOfIssue || existingSpeaker.placeOfIssue;
          existingSpeaker.passportExpiry = passportExpiry || existingSpeaker.passportExpiry;
          existingSpeaker.passportDocument = user.documents?.passport_document_url || existingSpeaker.passportDocument;
          existingSpeaker.blood_group = blood_group || existingSpeaker.blood_group;
          existingSpeaker.dietary_preferences = dietary_preferences || existingSpeaker.dietary_preferences;
          existingSpeaker.image = user.documents?.photo_url || existingSpeaker.image;
          await existingSpeaker.save();
        }

        let sessionDetails = null;
        if (session) {
          try {
            sessionDetails = await Session.findById(session);
            if (!sessionDetails) {
              throw new Error("Session not found");
            }
          } catch (sessionError) {
            console.error("Failed to fetch session:", sessionError);
          }
        }

        let userEventCreated = false;
        let eventIdForUserEvent = event_id;
        if (!eventIdForUserEvent && sessionDetails) {
          eventIdForUserEvent = sessionDetails.event_id;
        }
        if (eventIdForUserEvent) {
          const existingUserEvent = await UserEvent.findOne({
            user_id: user.id,
            event_id: eventIdForUserEvent,
          });

          if (existingUserEvent && existingUserEvent.role === "SPEAKER") {
            userEventCreated = true;
          } else if (existingUserEvent) {
            const existingPower = ROLE_POWER[existingUserEvent.role] ?? -1;
            const speakerPower = ROLE_POWER["SPEAKER"];

            if (speakerPower > existingPower) {
              existingUserEvent.role = "SPEAKER";
              existingUserEvent.status = "invited";
              await existingUserEvent.save();
              userEventCreated = true;
            }
          } else {
            await UserEvent.create({
              user_id: user.id,
              event_id: eventIdForUserEvent,
              registration_id: generateRegistrationId(),
              role: "SPEAKER",
              status: "invited",
              attended: false,
              created_by: inviterUserId,
            });
            userEventCreated = true;
          }
        }

        let sessionParticipantCreated = false;
        if (session && sessionDetails) {
          const existingParticipant = await SessionParticipant.findOne({
            session_id: session,
            user_id: user.id,
            participant_type: "speaker",
          });

          if (!existingParticipant) {
            await SessionParticipant.create({
              session_id: session,
              user_id: user.id,
              event_id: sessionDetails.event_id,
              participant_type: "speaker",
              registration_status: "confirmed",
              attendance_status: "not-attended",
            });
            sessionParticipantCreated = true;
          } else {
            sessionParticipantCreated = true;
          }
        }

        let emailStatus = "created";
        try {
          const portalUrl = `${process.env.FRONTEND_URL}/login`;
          const logo = process.env.BRICS_LOGO_URL;

          let emailHtml = "";

          if (sessionDetails) {
            let eventForEmail = event;
            if (!eventForEmail && sessionDetails.event_id) {
              eventForEmail = await Event.findById(sessionDetails.event_id);
            }
            const safeEventName = sanitizeHtmlString(eventForEmail?.name || "BRICS Event");
            const safeVenue = sanitizeHtmlString(eventForEmail?.venue || "Venue to be communicated");
            const safeSessionName = sanitizeHtmlString(sessionDetails.name);

            emailHtml = speakerInviteTemplate({
              name: speakerName,
              eventName: safeEventName,
              sessionName: safeSessionName,
              start: eventForEmail ? formatDateTime(eventForEmail.start_date) : "Date to be announced",
              end: eventForEmail ? formatDateTime(eventForEmail.end_date) : "",
              venue: safeVenue,
            });
            emailStatus = "invited_with_email";
          } else {
            emailHtml = speakerWelcomeTemplate({
              name: speakerName,
              title: title || null,
              organisationName: organisationName || null,
              designation: designation || null,
            });
            emailStatus = "invited_no_event";
          }

          await sendEmail({
            to: normalizedEmail,
            subject: sessionDetails ? `Speaker Invitation – ${sanitizeHtmlString(sessionDetails.name)}` : "Welcome to BRICS Speaker Platform",
            html: emailHtml,
          });

          console.log(`Email sent to ${normalizedEmail} with subject: ${sessionDetails ? `Speaker Invitation – ${sanitizeHtmlString(sessionDetails.name)}` : "Welcome to BRICS Speaker Platform"}`);

          emailsSent++;
        } catch (emailErr) {
          console.error(`Failed to send email to ${normalizedEmail}:`, emailErr);
          emailsFailed++;
          emailStatus = emailStatus === "created" ? "created_no_email" : "invited_no_email";
        }

        results.push({
          email: normalizedEmail,
          status: emailStatus,
          user_id: user.id,
          user_code: user.user_code,
          photo_url: user.documents?.photo_url || null,
          session: session || null,
          session_assigned: sessionParticipantCreated,
          event_added: userEventCreated,
          speaker_name: speakerName 
        });
      } catch (speakerError) {
        console.error(`Error processing speaker ${email}:`, speakerError);
        results.push({
          email,
          status: "failed",
          reason: speakerError.message,
        });
      }
    }

    const resultsWithSignedUrls = await Promise.all(
      results.map(async (result) => {
        if (result.photo_url && !result.photo_url.startsWith('http')) {
          try {
            result.photo_signed_url = await getSignedS3Url(result.photo_url);
          } catch (err) {
            console.error("Error generating signed URL for speaker photo:", err);
          }
        }
        return result;
      })
    );

    try {
      const inviter = await User.findOne({ id: req.user.user_id });
      
      const successSpeakers = resultsWithSignedUrls.filter(r => 
        r.status.includes("invited") || r.status.includes("created")
      );
      
      if (inviter && inviter.fcm_token && successSpeakers.length > 0) {
        const speakerNames = successSpeakers.map(s => s.speaker_name || s.email.split('@')[0]).join(", ");
        
        await sendPushNotification(
          inviter.fcm_token,
          "Speaker Profile Created 🎙️",
          `Speaker ${speakerNames} Profile created / updated.`
        );
        console.log(`✅ Push sent to Inviter (${inviter.email}) regarding Speaker Creation.`);
      }
    } catch (pushErr) {
      console.error("❌ Failed to push Speaker Creation notice:", pushErr.message);
    }
    await Activity.logActivity({
      activityType: "OTHER",
      description: `Created ${results.filter((r) => r.status !== "failed").length} speakers`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get("user-agent"),
      status: "SUCCESS",
      resourceType: "USER",
      metadata: {
        speakerCount: results.length,
        eventId: event_id || null,
        emailsSent,
        emailsFailed,
      },
    });

    return res.status(201).json({
      message: "Speakers created/updated successfully",
      event_id: event_id || null,
      summary: {
        total_processed: resultsWithSignedUrls.length,
        created_count: resultsWithSignedUrls.filter((r) => r.status === "created").length,
        invited_with_email: resultsWithSignedUrls.filter((r) => r.status === "invited_with_email").length,
        invited_no_event: resultsWithSignedUrls.filter((r) => r.status === "invited_no_event").length,
        created_no_email: resultsWithSignedUrls.filter((r) => r.status === "created_no_email").length,
        failed_count: resultsWithSignedUrls.filter((r) => r.status === "failed").length,
        emails_sent: emailsSent,
        emails_failed: emailsFailed,
      },
      speakers: resultsWithSignedUrls,
    });
  } catch (error) {
    console.error("inviteSpeakersToEvent error:", error);

    await Activity.logActivity({
      activityType: "SPEAKER_CREATE",
      description: `Speaker creation failed`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get("user-agent"),
      status: "ERROR",
      resourceType: "SPEAKER",
      metadata: {
        error: error.message,
      },
    });

    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const getSpeakers = async (req, res) => {
  try {
    const event_id = req.query.event_id;
    const search = req.query.search;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 20);
    const skip = (page - 1) * limit;

    // Get SPEAKER role ID
    const speakerRole = await Role.findOne({ name: "SPEAKER" });
    if (!speakerRole) {
      return res.status(404).json({
        message: "SPEAKER role not found in system",
      });
    }

    let query = { role_id: speakerRole.id };

    // Filter by search term (name or email)
    if (search) {
      const searchRegex = { $regex: search, $options: "i" };
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { organisation: searchRegex },
      ];
    }

    let speakers = [];


    // If event_id provided, limit results to users linked to that event
    if (event_id) {
      // Get all user_ids for speakers in the event
      const allEventUserEvents = await UserEvent.find({
        event_id,
        role: "SPEAKER",
      }).select("user_id").lean();

      const allUserIds = allEventUserEvents.map((ue) => ue.user_id);

      if (allUserIds.length === 0) {
        // Nothing to return
        return res.status(200).json({
          message: "Speakers retrieved successfully",
          pagination: {
            total: 0,
            page,
            limit,
            pages: 0,
          },
          speakers: [],
        });
      }

      // Build user query constrained by event membership
      const userQuery = { ...query, id: { $in: allUserIds } };

      // total count considers search + event membership
      const totalCount = await User.countDocuments(userQuery);

      // fetch paginated users filtered by search (if any) and event membership
      speakers = await User.find(userQuery)
        .select(
          "id user_code name email first_name middle_name last_name title organisation designation professional_title about_yourself social_media documents account_status created_at country state city mobile passport document_type document_number"
        )
        .skip(skip)
        .limit(limit)
        .lean();

      // attach event info if needed later
      // respond with paginated list
      const eventData = await Event.findOne({ id: event_id }).select(
        "name dates venue"
      );

      const enhancedSpeakers = speakers.map((speaker) => ({
        ...speaker,
        event: eventData || null,
      }));

      return res.status(200).json({
        message: "Speakers retrieved successfully",
        pagination: {
          total: totalCount,
          page,
          limit,
          pages: Math.ceil(totalCount / limit),
        },
        speakers: enhancedSpeakers,
      });
    }

    // Get all speakers without event filter
    const totalCount = await User.countDocuments(query);
    speakers = await User.find(query)
      .select(
        "id user_code name email first_name middle_name last_name title organisation designation professional_title about_yourself social_media documents account_status created_at country state city mobile passport document_type document_number"
      )
      .skip(skip)
      .limit(limit)
      .lean();

    // Enhance response with event information if filtering by event
    let enhancedSpeakers = speakers;
    if (event_id) {
      const eventData = await Event.findOne({ id: event_id }).select(
        "name dates venue"
      );
      enhancedSpeakers = speakers.map((speaker) => ({
        ...speaker,
        event: eventData || null,
      }));
    }

    // Add signed S3 URLs for photos and fetch assigned sessions
    enhancedSpeakers = await Promise.all(
      enhancedSpeakers.map(async (speaker) => {
        if (speaker.documents?.photo_url) {
          try {
            const signedUrl = await getSignedS3Url(speaker.documents.photo_url);
            speaker.documents.photo_signed_url = signedUrl;
            speaker.photo_signed_url = signedUrl; // Add at top level for frontend convenience
          } catch (err) {
            console.error("Error generating signed URL for speaker photo:", err);
          }
        }

        if (speaker.documents?.passport_document_url) {
          try {
            const signedUrl = await getSignedS3Url(speaker.documents.passport_document_url);
            speaker.documents.passport_document_signed_url = signedUrl;
            speaker.passport_document_signed_url = signedUrl; // Add at top level for frontend convenience
          } catch (err) {
            console.error("Error generating signed URL for speaker passport document:", err);
          }
        }

        // Get assigned sessions for this speaker
        try {
          const participantRecords = await SessionParticipant.find({
            user_id: speaker.id,
            participant_type: "speaker",
          }).lean();

          const sessions = await Promise.all(
            participantRecords.map(async (record) => {
              const session = await Session.findById(record.session_id)
                .select("_id name description event_id start_datetime end_datetime")
                .lean();
              return {
                session_id: record.session_id,
                session_name: session?.name,
                session_description: session?.description,
                event_id: session?.event_id,
                start_datetime: session?.start_datetime,
                end_datetime: session?.end_datetime,
                registration_status: record.registration_status,
                attendance_status: record.attendance_status,
                check_in_time: record.check_in_time,
              };
            })
          );

          speaker.sessions = sessions.length > 0 ? sessions : [];
        } catch (err) {
          console.error("Error fetching sessions for speaker:", err);
          speaker.sessions = [];
        }

        return speaker;
      })
    );

    return res.status(200).json({
      message: "Speakers retrieved successfully",
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalCount / limit),
      },
      speakers: enhancedSpeakers,
    });
  } catch (error) {
    console.error("getSpeakers error:", error);

    await Activity.logActivity({
      activityType: "SPEAKER_FETCH",
      description: "Failed to fetch speakers",
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get("user-agent"),
      status: "ERROR",
      resourceType: "SPEAKER",
      metadata: {
        error: error.message,
      },
    });

    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

export const updateSpeaker = async (req, res) => {

  try {
    const { userId } = req.params;
    const updaterId = req.user?.user_id;

    console.log("===== UPDATE SPEAKER START =====");
    console.log("UserId:", userId);
    console.log("UpdaterId:", updaterId);
    console.log("req:", JSON.stringify(req.body));

    if (!userId) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    const speaker = await User.findOne({ id: userId });

    if (!speaker) {
      return res.status(404).json({
        message: "Speaker not found",
      });
    }

    const updater = await User.findOne({ id: updaterId });
    const updaterRole = await Role.findOne({ id: updater?.role_id });
    const updaterRoleName = updaterRole?.name;

    const hasPermission =
      ["SUPER ADMIN", "EVENT MANAGER"].includes(updaterRoleName) ||
      userId === updaterId;

    if (!hasPermission) {
      return res.status(403).json({
        message: "You don't have permission to update this speaker",
      });
    }

    let updatePayload = {};

    const title = (req.body.title || "").trim();
    const firstName = (req.body.firstName || req.body.first_name || "").trim();
    const middleName = (req.body.middleName || req.body.middle_name || "").trim();
    const lastName = (req.body.lastName || req.body.last_name || "").trim();
    const email = (req.body.email || "").trim();
    const organisationName = (req.body.organisationName || req.body.organisation || "").trim();
    const designation = (req.body.designation || "").trim();
    const session = (req.body.session || req.body.session_id || "").trim();
    const about_yourself = (req.body.about_yourself || req.body.about || "").trim();
    const linkedin = (req.body.linkedin || "").trim();
    const youtube = (req.body.youtube || "").trim();
    const instagram = (req.body.instagram || "").trim();
    const twitter = (req.body.twitter || "").trim();
    const document_type = (req.body.document_type || req.body.photoIdType || "").trim();
    const document_number = (req.body.document_number || req.body.photoIdNumber || "").trim();
    const professional_title = (req.body.professional_title || "").trim();
    const country = (req.body.country || "").trim();
    const passportType = (req.body.passportType || req.body.passport_type || req.body.passport?.passport_type || req.body.passport?.passportType || "").trim();
    const passportNumber = (req.body.passportNumber || req.body.passport_number || req.body.passport?.passport_number || req.body.passport?.passportNumber || "").trim();
    const placeOfIssue = (req.body.placeOfIssue || req.body.place_of_issue || req.body.passport?.place_of_issue || req.body.passport?.placeOfIssue || "").trim();
    const passportExpiry = (req.body.passportExpiry || req.body.passport_expiry || req.body.passport?.expiry_date || req.body.passport?.passportExpiry || "").trim();

    const documents = { ...(speaker.documents || {}) };

    if (req.files?.photo?.[0]) {
      try {
        const photoKey = await uploadToS3(
          req.files.photo[0],
          userId,
          "profile-photos",
        );
        documents.photo_url = photoKey;
      } catch (uploadErr) {
        console.error("Photo upload failed:", uploadErr);
        return res.status(400).json({
          message: "Failed to upload photo",
          error: uploadErr.message,
        });
      }
    } else if (req.body.photo_base64 || req.body.photo) {
      try {
        const photoData = req.body.photo_base64 || req.body.photo;
        const photoKey = await uploadToS3(
          photoData,
          userId,
          "profile-photos",
        );
        documents.photo_url = photoKey;
      } catch (uploadErr) {
        console.error("Photo base64 upload failed:", uploadErr);
        return res.status(400).json({
          message: "Failed to upload photo",
          error: uploadErr.message,
        });
      }
    }

    if (req.files?.passport_document?.[0]) {
      try {
        const passportKey = await uploadToS3(
          req.files.passport_document[0],
          userId,
          "passport-documents",
        );
        documents.passport_document_url = passportKey;
      } catch (uploadErr) {
        console.error("Passport document upload failed:", uploadErr);
        return res.status(400).json({
          message: "Failed to upload passport document",
          error: uploadErr.message,
        });
      }
    } else if (req.body.passport_document_base64 || req.body.passport_document) {
      try {
        const passportData = req.body.passport_document_base64 || req.body.passport_document;
        const passportKey = await uploadToS3(
          passportData,
          userId,
          "passport-documents",
        );
        documents.passport_document_url = passportKey;
      } catch (uploadErr) {
        console.error("Passport document base64 upload failed:", uploadErr);
        return res.status(400).json({
          message: "Failed to upload passport document",
          error: uploadErr.message,
        });
      }
    }

    if (Object.keys(documents).length > 0) {
      updatePayload.documents = documents;
    }

    if (title) updatePayload.title = sanitizeHtmlString(title);
    if (firstName) updatePayload.first_name = sanitizeHtmlString(firstName);
    if (middleName) updatePayload.middle_name = sanitizeHtmlString(middleName);
    if (lastName) updatePayload.last_name = sanitizeHtmlString(lastName);
    if (firstName || lastName) {
      updatePayload.name = `${firstName || speaker.first_name} ${lastName || speaker.last_name || ""}`.trim();
    }
    if (email) updatePayload.email = sanitizeHtmlString(email.toLowerCase());
    if (organisationName) updatePayload.organisation = sanitizeHtmlString(organisationName);
    if (designation) updatePayload.designation = sanitizeHtmlString(designation);
    if (about_yourself) updatePayload.about_yourself = sanitizeHtmlString(about_yourself);
    if (professional_title)
      updatePayload.professional_title = sanitizeHtmlString(professional_title);
    
    if (req.body.country !== undefined) {
      updatePayload.country = country ? sanitizeHtmlString(country) : null;
      
      if (country && country.toLowerCase() === "india") {
        updatePayload.passport = {
          passport_type: null,
          passport_number: null,
          place_of_issue: null,
          expiry_date: null
        };
        
        if (req.body.document_type !== undefined || req.body.photoIdType !== undefined) {
          updatePayload.document_type = document_type ? sanitizeHtmlString(document_type) : null;
        }
        if (req.body.document_number !== undefined || req.body.photoIdNumber !== undefined) {
          updatePayload.document_number = document_number ? sanitizeHtmlString(document_number) : null;
        }
      } 
      else if (country && country.toLowerCase() !== "india") {
        updatePayload.document_type = null;
        updatePayload.document_number = null;
        
        if (passportType || passportNumber || placeOfIssue || passportExpiry) {
          if (!updatePayload.passport) updatePayload.passport = {};
          if (passportType) updatePayload.passport.passport_type = sanitizeHtmlString(passportType);
          if (passportNumber) updatePayload.passport.passport_number = sanitizeHtmlString(passportNumber);
          if (placeOfIssue) updatePayload.passport.place_of_issue = sanitizeHtmlString(placeOfIssue);
          if (passportExpiry) updatePayload.passport.expiry_date = sanitizeHtmlString(passportExpiry);
        }
      }
    } 
    else if (document_type || document_number || passportType || passportNumber) {
      const existingCountry = speaker.country || "";
      
      if (existingCountry.toLowerCase() === "india") {
        if (req.body.document_type !== undefined || req.body.photoIdType !== undefined) {
          updatePayload.document_type = document_type ? sanitizeHtmlString(document_type) : null;
        }
        if (req.body.document_number !== undefined || req.body.photoIdNumber !== undefined) {
          updatePayload.document_number = document_number ? sanitizeHtmlString(document_number) : null;
        }
      } else {
        if (passportType || passportNumber || placeOfIssue || passportExpiry) {
          if (!speaker.passport) speaker.passport = {};
          updatePayload.passport = { ...speaker.passport };
          if (passportType) updatePayload.passport.passport_type = sanitizeHtmlString(passportType);
          if (passportNumber) updatePayload.passport.passport_number = sanitizeHtmlString(passportNumber);
          if (placeOfIssue) updatePayload.passport.place_of_issue = sanitizeHtmlString(placeOfIssue);
          if (passportExpiry) updatePayload.passport.expiry_date = sanitizeHtmlString(passportExpiry);
        }
      }
    }

    if (linkedin || youtube || instagram || twitter) {
      updatePayload.social_media = {
        linkedin: linkedin ? sanitizeHtmlString(linkedin) : (speaker.social_media?.linkedin || null),
        youtube: youtube ? sanitizeHtmlString(youtube) : (speaker.social_media?.youtube || null),
        instagram: instagram ? sanitizeHtmlString(instagram) : (speaker.social_media?.instagram || null),
        twitter: twitter ? sanitizeHtmlString(twitter) : (speaker.social_media?.twitter || null),
      };
    }

    let updatedSpeaker = await User.findOneAndUpdate(
      { id: userId },
      { $set: updatePayload },
      { new: true }
    ).select("-password_hash -__v");

    if (updatedSpeaker.documents?.photo_url) {
      try {
        const signedUrl = await getSignedS3Url(updatedSpeaker.documents.photo_url);
        updatedSpeaker.documents.photo_signed_url = signedUrl;
        updatedSpeaker.photo_signed_url = signedUrl;
      } catch (err) {
        console.error("Error generating signed URL for photo:", err.message);
      }
    }

    if (updatedSpeaker.documents?.passport_document_url) {
      try {
        const signedUrl = await getSignedS3Url(updatedSpeaker.documents.passport_document_url);
        updatedSpeaker.documents.passport_document_signed_url = signedUrl;
        updatedSpeaker.passport_document_signed_url = signedUrl;
      } catch (err) {
        console.error("Error generating signed URL for passport document:", err);
      }
    }

    let sessionAssigned = null;
    if (session) {
      try {
        const sessionDetails = await Session.findById(session);
        if (sessionDetails) {
          const existingParticipant = await SessionParticipant.findOne({
            session_id: session,
            user_id: userId,
            participant_type: "speaker",
          });

          if (!existingParticipant) {
            await SessionParticipant.create({
              session_id: session,
              user_id: userId,
              event_id: sessionDetails.event_id,
              participant_type: "speaker",
              registration_status: "confirmed",
              attendance_status: "not-attended",
            });
            sessionAssigned = session;
          } else {
            sessionAssigned = session;
          }
        }
      } catch (sessionError) {
        console.error("Failed to create/update SessionParticipant:", sessionError);
      }
    }

    try {
      if (updater && updater.fcm_token) {
        const speakerName = updatedSpeaker.name || `${updatedSpeaker.first_name} ${updatedSpeaker.last_name || ''}`.trim();
        
        await sendPushNotification(
          updater.fcm_token,
          "Speaker Profile Updated 🎙️",
          `Speaker ${speakerName} Profile created / updated.`
        );
        console.log(`✅ Push sent to Updater (${updater.email}) regarding Speaker Update.`);
      }
    } catch (pushErr) {
      console.error("❌ Failed to push Speaker Update notice:", pushErr.message);
    }
    await Activity.logActivity({
      activityType: "PROFILE_UPDATE",
      description: `Updated speaker profile for ${updatedSpeaker.email}`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get("user-agent"),
      status: "SUCCESS",
      resourceType: "USER",
      resourceId: speaker._id,
      metadata: {
        userId,
        sessionAssigned: sessionAssigned || null,
      },
    });

    return res.status(200).json({
      message: "Speaker updated successfully",
      speaker: updatedSpeaker,
      session: sessionAssigned,
    });
  } catch (error) {
    console.error("updateSpeaker error:", error);

    await Activity.logActivity({
      activityType: "PROFILE_UPDATE",
      description: "Failed to update speaker",
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get("user-agent"),
      status: "FAILED",
      resourceType: "USER",
      metadata: {
        error: error.message,
      },
    });

    return res.status(500).json({
      message: "Failed to update speaker",
      error: error.message,
    });
  }
};

export const getSingleSpeaker = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    // Get SPEAKER role ID
    const speakerRole = await Role.findOne({ name: "SPEAKER" });
    if (!speakerRole) {
      return res.status(404).json({
        message: "SPEAKER role not found",
      });
    }

    // Get the speaker
    const speaker = await User.findOne({
      id: userId,
      role_id: speakerRole.id
    }).select("-password_hash -__v").lean();

    if (!speaker) {
      return res.status(404).json({
        message: "Speaker not found",
      });
    }

    // Generate signed URL for photo if it exists
    if (speaker.documents?.photo_url) {
      try {
        const signedUrl = await getSignedS3Url(speaker.documents.photo_url);
        speaker.documents.photo_signed_url = signedUrl;
        speaker.photo_signed_url = signedUrl;
      } catch (err) {
        console.error("Error generating signed URL:", err);
      }
    }

    // Generate signed URL for passport document if it exists
    if (speaker.documents?.passport_document_url) {
      try {
        const signedUrl = await getSignedS3Url(speaker.documents.passport_document_url);
        speaker.documents.passport_document_signed_url = signedUrl;
        speaker.passport_document_signed_url = signedUrl;
      } catch (err) {
        console.error("Error generating signed URL for passport:", err);
      }
    }

    // Log activity
    await Activity.logActivity({
      activityType: "EVENT_VIEW",
      description: `Viewed speaker profile: ${speaker.email}`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get("user-agent"),
      status: "SUCCESS",
      resourceType: "USER",
      metadata: {
        userId,
      },
    });

    return res.status(200).json({
      message: "Speaker retrieved successfully",
      speaker,
    });
  } catch (error) {
    console.error("getSingleSpeaker error:", error);

    await Activity.logActivity({
      activityType: "EVENT_VIEW",
      description: "Failed to fetch speaker",
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get("user-agent"),
      status: "FAILED",
      resourceType: "USER",
      metadata: {
        error: error.message,
      },
    });

    return res.status(500).json({
      message: "Failed to retrieve speaker",
      error: error.message,
    });
  }
};
export const createUser = async (req, res) => {
  try {
    const { email, role_id, first_name, last_name, title, middle_name } = req.body;
    if (!email || !role_id) {
      return res.status(400).json({ message: 'email, password, and role_id are required' });
    }

    // Check if role exists
    const role = await Role.findOne({ id: role_id });
    if (!role) {
      return res.status(404).json({ message: 'Role not found' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const user = await User.create({
      id: uuidv4(),
      email: sanitizeHtmlString(email),
      role_id,
      first_name: sanitizeHtmlString(first_name),
      last_name: sanitizeHtmlString(last_name),
      title: sanitizeHtmlString(title),
      middle_name: sanitizeHtmlString(middle_name)
    });
    res.status(201).json({ message: 'User created', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


export const updateUserRole = async (req, res) => {
  try {
    const { user_id, role } = req.body;

    if (!user_id || !role) {
      return res.status(400).json({
        message: 'user_id and role are required'
      });
    }

    // Check if role exists (by name)
    const roleRecord = await Role.findOne({ name: role });
    if (!roleRecord) {
      return res.status(404).json({
        message: 'Role not found'
      });
    }

    // Check if user exists
    const user = await User.findOne({ id: user_id });
    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Get current role to check hierarchy (similar to delegate invite)
    const currentRole = await Role.findOne({ id: user.role_id });
    if (currentRole) {
      const currentPower = ROLE_POWER[currentRole.name] ?? -1;
      const newPower = ROLE_POWER[role] ?? -1;
       user.role_id = roleRecord.id;
      await user.save();

      // Only update role if new role has higher or equal power
      // if (newPower >= currentPower) {
      //   user.role_id = roleRecord.id;
      //   await user.save();
      // } else {
      //   return res.status(403).json({
      //     message: 'Cannot downgrade user role to a lower role'
      //   });
      // }
    } else {
      // If no current role, just assign the new one
      user.role_id = roleRecord.id;
      await user.save();
    }

    await Activity.logActivity({
      activityType: 'ROLE_ASSIGN',
      description: `Updated user role to ${role}`,
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      status: 'SUCCESS',
      resourceType: 'USER',
      metadata: {
        userId: user.id,
        roleId: roleRecord.id,
        roleName: role
      }
    });

    return res.status(200).json({
      message: 'User role updated successfully',
      user
    });

  } catch (error) {
    return res.status(500).json({
      message: error.message
    });
  }
};