import type { NextFunction, Request, Response } from "express";
import type { User } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../lib/jwt";
import { HttpError } from "./error-handler";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new HttpError(401, "Not authenticated");
    }
    const token = header.slice("Bearer ".length);
    const payload = verifyToken(token);

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.isActive) {
      throw new HttpError(401, "Not authenticated");
    }

    req.user = user;
    next();
  } catch (err) {
    if (err instanceof HttpError) return next(err);
    next(new HttpError(401, "Not authenticated"));
  }
}
