import { Router, type IRouter } from "express";
import { db, lessonPlansTable, lessonPlanActivitiesTable, activitiesTable } from "@workspace/db";
import { eq, and, like, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

function mapPlan(plan: typeof lessonPlansTable.$inferSelect, activityIds: string[]) {
  return {
    id: plan.id,
    date: plan.date,
    tema: plan.tema ?? "",
    description: plan.description,
    activityIds,
    createdAt: plan.createdAt.toISOString(),
  };
}

router.get("/lesson-plans", requireAuth, async (req, res) => {
  try {
    const { month } = req.query;
    if (!month || typeof month !== "string" || !/^\d{4}-\d{2}$/.test(month)) {
      res.status(400).json({ error: "month é obrigatório no formato YYYY-MM" });
      return;
    }

    const plans = await db.select()
      .from(lessonPlansTable)
      .where(and(
        eq(lessonPlansTable.teacherId, req.teacherId!),
        like(lessonPlansTable.date, `${month}-%`)
      ))
      .orderBy(lessonPlansTable.date);

    let planActivities: { lessonPlanId: string; activityId: string }[] = [];
    if (plans.length > 0) {
      const planIds = plans.map(p => p.id);
      planActivities = await db.select({
        lessonPlanId: lessonPlanActivitiesTable.lessonPlanId,
        activityId: lessonPlanActivitiesTable.activityId,
      })
        .from(lessonPlanActivitiesTable)
        .where(inArray(lessonPlanActivitiesTable.lessonPlanId, planIds));
    }

    const result = plans.map(plan => {
      const activityIds = planActivities
        .filter(pa => pa.lessonPlanId === plan.id)
        .map(pa => pa.activityId);
      return mapPlan(plan, activityIds);
    });

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Error listing lesson plans");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.post("/lesson-plans", requireAuth, async (req, res) => {
  try {
    const { date, description, tema } = req.body;
    if (!date || typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: "date é obrigatório no formato YYYY-MM-DD" });
      return;
    }

    const desc = description ?? "";
    const [plan] = await db.insert(lessonPlansTable)
      .values({
        id: generateId(),
        teacherId: req.teacherId!,
        date,
        tema: tema ?? null,
        description: desc,
      })
      .onConflictDoUpdate({
        target: [lessonPlansTable.teacherId, lessonPlansTable.date],
        set: { description: desc, tema: tema ?? null },
      })
      .returning();

    const activityLinks = await db.select({ activityId: lessonPlanActivitiesTable.activityId })
      .from(lessonPlanActivitiesTable)
      .where(eq(lessonPlanActivitiesTable.lessonPlanId, plan.id));

    res.status(200).json(mapPlan(plan, activityLinks.map(a => a.activityId)));
  } catch (err) {
    req.log.error({ err }, "Error upserting lesson plan");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.post("/lesson-plans/:id/activities", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { activityId } = req.body;

    if (!activityId || typeof activityId !== "string") {
      res.status(400).json({ error: "activityId é obrigatório" });
      return;
    }

    const [plan] = await db.select({ id: lessonPlansTable.id })
      .from(lessonPlansTable)
      .where(and(eq(lessonPlansTable.id, id), eq(lessonPlansTable.teacherId, req.teacherId!)));
    if (!plan) {
      res.status(404).json({ error: "Plano não encontrado" });
      return;
    }

    const [activity] = await db.select({ id: activitiesTable.id })
      .from(activitiesTable)
      .where(and(eq(activitiesTable.id, activityId), eq(activitiesTable.teacherId, req.teacherId!)));
    if (!activity) {
      res.status(404).json({ error: "Atividade não encontrada" });
      return;
    }

    await db.insert(lessonPlanActivitiesTable)
      .values({ id: generateId(), lessonPlanId: id, activityId })
      .onConflictDoNothing();

    res.status(201).json({ lessonPlanId: id, activityId });
  } catch (err) {
    req.log.error({ err }, "Error linking activity to lesson plan");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.delete("/lesson-plans/:id/activities/:activityId", requireAuth, async (req, res) => {
  try {
    const { id, activityId } = req.params;

    const [plan] = await db.select({ id: lessonPlansTable.id })
      .from(lessonPlansTable)
      .where(and(eq(lessonPlansTable.id, id), eq(lessonPlansTable.teacherId, req.teacherId!)));
    if (!plan) {
      res.status(404).json({ error: "Plano não encontrado" });
      return;
    }

    await db.delete(lessonPlanActivitiesTable)
      .where(and(
        eq(lessonPlanActivitiesTable.lessonPlanId, id),
        eq(lessonPlanActivitiesTable.activityId, activityId)
      ));

    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error unlinking activity from lesson plan");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
