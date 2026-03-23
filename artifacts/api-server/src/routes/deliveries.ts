import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { deliveriesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

router.get("/deliveries", async (req, res) => {
  try {
    const { activityId, studentId } = req.query;
    let query = db.select().from(deliveriesTable);
    let records;
    if (activityId && typeof activityId === "string") {
      records = await db.select().from(deliveriesTable).where(eq(deliveriesTable.activityId, activityId));
    } else if (studentId && typeof studentId === "string") {
      records = await db.select().from(deliveriesTable).where(eq(deliveriesTable.studentId, studentId));
    } else {
      records = await db.select().from(deliveriesTable);
    }
    res.json(records.map(r => ({
      id: r.id,
      activityId: r.activityId,
      studentId: r.studentId,
      delivered: r.delivered,
      createdAt: r.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Error listing deliveries");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/deliveries", async (req, res) => {
  try {
    const { activityId, studentId, delivered } = req.body;
    if (!activityId || !studentId || delivered === undefined) {
      res.status(400).json({ error: "activityId, studentId, and delivered are required" });
      return;
    }
    const existing = await db.select().from(deliveriesTable)
      .where(and(eq(deliveriesTable.activityId, activityId), eq(deliveriesTable.studentId, studentId)));

    let record;
    if (existing.length > 0) {
      [record] = await db.update(deliveriesTable)
        .set({ delivered })
        .where(and(eq(deliveriesTable.activityId, activityId), eq(deliveriesTable.studentId, studentId)))
        .returning();
    } else {
      const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
      [record] = await db.insert(deliveriesTable).values({
        id,
        activityId,
        studentId,
        delivered,
      }).returning();
    }
    res.json({
      id: record.id,
      activityId: record.activityId,
      studentId: record.studentId,
      delivered: record.delivered,
      createdAt: record.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error upserting delivery");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
