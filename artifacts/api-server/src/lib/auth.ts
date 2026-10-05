import * as client from "openid-client";
import crypto from "crypto";
import { type Request, type Response } from "express";
import { db, sessionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { AuthUser } from "@workspace/api-zod";

export const ISSUER_URL = process.env.ISSUER_URL ?? "https://replit.com/oidc";
export const SESSION_COOKIE = "sid";
export const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;

export interface SessionData {
  user: AuthUser;
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
}

const inMemorySessions = new Map<string, SessionData & { expire: Date }>();

let oidcConfig: client.Configuration | null = null;

export async function getOidcConfig(): Promise<client.Configuration> {
  if (!oidcConfig) {
    if (!process.env.REPL_ID) {
      throw new Error("REPL_ID not set");
    }
    oidcConfig = await client.discovery(
      new URL(ISSUER_URL),
      process.env.REPL_ID,
    );
  }
  return oidcConfig;
}

export async function createSession(data: SessionData): Promise<string> {
  const sid = crypto.randomBytes(32).toString("hex");
  const expire = new Date(Date.now() + SESSION_TTL);
  inMemorySessions.set(sid, { ...data, expire });

  try {
    await db.insert(sessionsTable).values({
      sid,
      sess: data as unknown as Record<string, unknown>,
      expire,
    });
  } catch {
    // If DB is offline, in-memory session is retained
  }
  return sid;
}

export async function getSession(sid: string): Promise<SessionData | null> {
  const inMem = inMemorySessions.get(sid);
  if (inMem) {
    if (inMem.expire < new Date()) {
      inMemorySessions.delete(sid);
      return null;
    }
    return inMem;
  }

  try {
    const [row] = await db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.sid, sid));

    if (!row || row.expire < new Date()) {
      if (row) await deleteSession(sid);
      return null;
    }

    const sess = row.sess as unknown as SessionData;
    inMemorySessions.set(sid, { ...sess, expire: row.expire });
    return sess;
  } catch {
    return null;
  }
}

export async function updateSession(
  sid: string,
  data: SessionData,
): Promise<void> {
  const expire = new Date(Date.now() + SESSION_TTL);
  inMemorySessions.set(sid, { ...data, expire });
  try {
    await db
      .update(sessionsTable)
      .set({
        sess: data as unknown as Record<string, unknown>,
        expire,
      })
      .where(eq(sessionsTable.sid, sid));
  } catch {
    // Graceful fallback
  }
}

export async function deleteSession(sid: string): Promise<void> {
  inMemorySessions.delete(sid);
  try {
    await db.delete(sessionsTable).where(eq(sessionsTable.sid, sid));
  } catch {
    // Graceful fallback
  }
}

export async function clearSession(
  res: Response,
  sid?: string,
): Promise<void> {
  if (sid) await deleteSession(sid);
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

export function getSessionId(req: Request): string | undefined {
  const authHeader = req.headers["authorization"];
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return req.cookies?.[SESSION_COOKIE];
}
