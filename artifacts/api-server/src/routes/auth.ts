import * as oidc from "openid-client";
import { Router, type IRouter, type Request, type Response } from "express";
import * as z from "zod";
import { eq } from "drizzle-orm";
import { db, usersTable, clubsTable } from "@workspace/db";
import {
  clearSession,
  getOidcConfig,
  getSessionId,
  createSession,
  deleteSession,
  SESSION_COOKIE,
  SESSION_TTL,
  ISSUER_URL,
  type SessionData,
} from "../lib/auth";

const ExchangeMobileAuthorizationCodeBody = z.object({
  code: z.string().min(1),
  code_verifier: z.string().min(1),
  redirect_uri: z.string().min(1),
  state: z.string().min(1),
  nonce: z.string().min(1).optional(),
});

const OIDC_COOKIE_TTL = 10 * 60 * 1000;

const router: IRouter = Router();

function getOrigin(req: Request): string {
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host =
    req.headers["x-forwarded-host"] || req.headers["host"] || "localhost";
  return `${proto}://${host}`;
}

function setSessionCookie(res: Response, sid: string) {
  res.cookie(SESSION_COOKIE, sid, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: SESSION_TTL,
    ...( { partitioned: true } as any ),
  });
}

function setOidcCookie(res: Response, name: string, value: string) {
  res.cookie(name, value, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: OIDC_COOKIE_TTL,
    ...( { partitioned: true } as any ),
  });
}

function getSafeReturnTo(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }
  return value;
}

async function upsertUser(claims: Record<string, unknown>) {
  const userData = {
    id: claims.sub as string,
    email: (claims.email as string) || null,
    firstName: (claims.first_name as string) || null,
    lastName: (claims.last_name as string) || null,
    profileImageUrl: (claims.profile_image_url || claims.picture) as string | null,
  };

  const [user] = await db
    .insert(usersTable)
    .values(userData)
    .onConflictDoUpdate({
      target: usersTable.id,
      set: {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        profileImageUrl: userData.profileImageUrl,
        updatedAt: new Date(),
      },
    })
    .returning();
  return user;
}

async function getUserWithClub(userId: string) {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));

  if (!user) return null;

  let club = null;
  if (user.clubId) {
    const [c] = await db
      .select({ id: clubsTable.id, name: clubsTable.name, slug: clubsTable.slug, plan: clubsTable.plan })
      .from(clubsTable)
      .where(eq(clubsTable.id, user.clubId));
    club = c ?? null;
  }

  return { ...user, club };
}

router.get("/auth/user", async (req: Request, res: Response) => {
  if (!req.isAuthenticated() || !req.user) {
    res.json({ user: null });
    return;
  }
  try {
    const userWithClub = await getUserWithClub(req.user.id);
    res.json({ user: userWithClub ?? req.user });
  } catch {
    res.json({ user: req.user });
  }
});

router.post("/auth/link-player", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }
  const { playerId } = req.body;
  if (!playerId || typeof playerId !== "number") {
    res.status(400).json({ error: "playerId requerido" });
    return;
  }
  const [updated] = await db
    .update(usersTable)
    .set({ playerId, updatedAt: new Date() })
    .where(eq(usersTable.id, req.user.id))
    .returning();
  res.json({ user: updated });
});

router.post("/auth/join-club", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }
  const { inviteCode } = req.body;
  if (!inviteCode || typeof inviteCode !== "string") {
    res.status(400).json({ error: "Código de invitación requerido" });
    return;
  }

  const [club] = await db
    .select()
    .from(clubsTable)
    .where(eq(clubsTable.inviteCode, inviteCode.toUpperCase().trim()));

  if (!club) {
    res.status(404).json({ error: "Código de invitación inválido" });
    return;
  }
  if (!club.active) {
    res.status(403).json({ error: "Este club no está activo" });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ clubId: club.id, updatedAt: new Date() })
    .where(eq(usersTable.id, req.user.id))
    .returning();

  res.json({
    success: true,
    club: { id: club.id, name: club.name, slug: club.slug },
    user: updated,
  });
});

router.post("/auth/switch-club", async (req: Request, res: Response) => {
  if (!req.isAuthenticated() || !req.user) {
    res.status(401).json({ error: "No autenticado" });
    return;
  }

  const { clubId } = req.body;
  if (!clubId || typeof clubId !== "number") {
    res.status(400).json({ error: "clubId requerido" });
    return;
  }

  const [club] = await db
    .select()
    .from(clubsTable)
    .where(eq(clubsTable.id, clubId));

  if (!club) {
    res.status(404).json({ error: "Club no encontrado" });
    return;
  }

  if (!club.active) {
    res.status(403).json({ error: "Este club no está activo" });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set({ clubId, updatedAt: new Date() })
    .where(eq(usersTable.id, req.user.id))
    .returning();

  const userWithClub = await getUserWithClub(updated.id);

  res.json({
    success: true,
    club: { id: club.id, name: club.name, slug: club.slug },
    user: userWithClub ?? updated,
  });
});

function getMockSessionForRole(roleParamRaw?: string): SessionData {
  const roleParam = (roleParamRaw || "superadmin").toLowerCase();
  if (roleParam === "admin_tenis" || roleParam === "tenis") {
    return {
      user: {
        id: "usr_admin_tenis",
        email: "admin.tenis@club.com",
        firstName: "Admin",
        lastName: "Real Tenis Club",
        profileImageUrl: null,
        clubId: 2, // Real Tenis Club (Solo Tenis)
        isAdmin: 0,
        isClubAdmin: 1,
      },
      access_token: "mock-token-tenis",
      expires_at: Math.floor(Date.now() / 1000) + 86400 * 7,
    };
  } else if (roleParam === "admin_futbol" || roleParam === "futbol") {
    return {
      user: {
        id: "usr_admin_futbol",
        email: "admin.futbol@club.com",
        firstName: "Admin",
        lastName: "Liga Fútbol 5 & 7",
        profileImageUrl: null,
        clubId: 3, // Liga Fútbol (Solo Fútbol)
        isAdmin: 0,
        isClubAdmin: 1,
      },
      access_token: "mock-token-futbol",
      expires_at: Math.floor(Date.now() / 1000) + 86400 * 7,
    };
  } else if (roleParam === "admin_multi" || roleParam === "multisport") {
    return {
      user: {
        id: "usr_admin_multi",
        email: "admin.multisport@club.com",
        firstName: "Admin",
        lastName: "Multisport Arena",
        profileImageUrl: null,
        clubId: 4, // Multisport Arena Pro (Pádel, Tenis y Fútbol)
        isAdmin: 0,
        isClubAdmin: 1,
      },
      access_token: "mock-token-multi",
      expires_at: Math.floor(Date.now() / 1000) + 86400 * 7,
    };
  } else if (roleParam === "admin_central" || roleParam === "colaborador" || roleParam === "adminclub" || roleParam === "club_admin") {
    return {
      user: {
        id: "usr_colaborador_demo",
        email: "admin.club@padeltracker.com",
        firstName: "Admin",
        lastName: "Pádel Central",
        profileImageUrl: null,
        clubId: 1,
        isAdmin: 0,
        isClubAdmin: 1,
      },
      access_token: "mock-token-colaborador",
      expires_at: Math.floor(Date.now() / 1000) + 86400 * 7,
    };
  } else if (roleParam === "jugador" || roleParam === "player") {
    return {
      user: {
        id: "usr_jugador_demo",
        email: "jugador@padeltracker.com",
        firstName: "Carlos",
        lastName: "Ruiz",
        profileImageUrl: null,
        clubId: 1,
        playerId: 1,
        isAdmin: 0,
        isClubAdmin: 0,
      },
      access_token: "mock-token-jugador",
      expires_at: Math.floor(Date.now() / 1000) + 86400 * 7,
    };
  } else {
    return {
      user: {
        id: "usr_superadmin_mauricio",
        email: "mauricio.bau@gmail.com",
        firstName: "Mauricio",
        lastName: "Bau",
        profileImageUrl: null,
        clubId: 1,
        playerId: 9,
        isAdmin: 2,
        isClubAdmin: 1,
      },
      access_token: "mock-token-superadmin",
      expires_at: Math.floor(Date.now() / 1000) + 86400 * 7,
    };
  }
}

router.get("/login/demo", async (req: Request, res: Response) => {
  const role = (req.query.as as string) || (req.query.role as string) || "superadmin";
  const mockUser = getMockSessionForRole(role);
  const sid = await createSession(mockUser);
  setSessionCookie(res, sid);
  res.json({ success: true, token: sid, user: mockUser.user });
});

router.post("/login/demo", async (req: Request, res: Response) => {
  const role = (req.body?.as as string) || (req.body?.role as string) || (req.query.as as string) || "superadmin";
  const mockUser = getMockSessionForRole(role);
  const sid = await createSession(mockUser);
  setSessionCookie(res, sid);
  res.json({ success: true, token: sid, user: mockUser.user });
});

router.get("/login", async (req: Request, res: Response) => {
  const returnTo = getSafeReturnTo(req.query.returnTo);

  if (!process.env.REPL_ID) {
    const roleParam = ((req.query.as as string) || (req.query.role as string) || "superadmin").toLowerCase();
    const mockUser = getMockSessionForRole(roleParam);
    const sid = await createSession(mockUser);
    setSessionCookie(res, sid);

    // Render an HTML trampoline that stores the token in localStorage (bypassing third-party cookie blocking in iframes)
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Iniciando sesión...</title>
</head>
<body style="background:#090d16;color:#e2e8f0;font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
  <div style="text-align:center;">
    <p style="font-size:16px;font-weight:600;">Accediendo a la plataforma...</p>
  </div>
  <script>
    try {
      localStorage.setItem("padel_auth_token", ${JSON.stringify(sid)});
      localStorage.setItem("padel_auth_user", ${JSON.stringify(JSON.stringify(mockUser.user))});
    } catch (e) {
      console.error(e);
    }
    window.location.replace(${JSON.stringify(returnTo)});
  </script>
</body>
</html>`);
    return;
  }

  const config = await getOidcConfig();
  const callbackUrl = `${getOrigin(req)}/api/callback`;

  const state = oidc.randomState();
  const nonce = oidc.randomNonce();
  const codeVerifier = oidc.randomPKCECodeVerifier();
  const codeChallenge = await oidc.calculatePKCECodeChallenge(codeVerifier);

  const redirectTo = oidc.buildAuthorizationUrl(config, {
    redirect_uri: callbackUrl,
    scope: "openid email profile offline_access",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    prompt: "login consent",
    state,
    nonce,
  });

  setOidcCookie(res, "code_verifier", codeVerifier);
  setOidcCookie(res, "nonce", nonce);
  setOidcCookie(res, "state", state);
  setOidcCookie(res, "return_to", returnTo);

  res.redirect(redirectTo.href);
});

router.get("/callback", async (req: Request, res: Response) => {
  const config = await getOidcConfig();
  const callbackUrl = `${getOrigin(req)}/api/callback`;

  const codeVerifier = req.cookies?.code_verifier;
  const nonce = req.cookies?.nonce;
  const expectedState = req.cookies?.state;

  if (!codeVerifier || !expectedState) {
    res.redirect("/api/login");
    return;
  }

  const currentUrl = new URL(
    `${callbackUrl}?${new URL(req.url, `http://${req.headers.host}`).searchParams}`,
  );

  let tokens: oidc.TokenEndpointResponse & oidc.TokenEndpointResponseHelpers;
  try {
    tokens = await oidc.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: codeVerifier,
      expectedNonce: nonce,
      expectedState,
      idTokenExpected: true,
    });
  } catch {
    res.redirect("/api/login");
    return;
  }

  const returnTo = getSafeReturnTo(req.cookies?.return_to);

  res.clearCookie("code_verifier", { path: "/" });
  res.clearCookie("nonce", { path: "/" });
  res.clearCookie("state", { path: "/" });
  res.clearCookie("return_to", { path: "/" });

  const claims = tokens.claims();
  if (!claims) {
    res.redirect("/api/login");
    return;
  }

  const dbUser = await upsertUser(claims as unknown as Record<string, unknown>);

  const now = Math.floor(Date.now() / 1000);
  const sessionData: SessionData = {
    user: {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      profileImageUrl: dbUser.profileImageUrl,
      clubId: dbUser.clubId ?? null,
      isAdmin: dbUser.isAdmin,
      isClubAdmin: dbUser.isClubAdmin,
    },
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : claims.exp,
  };

  const sid = await createSession(sessionData);
  setSessionCookie(res, sid);
  res.redirect(returnTo);
});

router.get("/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  await clearSession(res, sid);

  if (!process.env.REPL_ID) {
    res.redirect("/");
    return;
  }

  const config = await getOidcConfig();
  const origin = getOrigin(req);

  const endSessionUrl = oidc.buildEndSessionUrl(config, {
    client_id: process.env.REPL_ID!,
    post_logout_redirect_uri: origin,
  });

  res.redirect(endSessionUrl.href);
});

router.post("/mobile-auth/token-exchange", async (req: Request, res: Response) => {
  const parsed = ExchangeMobileAuthorizationCodeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required parameters" });
    return;
  }

  const { code, code_verifier, redirect_uri, state, nonce } = parsed.data;

  try {
    const config = await getOidcConfig();

    const callbackUrl = new URL(redirect_uri);
    callbackUrl.searchParams.set("code", code);
    callbackUrl.searchParams.set("state", state);
    callbackUrl.searchParams.set("iss", ISSUER_URL);

    const tokens = await oidc.authorizationCodeGrant(config, callbackUrl, {
      pkceCodeVerifier: code_verifier,
      expectedNonce: nonce ?? undefined,
      expectedState: state,
      idTokenExpected: true,
    });

    const claims = tokens.claims();
    if (!claims) {
      res.status(401).json({ error: "No claims in ID token" });
      return;
    }

    const dbUser = await upsertUser(claims as unknown as Record<string, unknown>);

    const now = Math.floor(Date.now() / 1000);
    const sessionData: SessionData = {
      user: {
        id: dbUser.id,
        email: dbUser.email,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        profileImageUrl: dbUser.profileImageUrl,
        clubId: dbUser.clubId ?? null,
        isAdmin: dbUser.isAdmin,
        isClubAdmin: dbUser.isClubAdmin,
      },
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expiresIn() ? now + tokens.expiresIn()! : claims.exp,
    };

    const sid = await createSession(sessionData);
    res.json({ token: sid });
  } catch (err) {
    req.log.error({ err }, "Mobile token exchange error");
    res.status(500).json({ error: "Token exchange failed" });
  }
});

router.post("/mobile-auth/logout", async (req: Request, res: Response) => {
  const sid = getSessionId(req);
  if (sid) {
    await deleteSession(sid);
  }
  res.json({ success: true });
});

export default router;
