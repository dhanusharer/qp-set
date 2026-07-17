import type { NextFunction, Request, Response } from "express";
import { Role } from "@prisma/client";
import { prisma } from "../db.js";
import { ApiError } from "./error.js";

declare global {
  namespace Express {
    interface Request {
      assignment?: any;
    }
  }
}

export async function requireAssignmentOwnership(req: Request, res: Response, next: NextFunction) {
  try {
    const assignmentId = Number(req.params.id);
    if (isNaN(assignmentId)) {
      return next(new ApiError(400, "Invalid assignment ID"));
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { course: true }
    });

    if (!assignment) {
      return next(new ApiError(404, "Assignment not found"));
    }

    const user = req.user;
    if (!user) {
      return next(new ApiError(401, "Authentication required"));
    }

    // Role-based ownership checks
    if (user.role === Role.controller) {
      req.assignment = assignment;
      return next();
    }

    if (user.role === Role.hod) {
      if (assignment.hodId !== user.sub) {
        return next(new ApiError(403, "Access denied: You do not coordinate this assignment"));
      }
      req.assignment = assignment;
      return next();
    }

    if (user.role === Role.qpsetter) {
      if (assignment.facultyId !== user.sub) {
        return next(new ApiError(403, "Access denied: You are not assigned to this paper"));
      }
      req.assignment = assignment;
      return next();
    }

    return next(new ApiError(403, "Access denied: Insufficient privileges"));
  } catch (err) {
    next(err);
  }
}
