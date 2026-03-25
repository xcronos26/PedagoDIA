import { Router, type IRouter } from "express";
import { db, activitiesTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

function mapActivity(a: typeof activitiesTable.$inferSelect) {
  return {
    id: a.id,
    subject: a.subject,
    type: a.type,
    link: a.link ?? undefined,
    date: a.date,
    description: a.description,
    createdAt: a.createdAt.toISOString(),
  };
}

router.get("/activities", requireAuth, async (req, res) => {
  try {
    const activities = await db.select().from(activitiesTable)
      .where(eq(activitiesTable.teacherId, req.teacherId!))
      .orderBy(desc(activitiesTable.date));
    res.json(activities.map(mapActivity));
  } catch (err) {
    req.log.error({ err }, "Error listing activities");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.post("/activities", requireAuth, async (req, res) => {
  try {
    const { subject, type, link, date, description } = req.body;
    if (!subject || !type || !date || !description) {
      res.status(400).json({ error: "subject, type, date e description são obrigatórios" });
      return;
    }
    const [activity] = await db.insert(activitiesTable).values({
      id: generateId(),
      teacherId: req.teacherId!,
      subject,
      type,
      link: link || null,
      date,
      description,
    }).returning();
    res.status(201).json(mapActivity(activity));
  } catch (err) {
    req.log.error({ err }, "Error creating activity");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.put("/activities/:id", requireAuth, async (req, res) => {
  try {
    const { subject, type, link, date, description } = req.body;
    if (!subject || !type || !date || !description) {
      res.status(400).json({ error: "subject, type, date e description são obrigatórios" });
      return;
    }
    const [activity] = await db.update(activitiesTable)
      .set({ subject, type, link: link || null, date, description })
      .where(and(eq(activitiesTable.id, req.params.id), eq(activitiesTable.teacherId, req.teacherId!)))
      .returning();
    if (!activity) {
      res.status(404).json({ error: "Atividade não encontrada" });
      return;
    }
    res.json(mapActivity(activity));
  } catch (err) {
    req.log.error({ err }, "Error updating activity");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.delete("/activities/:id", requireAuth, async (req, res) => {
  try {
    await db.delete(activitiesTable)
      .where(and(eq(activitiesTable.id, req.params.id), eq(activitiesTable.teacherId, req.teacherId!)));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting activity");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
