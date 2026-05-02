import { Request, Response, NextFunction } from "express";
import { db, teachersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { TeacherRole } from "@workspace/db";

export function requireRole(...roles: TeacherRole[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.teacherId) {
      res.status(401).json({ error: "Autenticação obrigatória" });
      return;
    }
    try {
      const [teacher] = await db
        .select({ role: teachersTable.role, isBlocked: teachersTable.isBlocked })
        .from(teachersTable)
        .where(eq(teachersTable.id, req.teacherId));

      if (!teacher) {
        res.status(401).json({ error: "Usuário não encontrado" });
        return;
      }
      if (teacher.isBlocked) {
        res.status(403).json({ error: "Conta bloqueada. Entre em contato com o suporte." });
        return;
      }
      if (!roles.includes(teacher.role)) {
        res.status(403).json({ error: "Acesso não autorizado" });
        return;
      }
      req.teacherRole = teacher.role;
      next();
    } catch (err) {
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  };
}

export function requireSchoolAdmin() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.teacherId) {
      res.status(401).json({ error: "Autenticação obrigatória" });
      return;
    }
    try {
      const [teacher] = await db
        .select({ role: teachersTable.role, isBlocked: teachersTable.isBlocked })
        .from(teachersTable)
        .where(eq(teachersTable.id, req.teacherId));

      if (!teacher) {
        res.status(401).json({ error: "Usuário não encontrado" });
        return;
      }
      if (teacher.isBlocked) {
        res.status(403).json({ error: "Conta bloqueada. Entre em contato com o suporte." });
        return;
      }
      if (teacher.role !== "admin_institucional" && teacher.role !== "super_admin") {
        res.status(403).json({ error: "Acesso exclusivo para diretores" });
        return;
      }
      req.teacherRole = teacher.role;
      next();
    } catch {
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  };
}
