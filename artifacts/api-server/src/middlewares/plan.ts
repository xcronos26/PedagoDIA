import { Request, Response, NextFunction } from "express";
import { db, teachersTable, classesTable, studentsTable, activitiesTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import type { PlanType, Teacher } from "@workspace/db";

const PLAN_TIERS: Record<PlanType, number> = {
  free: 0,
  basic: 1,
  medium: 2,
  advanced: 3,
};

const FREE_LIMITS: Record<"classes" | "students" | "activities", number> = {
  classes: 1,
  students: 15,
  activities: 15,
};

const FREE_LIMIT_MESSAGES: Record<"classes" | "students" | "activities", string> = {
  classes: "Plano gratuito permite no máximo 1 turma. Faça upgrade para criar mais turmas.",
  students: "Plano gratuito permite no máximo 15 alunos. Faça upgrade para adicionar mais alunos.",
  activities: "Plano gratuito permite no máximo 15 atividades. Faça upgrade para criar mais atividades.",
};

export async function getPlanTier(teacher: Teacher): Promise<PlanType> {
  if (teacher.planStatus === "trial") {
    const now = new Date();
    const expiration = teacher.planExpirationDate;
    if (expiration && expiration <= now) {
      await db
        .update(teachersTable)
        .set({ planType: "free", planStatus: "active" })
        .where(eq(teachersTable.id, teacher.id));
      return "free";
    }
    return "advanced";
  }

  if (teacher.planStatus === "overdue" || teacher.planStatus === "canceled") {
    return "free";
  }

  return teacher.planType;
}

export function requirePlan(minPlan: PlanType) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const [teacher] = await db
        .select()
        .from(teachersTable)
        .where(eq(teachersTable.id, req.teacherId!));

      if (!teacher) {
        res.status(401).json({ error: "Professora não encontrada" });
        return;
      }

      const effectiveTier = await getPlanTier(teacher);
      const effectiveLevel = PLAN_TIERS[effectiveTier];
      const requiredLevel = PLAN_TIERS[minPlan];

      if (effectiveLevel < requiredLevel) {
        res.status(403).json({
          error: "Plano insuficiente para acessar este recurso",
          requiredPlan: minPlan,
          currentPlan: effectiveTier,
        });
        return;
      }

      req.effectivePlanTier = effectiveTier;
      next();
    } catch (err) {
      req.log.error({ err }, "Error checking plan tier");
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  };
}

export function requireFreePlanLimit(resource: "classes" | "students" | "activities") {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const [teacher] = await db
        .select()
        .from(teachersTable)
        .where(eq(teachersTable.id, req.teacherId!));

      if (!teacher) {
        res.status(401).json({ error: "Professora não encontrada" });
        return;
      }

      const effectiveTier = await getPlanTier(teacher);

      if (effectiveTier !== "free") {
        next();
        return;
      }

      if (teacher.planStatus === "overdue") {
        res.status(403).json({
          error: "Sua assinatura está em atraso. Regularize o pagamento para criar novos recursos.",
          requiredPlan: "active",
          currentPlan: effectiveTier,
        });
        return;
      }

      const limit = FREE_LIMITS[resource];
      let currentCount = 0;

      if (resource === "classes") {
        const [row] = await db
          .select({ total: count() })
          .from(classesTable)
          .where(eq(classesTable.teacherId, req.teacherId!));
        currentCount = row?.total ?? 0;
      } else if (resource === "students") {
        const [row] = await db
          .select({ total: count() })
          .from(studentsTable)
          .where(eq(studentsTable.teacherId, req.teacherId!));
        currentCount = row?.total ?? 0;
      } else if (resource === "activities") {
        const [row] = await db
          .select({ total: count() })
          .from(activitiesTable)
          .where(eq(activitiesTable.teacherId, req.teacherId!));
        currentCount = row?.total ?? 0;
      }

      if (currentCount >= limit) {
        res.status(403).json({
          error: FREE_LIMIT_MESSAGES[resource],
          requiredPlan: "advanced",
          currentPlan: effectiveTier,
          limit,
          current: currentCount,
        });
        return;
      }

      next();
    } catch (err) {
      req.log.error({ err }, "Error checking plan limits");
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  };
}
