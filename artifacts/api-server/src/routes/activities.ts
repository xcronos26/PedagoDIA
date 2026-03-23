import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { activitiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/activities", async (req, res) => {
  try {
    const activities = await db.select().from(activitiesTable).orderBy(activitiesTable.date);
    res.json(activities.map(a => ({
      id: a.id,
      subject: a.subject,
      type: a.type,
      link: a.link,
      date: a.date,
      description: a.description,
      createdAt: a.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Error listing activities");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/activities", async (req, res) => {
  try {
    const { subject, type, link, date, description } = req.body;
    if (!subject || !type || !date || !description) {
      res.status(400).json({ error: "subject, type, date, and description are required" });
      return;
    }
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    const [activity] = await db.insert(activitiesTable).values({
      id,
      subject,
      type,
      link: link || null,
      date,
      description,
    }).returning();
    res.status(201).json({
      id: activity.id,
      subject: activity.subject,
      type: activity.type,
      link: activity.link,
      date: activity.date,
      description: activity.description,
      createdAt: activity.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error creating activity");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/activities/:id", async (req, res) => {
  try {
    await db.delete(activitiesTable).where(eq(activitiesTable.id, req.params.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting activity");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
