import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET environment variable is required. Set it as a Replit Secret.");
    }
    return "pedagogia-dev-only-not-for-production-" + Math.random().toString(36).slice(2);
  }
  return secret;
})();

export interface JwtPayload {
  teacherId: string;
  email: string;
}

export function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token de autenticação obrigatório" });
    return;
  }
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.teacherId = payload.teacherId;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido ou expirado" });
  }
}
