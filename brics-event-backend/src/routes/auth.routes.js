import express from "express";
import {
  saveUserProfile,
  sendLoginOtp,
  verifyLoginOtp,
  getMyProfile,
  updateMyProfile,
  updateUserProfile,
  inviteDelegateToEvent,
  inviteDaoToEvent,
  inviteSpeakersToEvent,
  getSpeakers,
  getSingleSpeaker,
  updateSpeaker,
  verifyQrAccreditation,
  logout,
  refreshAccessToken,
  saveOpenInvitedetails,
  activateDeactivateUser,
  inviteBulkDaosToEvent,
  createUser,
  updateUserRole,
  updateFcmToken
} from "../controllers/auth.controller.js";

import { authMiddleware } from "../middlewares/auth.js";
import { uploadDocumentsSafe } from "../middlewares/uploadSafe.js";
import validate from "../middlewares/validate.js";

import {
  sendOtpSchema,
  verifyOtpSchema,
  userProfileSchema,
  activateDeactivateUserSchema,
  updateUserRoleSchema
} from "../validators/auth.schema.js";

import {
  inviteDelegateSchema,
  inviteDaoSchema,
  inviteSpeakerSchema,
  updateSpeakerSchema,
  openInviteSchema,
} from "../validators/eventInvite.schema.js";

import { otpLimiter } from "../middlewares/rateLimit.js";

const router = express.Router();


/**
 * @swagger
 * /api/auth/update-fcm-token:
 * post:
 * summary: Register/Update FCM Token for Push Notifications
 * tags: [Auth]
 * security:
 * - bearerAuth: []
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * type: object
 * required: [fcmToken]
 * properties:
 * fcmToken:
 * type: string
 * responses:
 * 200:
 * description: FCM Token updated successfully
 */
router.post(
  "/update-fcm-token",
  authMiddleware,
  updateFcmToken
);


/**
 * =========================================================
 * AUTH – LOGIN
 * =========================================================
 */

/**
 * @swagger
 * /api/auth/login/send-otp:
 *   post:
 *     summary: Send OTP for login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *       400:
 *         description: Invalid request
 */
router.post(
  "/login/send-otp",
  // otpLimiter,
  validate(sendOtpSchema),
  sendLoginOtp
);

/**
 * @swagger
 * /api/auth/login/verify-otp:
 *   post:
 *     summary: Verify OTP and login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Login successful
 *       400:
 *         description: Invalid or expired OTP
 */
router.post(
  "/login/verify-otp",
  // otpLimiter,
  // validate(verifyOtpSchema),
  verifyLoginOtp
);



/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token using refresh token cookie
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     description: Requires refresh_token cookie. Returns new access token.
 *     responses:
 *       200:
 *         description: New access token generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *       401:
 *         description: Invalid or expired refresh token
 */

router.post(
  "/refresh",
  authMiddleware,
  refreshAccessToken
);


/**
 * @swagger
 * /api/auth/user/create:
 *   post:
 *     summary: Create a new user with role
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - role_id
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               role_id:
 *                 type: string
 *                 example: ROLE_ID_UUID
 *               first_name:
 *                 type: string
 *               middle_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               title:
 *                 type: string
 *     responses:
 *       201:
 *         description: User created successfully
 *       400:
 *         description: Missing required fields
 *       404:
 *         description: Role not found
 *       409:
 *         description: User already exists
 */

router.post('/user/create', authMiddleware, createUser);


/**
 * @swagger
 * /api/auth/user/update-role:
 *   put:
 *     summary: Update user role
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *               - role
 *             properties:
 *               user_id:
 *                 type: string
 *                 example: USER_UUID
 *               role:
 *                 type: string
 *                 enum: [DELEGATE, HEAD OF DELEGATE, DAO, EVENT MANAGER, SECURITY OFFICER, INTERPRETER, MEDIA, DEPUTY, DELEGATION CONTACT OFFICER, SPEAKER, SUPER ADMIN]
 *                 example: INTERPRETER
 *     responses:
 *       200:
 *         description: Role updated successfully
 *       400:
 *         description: Missing or invalid fields
 *       403:
 *         description: Cannot downgrade user role
 *       404:
 *         description: User or Role not found
 *       500:
 *         description: Server error
 */

router.put('/user/update-role', authMiddleware, validate(updateUserRoleSchema), updateUserRole);


/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout current user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post(
  "/logout",
  authMiddleware,
  logout
);


/**
 * =========================================================
 * USER PROFILE – CREATE / COMPLETE
 * =========================================================
 */

/**
 * @swagger
 * /api/auth/profile:
 *   post:
 *     summary: Create or update user profile after registration
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               mobile:
 *                 type: string
 *               country:
 *                 type: string
 *               full_address:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile saved successfully
 */
router.post(
  "/profile",
  authMiddleware,
  validate(userProfileSchema),
  saveUserProfile
);

/**
 * =========================================================
 * USER PROFILE – AUTHENTICATED
 * =========================================================
 */

/**
 * @swagger
 * /api/auth/details:
 *   get:
 *     summary: Get logged-in user details
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User details fetched successfully
 *       401:
 *         description: Unauthorized
 */
router.get(
  "/details",
  authMiddleware,
  getMyProfile
);

/**
 * @swagger
 * /api/auth/update:
 *   put:
 *     summary: Update logged-in user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               mobile:
 *                 type: string
 *               photo:
 *                 type: string
 *                 format: binary
 *               passport_document:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.put(
  "/update",
  authMiddleware,
  uploadDocumentsSafe,
  updateMyProfile
);

/**
 * @swagger
 * /api/auth/users/{userId}/update:
 *   put:
 *     summary: Update user profile (Admin/Manager/DAO can update others based on role)
 *     description: |
 *       Role-based permissions:
 *       - SUPER_ADMIN: Can update anyone
 *       - EVENT_MANAGER: Can update DAO, Delegates
 *       - DAO: Can update Delegates they invited
 *       - DELEGATE: Can only update self
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               first_name:
 *                 type: string
 *               last_name:
 *                 type: string
 *               mobile:
 *                 type: string
 *               photo:
 *                 type: string
 *                 format: binary
 *               passport_document:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       403:
 *         description: Permission denied
 *       404:
 *         description: User not found
 */
router.put(
  "/users/:userId/update",
  authMiddleware,
  uploadDocumentsSafe,
  updateUserProfile
);

/**
 * =========================================================
 * EVENT – DELEGATE INVITATION
 * =========================================================
 */

/**
 * @swagger
 * /api/auth/events/{eventId}/delegates/invite:
 *   post:
 *     summary: Invite delegates to an event
 *     tags: [Event]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [delegates]
 *             properties:
 *               delegates:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *                     email:
 *                       type: string
 *                       format: email
 *                     inviteAs:
 *                       type: string
 *               daoId:
 *                 type: string
 *                 description: Optional - User ID of the DAO to assign delegates to (Super Admin/Event Manager only)
 *     responses:
 *       200:
 *         description: Delegates invited successfully
 */
router.post(
  "/events/:eventId/delegates/invite",
  authMiddleware,
  validate(inviteDelegateSchema),
  inviteDelegateToEvent
);

/**
 * =========================================================
 * EVENT – DAO INVITATION
 * =========================================================
 */

/**
 * @swagger
 * /api/auth/events/{eventId}/dao:
 *   post:
 *     summary: Invite DAO users to an event
 *     tags: [Event]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [daos]
 *             properties:
 *               daos:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     firstName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *                     email:
 *                       type: string
 *                       format: email
 *     responses:
 *       201:
 *         description: DAO users invited successfully
 */
router.post(
  "/events/:eventId/dao",
  authMiddleware,
  validate(inviteDaoSchema),
  inviteDaoToEvent
);

/**
 * =========================================================
 * QR VERIFICATION
 * =========================================================
 */

/**
 * @swagger
 * /api/auth/event/verify/{accreditationId}:
 *   get:
 *     summary: Verify QR accreditation
 *     tags: [Event]
 *     parameters:
 *       - in: path
 *         name: accreditationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: QR verified successfully
 */
router.get(
  "/event/verify/:accreditationId",
  verifyQrAccreditation
);


/**
 * @swagger
 * /api/auth/{event_id}/open/invite/save:
 *   post:
 *     summary: Submit open invite delegate details
 *     tags: [Event]
 *     parameters:
 *       - in: path
 *         name: event_id
 *         required: true
 *         schema:
 *           type: string
 *         description: Event ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - email
 *               - inviteAs
 *               - inviteToken
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *               phoneCountry:
 *                 type: string
 *               phone:
 *                 type: string
 *               gender:
 *                 type: string
 *               dob:
 *                 type: string
 *                 format: date
 *               country:
 *                 type: string
 *               inviteAs:
 *                 type: string
 *               docType:
 *                 type: string
 *               docNumber:
 *                 type: string
 *               inviteToken:
 *                 type: string
 *               photo:
 *                 type: string
 *                 format: binary
 *               passport_document:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: User details submitted successfully
 *       400:
 *         description: Invalid or missing fields
 *       404:
 *         description: Event not found
 */

router.post(
  "/:event_id/open/invite/save",
  uploadDocumentsSafe,
  validate(openInviteSchema),
  saveOpenInvitedetails
);  

/**
 * =========================================================
 * ACTIVATE / DEACTIVATE USER (SUPER ADMIN & EVENT MANAGER)
 * =========================================================
 */

/**
 * @swagger
 * /api/auth/users/{userId}/status:
 *   patch:
 *     summary: Activate or deactivate a user account (Super Admin & Event Manager only)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID to activate/deactivate
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [activate, deactivate]
 *                 description: Action to perform on the user account
 *     responses:
 *       200:
 *         description: User status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 affected_users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       user_id:
 *                         type: string
 *                       email:
 *                         type: string
 *                       name:
 *                         type: string
 *                       role:
 *                         type: string
 *                       status:
 *                         type: string
 *                       action_type:
 *                         type: string
 *                 total_affected:
 *                   type: number
 *       400:
 *         description: Invalid action provided
 *       403:
 *         description: Access denied
 *       404:
 *         description: User not found
 */
router.patch(
  "/users/:userId/status",
  authMiddleware,
  validate(activateDeactivateUserSchema),
  activateDeactivateUser
);


/**
 * @swagger
 * /api/auth/events/{eventId}/bulk-daos:
 *   post:
 *     summary: Bulk import DAO users to an event from Excel
 *     tags: [Event]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [daos]
 *             properties:
 *               daos:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [firstName, lastName, email]
 *                   properties:
 *                     firstName:
 *                       type: string
 *                     middleName:
 *                       type: string
 *                     lastName:
 *                       type: string
 *                     email:
 *                       type: string
 *                       format: email
 *                     title:
 *                       type: string
 *                     mobile:
 *                       type: string
 *                     country:
 *                       type: string
 *                     state:
 *                       type: string
 *                     city:
 *                       type: string
 *                     organisation:
 *                       type: string
 *                     position:
 *                       type: string
 *                     dateOfBirth:
 *                       type: string
 *                       format: date
 *                     gender:
 *                       type: string
 *                     nationality:
 *                       type: string
 *                     citizenship:
 *                       type: string
 *                     bloodGroup:
 *                       type: string
 *                     medicalConditions:
 *                       type: string
 *                     dietaryPreferences:
 *                       type: string
 *     responses:
 *       201:
 *         description: DAOs bulk imported successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Event not found
 *       500:
 *         description: Server error
 */
router.post(
  "/events/:eventId/bulk-daos",
  authMiddleware,
  validate(inviteDaoSchema),
  inviteBulkDaosToEvent
);

/**
 * =========================================================
 * SPEAKER MANAGEMENT
 * =========================================================
 */

/**
 * @swagger
 * /api/auth/speakers:
 *   post:
 *     summary: Create or update speakers (optionally add to event)
 *     description: Creates speaker users independently. Can optionally add them to an event at creation time. Supports optional profile photo and passport document uploads (multipart/form-data or base64).
 *     tags: [Speaker]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [speakers]
 *             properties:
 *               event_id:
 *                 type: string
 *                 description: Optional - Event ID to add speakers to
 *               speakers:
 *                 type: string
 *                 format: json
 *                 description: JSON string of speaker array. Example - [{"firstName":"John","lastName":"Doe","email":"john@example.com","organisationName":"ABC Corp","designation":"Manager","country":"India","photoIdType":"passport","photoIdNumber":"P123456","passportType":"ordinary","passportNumber":"A1234567","placeOfIssue":"Delhi","passportExpiry":"2025-12-31"}]
 *               photo:
 *                 type: string
 *                 format: binary
 *                 description: Optional - Profile photo (JPEG, PNG, WebP). Max 5MB. Applied to all speakers in request.
 *               photo_base64:
 *                 type: string
 *                 description: Alternative - Base64 encoded image string (data:image/jpeg;base64,...)
 *               passport_document:
 *                 type: string
 *                 format: binary
 *                 description: Optional - Passport document (PDF). Max 5MB. Applied to all speakers in request.
 *               passport_document_base64:
 *                 type: string
 *                 description: Alternative - Base64 encoded PDF string (data:application/pdf;base64,...)
 *     responses:
 *       201:
 *         description: Speakers created/updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 event_id:
 *                   type: string
 *                   nullable: true
 *                 summary:
 *                   type: object
 *                   properties:
 *                     total_processed:
 *                       type: number
 *                     created_count:
 *                       type: number
 *                     invited_with_email:
 *                       type: number
 *                     invited_no_email:
 *                       type: number
 *                     failed_count:
 *                       type: number
 *                     emails_sent:
 *                       type: number
 *                     emails_failed:
 *                       type: number
 *                 speakers:
 *                   type: array
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Only Super Admin and Event Manager can create speakers
 *       404:
 *         description: Event not found or SPEAKER role not configured
 *       500:
 *         description: Server error
 */
router.post(
  "/speakers",
  authMiddleware,
  uploadDocumentsSafe,
  validate(inviteSpeakerSchema),
  inviteSpeakersToEvent
);

/**
 * @swagger
 * /api/auth/speakers:
 *   get:
 *     summary: Get all speakers or filter by event
 *     description: Retrieves speaker users with optional filtering by event_id, search term, and pagination.
 *     tags: [Speaker]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: event_id
 *         schema:
 *           type: string
 *         description: Optional - Filter speakers by event ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Optional - Search by name, email, or organisation
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of records per page
 *     responses:
 *       200:
 *         description: Speakers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                     page:
 *                       type: number
 *                     limit:
 *                       type: number
 *                     pages:
 *                       type: number
 *                 speakers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       user_code:
 *                         type: string
 *                       name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       organisation:
 *                         type: string
 *                       designation:
 *                         type: string
 *                       about_yourself:
 *                         type: string
 *                       social_media:
 *                         type: object
 *                       account_status:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                       event:
 *                         type: object
 *                         nullable: true
 *       404:
 *         description: SPEAKER role not found
 *       500:
 *         description: Server error
 */
router.get(
  "/speakers",
  authMiddleware,
  getSpeakers
);

/**
 * @swagger
 * /api/auth/speakers/{userId}:
 *   get:
 *     summary: Get single speaker details
 *     description: Retrieves complete profile of a specific speaker including profile photo signed URL
 *     tags: [Speaker]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: Speaker user ID
 *     responses:
 *       200:
 *         description: Speaker retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 speaker:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     user_code:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     title:
 *                       type: string
 *                     first_name:
 *                       type: string
 *                     middle_name:
 *                       type: string
 *                     last_name:
 *                       type: string
 *                     organisation:
 *                       type: string
 *                     designation:
 *                       type: string
 *                     about_yourself:
 *                       type: string
 *                     event:
 *                       type: string
 *                     documents:
 *                       type: object
 *                       properties:
 *                         photo_url:
 *                           type: string
 *                           example: "profile-photos/uuid_timestamp_filename.png"
 *                         photo_signed_url:
 *                           type: string
 *                           example: "https://bucket.s3.region.amazonaws.com/..."
 *                     social_media:
 *                       type: object
 *                       properties:
 *                         linkedin:
 *                           type: string
 *                         youtube:
 *                           type: string
 *                         instagram:
 *                           type: string
 *                         twitter:
 *                           type: string
 *                     account_status:
 *                       type: string
 *                     created_at:
 *                       type: string
 *       400:
 *         description: User ID is required
 *       404:
 *         description: Speaker not found
 *       500:
 *         description: Server error
 */
router.get(
  "/speakers/:userId",
  authMiddleware,
  getSingleSpeaker
);

/**
 * @swagger
 * /api/auth/speakers/{userId}:
 *   patch:
 *     summary: Update speaker details
 *     description: Updates speaker profile information. Super Admin and Event Manager can update any speaker, speakers can update their own profile. Profile photo upload is optional.
 *     tags: [Speaker]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: Speaker user ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [firstName, email, organisationName, designation]
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Dr."
 *               firstName:
 *                 type: string
 *                 example: "John"
 *               middleName:
 *                 type: string
 *                 example: "Michael"
 *               lastName:
 *                 type: string
 *                 example: "Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john@example.com"
 *               organisationName:
 *                 type: string
 *                 example: "ABC Corporation"
 *               designation:
 *                 type: string
 *                 example: "Senior Manager"
 *               event:
 *                 type: string
 *                 example: "BRICS 2026"
 *               about_yourself:
 *                 type: string
 *                 example: "10+ years of experience..."
 *               youtube:
 *                 type: string
 *                 example: "https://youtube.com/@johndoe"
 *               instagram:
 *                 type: string
 *                 example: "@johndoe"
 *               linkedin:
 *                 type: string
 *                 example: "https://linkedin.com/in/johndoe"
 *               twitter:
 *                 type: string
 *                 example: "@johndoe"
 *               photo:
 *                 type: string
 *                 format: binary
 *                 description: Optional - Profile photo (JPEG, PNG, WebP). Max 5MB.
 *               photo_base64:
 *                 type: string
 *                 description: Alternative - Base64 encoded image string
 *     responses:
 *       200:
 *         description: Speaker updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 speaker:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     user_code:
 *                       type: string
 *                     name:
 *                       type: string
 *                     email:
 *                       type: string
 *                     title:
 *                       type: string
 *                     organisation:
 *                       type: string
 *                     designation:
 *                       type: string
 *                     about_yourself:
 *                       type: string
 *                     documents:
 *                       type: object
 *                       properties:
 *                         photo_url:
 *                           type: string
 *                         photo_signed_url:
 *                           type: string
 *                     social_media:
 *                       type: object
 *                       properties:
 *                         linkedin:
 *                           type: string
 *                         youtube:
 *                           type: string
 *                         instagram:
 *                           type: string
 *                         twitter:
 *                           type: string
 *       400:
 *         description: Invalid input or photo upload failed
 *       403:
 *         description: No permission to update this speaker
 *       404:
 *         description: Speaker not found
 *       500:
 *         description: Server error
 */
router.patch(
  "/speakers/:userId",
  authMiddleware,
  uploadDocumentsSafe,
  validate(updateSpeakerSchema),
  updateSpeaker
);

export default router;