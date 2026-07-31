import type { NextFunction, Request, Response } from "express";
import { roleCanAccess, type Role } from "../lib/constants/roles";
import { HttpError } from "./error-handler";

export function requireRole(moduleKey: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new HttpError(401, "Not authenticated"));
    }
    if (!roleCanAccess(req.user.role as Role, moduleKey)) {
      return next(new HttpError(403, "Not authorized for this module"));
    }
    next();
  };
}
