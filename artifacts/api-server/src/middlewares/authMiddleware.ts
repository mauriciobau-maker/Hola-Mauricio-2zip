import { type Request, type Response, type NextFunction } from "express";
import type { AuthUser } from "@workspace/api-zod";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { clerkMiddleware, getAuth, clerkClient } from "@clerk/express";

declare global {
  namespace Express {
    interface User extends AuthUser {}

    interface Request {
      isAuthenticated(): this is AuthedRequest;

      user?: User | undefined;
    }

    export interface AuthedRequest {
      user: User;
    }
  }
}

// Lee la cookie/header de sesión de Clerk y, si existe, deja el resultado
// disponible vía getAuth(req). No golpea la base de datos ni la red de
// Clerk por sí sola — debe ir antes de authMiddleware.
export const clerkAuth = clerkMiddleware();

/**
 * A partir del usuario ya verificado por Clerk, resuelve (o crea, la
 * primera vez que ese usuario de Clerk aparece) la fila correspondiente
 * en nuestra propia tabla `users` — la misma tabla y las mismas columnas
 * (clubId, playerId, isAdmin, isClubAdmin) que ya usaba todo el resto de
 * la aplicación. Así ninguna ruta existente (requireCommunityAccess,
 * isSuperAdminUser, etc.) necesita enterarse de que cambió el proveedor
 * de login.
 *
 * Igual que el middleware anterior, los datos de autorización se leen
 * frescos de la base en cada request — si un admin cambia el rol o el
 * club de alguien, se refleja de inmediato, sin esperar a que expire
 * ninguna sesión cacheada.
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  req.isAuthenticated = function (this: Request) {
    return this.user != null;
  } as Request["isAuthenticated"];

  const { userId: clerkUserId } = getAuth(req);
  if (!clerkUserId) {
    next();
    return;
  }

  try {
    let [dbUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, clerkUserId));

    if (!dbUser) {
      // Primera vez que este usuario de Clerk hace un pedido autenticado:
      // le creamos su fila en nuestra tabla. Si ya tenías una cuenta previa
      // (de Replit Auth) que quieras conservar, se vincula a mano una sola
      // vez asignándole este mismo clerkUserId — no se hace automático
      // por email, para no vincular cuentas por error.
      const clerkUser = await clerkClient.users.getUser(clerkUserId);
      [dbUser] = await db
        .insert(usersTable)
        .values({
          clerkUserId,
          email: clerkUser.primaryEmailAddress?.emailAddress ?? null,
          firstName: clerkUser.firstName ?? null,
          lastName: clerkUser.lastName ?? null,
          profileImageUrl: clerkUser.imageUrl ?? null,
        })
        .returning();
    }

    req.user = {
      id: dbUser.id,
      email: dbUser.email,
      firstName: dbUser.firstName,
      lastName: dbUser.lastName,
      profileImageUrl: dbUser.profileImageUrl,
      playerId: dbUser.playerId,
      clubId: dbUser.clubId,
      isAdmin: dbUser.isAdmin ? 1 : 0,
      isClubAdmin: dbUser.isClubAdmin ? 1 : 0,
    } as AuthUser;
  } catch (error) {
    console.error("Error resolviendo el usuario autenticado con Clerk:", error);
    // No autenticamos silenciosamente en falso: si algo falla acá, seguimos
    // sin req.user, y las rutas protegidas rechazarán el pedido como
    // corresponde, en vez de dejar pasar algo a medio resolver.
  }

  next();
}
