import jwt from "jsonwebtoken";
import { databaseProvider } from "@workspace/db";

const SECRET = process.env.SESSION_SECRET;
if (!SECRET) {
  throw new Error("SESSION_SECRET environment variable is required but not set. The server cannot start without it.");
}

// IDs can overlap across the temporary and external databases. Bind sessions to
// their data store and environment so an old token cannot access a new account.
const issuer = `brutepawa:${databaseProvider}:${process.env.NODE_ENV === "production" ? "production" : "development"}`;

export function signToken(userId: number, role: string): string {
  return jwt.sign({ userId, role }, SECRET!, { expiresIn: "30d", issuer });
}

export function verifyToken(token: string): { userId: number; role: string } | null {
  try {
    const payload = jwt.verify(token, SECRET!) as jwt.JwtPayload & { userId: number; role: string };
    if (payload.iss !== issuer) return null;
    if (!Number.isSafeInteger(payload.userId) || payload.userId <= 0 || typeof payload.role !== "string") return null;
    return payload;
  } catch {
    return null;
  }
}
