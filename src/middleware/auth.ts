import type { NextFunction, Request, Response } from "express";
import { verifyJWTToken } from "../utils/jwt";

export const auth = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  const decodedToken = verifyJWTToken(token);
  req.user = decodedToken as any;

  next();
};
