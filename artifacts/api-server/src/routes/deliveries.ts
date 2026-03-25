import { Router, type IRouter } from "express";
import { db, deliveriesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

function mapDelivery(r: typeof deliveriesTable.$inferSelect) {
  return {
    id: r.id,
    activityId: r.activityId,
    studentId: r.studentId,
    delivered: r.delivered,
    seen: r.seen,
    deliveredAt: r.deliveredAt?.toISOString() ?? undefined,
    seenAt: r.seenAt?.toISOString() ?? undefined,
    createdAt: r.createdAt.toISOString(),
  };
}

router.get("/deliveries", requireAuth, async (req, res) => {
  try {
    const teacherId = req.teacherId!;
    const { activityId, studentId } = req.query;
    let records;
    if (activityId && typeof activityId === "string") {
      records = await db.select().from(deliveriesTable)
        .where(and(eq(deliveriesTable.teacherId, teacherId), eq(deliveriesTable.activityId, activityId)));
    } else if (studentId && typeof studentId === "string") {
      records = await db.select().from(deliveriesTable)
        .where(and(eq(deliveriesTable.teacherId, teacherId), eq(deliveriesTable.studentId, studentId)));
    } else {
      records = await db.select().from(deliveriesTable)
        .where(eq(deliveriesTable.teacherId, teacherId));
    }
    res.json(records.map(mapDelivery));
  } catch (err) {
    req.log.error({ err }, "Error listing deliveries");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.post("/deliveries", requireAuth, async (req, res) => {
  try {
    const teacherId = req.teacherId!;
    const { activityId, studentId, delivered, seen } = req.body;
    if (!activityId || !studentId) {
      res.status(400).json({ error: "activityId e studentId são obrigatórios" });
      return;
    }
    const existing = await db.select().from(deliveriesTable)
      .where(and(
        eq(deliveriesTable.teacherId, teacherId),
        eq(deliveriesTable.activityId, activityId),
        eq(deliveriesTable.studentId, studentId),
      ));

    const now = new Date();
    let record;
    if (existing.length > 0) {
      const prev = existing[0];
      const updates: Partial<typeof deliveriesTable.$inferInsert> = {};
      if (delivered !== undefined) {
        updates.delivered = delivered;
        updates.deliveredAt = delivered ? (prev.deliveredAt ?? now) : null;
      }
      if (seen !== undefined) {
        updates.seen = seen;
        updates.seenAt = seen ? (prev.seenAt ?? now) : null;
      }
      [record] = await db.update(deliveriesTable)
        .set(updates)
        .where(and(
          eq(deliveriesTable.teacherId, teacherId),
          eq(deliveriesTable.activityId, activityId),
          eq(deliveriesTable.studentId, studentId),
        ))
        .returning();
    } else {
      [record] = await db.insert(deliveriesTable).values({
        id: generateId(),
        teacherId,
        activityId,
        studentId,
        delivered: delivered ?? false,
        seen: seen ?? false,
        deliveredAt: delivered ? now : null,
        seenAt: seen ? now : null,
      }).returning();
    }
    res.json(mapDelivery(record));
  } catch (err) {
    req.log.error({ err }, "Error upserting delivery");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
