import jwt from "jsonwebtoken";

const privateKey = process.env.JWT_PRIVATE_KEY;
const publicKey = process.env.JWT_PUBLIC_KEY;

/* ACCESS TOKEN */
export const signToken = (payload) => {
  return jwt.sign(payload, privateKey, {
    algorithm: "RS256",
    expiresIn: process.env.JWT_EXPIRES_IN || "15m",
  });
};

export const verifyToken = (token) => {
  return jwt.verify(token, publicKey, {
    algorithms: ["RS256"],
  });
};

/* REFRESH TOKEN */
export const signRefreshToken = (payload) => {
  return jwt.sign(payload, privateKey, {
    algorithm: "RS256",
    expiresIn: "7d",
  });
};

export const verifyRefreshToken = (token) => {
  return jwt.verify(token, publicKey, {
    algorithms: ["RS256"],
  });
};
