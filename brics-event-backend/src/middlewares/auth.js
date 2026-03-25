import redisClient from "../config/redis.js";
import { verifyToken } from "../data/jwt.js";
import User from "../models/User.js";

export const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "UNAUTHORIZED" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyToken(token);

    const activeSession = await redisClient.get(
      `user_session:${decoded.sub}`
    );

    // MULTI SESSION SUPPORT (DISABLED)
    // const prevSession = await redisClient.get(
    //   `user_session_prev:${decoded.sub}`
    // );

    // STRICT SINGLE SESSION
    if (!activeSession || decoded.session_id !== activeSession) {
      return res.status(401).json({
        message: "SESSION_REPLACED"
      });
    }

    /*
    // OLD LOGIC (DISABLED)
    if (
      !activeSession ||
      (decoded.session_id !== activeSession &&
       decoded.session_id !== prevSession)
    ) {
      return res.status(401).json({ message: "Session expired" });
    }
    */

    // Check if user account is blocked or inactive
    const user = await User.findOne({ id: decoded.sub }).select('account_status');
    if (!user) {
      return res.status(401).json({ message: "UNAUTHORIZED" });
    }

    if (user.account_status === 'blocked') {
      // Clear session when user is blocked
      await redisClient.del(`user_session:${decoded.sub}`);
      return res.status(403).json({ message: "ACCOUNT_DEACTIVATED" });
    }

    if (user.account_status !== 'active') {
      return res.status(403).json({ message: "ACCOUNT_NOT_ACTIVE" });
    }

    req.user = { user_id: decoded.sub, _id: decoded.sub };
    next();

  } catch {
    return res.status(401).json({
      message: "SESSION_EXPIRED"
    });
  }
};
