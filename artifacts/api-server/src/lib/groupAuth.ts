/**
 * groupAuth.ts
 * Reusable server-side helpers that enforce role-based access control for
 * community groups and chat groups.  Every handler that mutates group state
 * must call one of these helpers before touching the database.
 */

import { db, groupMembersTable, chatGroupMembersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import type { Response } from "express";

// ── Community groups ─────────────────────────────────────────────────────────
// Roles in community groups: "admin" | "moderator" | "member"
// The group creator is inserted as "admin".

export type CommunityGroupRole = "admin" | "moderator" | "member";

/**
 * Fetch the caller's membership in a community group and verify their role is
 * among `allowedRoles`.  Returns the membership row on success.
 * On failure (not a member, or wrong role) sends a 403 JSON response and
 * returns null — the caller must return immediately after a null result.
 */
export async function assertCommunityGroupRole(
  res: Response,
  groupId: number,
  userId: number,
  allowedRoles: CommunityGroupRole[],
  errorMessage = "Accès réservé aux administrateurs du groupe",
): Promise<{ role: CommunityGroupRole } | null> {
  const [membership] = await db
    .select({ role: groupMembersTable.role })
    .from(groupMembersTable)
    .where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, userId)))
    .limit(1);

  if (!membership || !allowedRoles.includes(membership.role as CommunityGroupRole)) {
    res.status(403).json({ error: errorMessage });
    return null;
  }

  return membership as { role: CommunityGroupRole };
}

/** Require "admin" role (group owner/admin).  Use for settings changes. */
export const assertCommunityGroupAdmin = (res: Response, groupId: number, userId: number) =>
  assertCommunityGroupRole(
    res,
    groupId,
    userId,
    ["admin"],
    "Réservé à l'administrateur du groupe",
  );

/** Require "admin" OR "moderator" role.  Use for member management. */
export const assertCommunityGroupAdminOrModerator = (res: Response, groupId: number, userId: number) =>
  assertCommunityGroupRole(
    res,
    groupId,
    userId,
    ["admin", "moderator"],
    "Réservé aux admins et modérateurs",
  );

// ── Chat groups ──────────────────────────────────────────────────────────────
// Roles in chat groups: "owner" | "admin" | "member"

export type ChatGroupRole = "owner" | "admin" | "member";

/**
 * Fetch the caller's membership in a chat group and verify their role is
 * among `allowedRoles`.  Returns the membership row on success.
 * On failure sends a 403 JSON response and returns null.
 */
export async function assertChatGroupRole(
  res: Response,
  groupId: number,
  userId: number,
  allowedRoles: ChatGroupRole[],
  errorMessage = "Accès réservé aux administrateurs du groupe",
): Promise<{ role: ChatGroupRole } | null> {
  const [membership] = await db
    .select({ role: chatGroupMembersTable.role })
    .from(chatGroupMembersTable)
    .where(and(eq(chatGroupMembersTable.groupId, groupId), eq(chatGroupMembersTable.userId, userId)))
    .limit(1);

  if (!membership || !allowedRoles.includes(membership.role as ChatGroupRole)) {
    res.status(403).json({ error: errorMessage });
    return null;
  }

  return membership as { role: ChatGroupRole };
}

/** Require "owner" OR "admin" role in a chat group. */
export const assertChatGroupAdminOrOwner = (res: Response, groupId: number, userId: number) =>
  assertChatGroupRole(
    res,
    groupId,
    userId,
    ["owner", "admin"],
    "Réservé aux propriétaires et administrateurs du groupe",
  );
