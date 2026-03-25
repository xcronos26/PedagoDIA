import { Router, type IRouter } from "express";
import { db, attendanceTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

function mapRecord(r: typeof attendanceTable.$inferSelect) {
  return {
    id: r.id,
    studentId: r.studentId,
    date: r.date,
    present: r.present,
    justified: r.justified ?? false,
    justification: r.justification ?? undefined,
    createdAt: r.createdAt.toISOString(),
  };
}

router.get("/attendance", requireAuth, async (req, res) => {
  try {
    const teacherId = req.teacherId!;
    const { date } = req.query;
    let records;
    if (date && typeof date === "string") {
      records = await db.select().from(attendanceTable)
        .where(and(eq(attendanceTable.teacherId, teacherId), eq(attendanceTable.date, date)));
    } else {
      records = await db.select().from(attendanceTable)
        .where(eq(attendanceTable.teacherId, teacherId));
    }
    res.json(records.map(mapRecord));
  } catch (err) {
    req.log.error({ err }, "Error listing attendance");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.post("/attendance", requireAuth, async (req, res) => {
  try {
    const teacherId = req.teacherId!;
    const { studentId, date, present } = req.body;
    if (!studentId || !date || present === undefined) {
      res.status(400).json({ error: "studentId, date e present são obrigatórios" });
      return;
    }
    const existing = await db.select().from(attendanceTable)
      .where(and(
        eq(attendanceTable.teacherId, teacherId),
        eq(attendanceTable.studentId, studentId),
        eq(attendanceTable.date, date),
      ));

    let record;
    if (existing.length > 0) {
      [record] = await db.update(attendanceTable)
        .set({ present, justified: false, justification: null })
        .where(and(
          eq(attendanceTable.teacherId, teacherId),
          eq(attendanceTable.studentId, studentId),
          eq(attendanceTable.date, date),
        ))
        .returning();
    } else {
      [record] = await db.insert(attendanceTable).values({
        id: generateId(),
        teacherId,
        studentId,
        date,
        present,
        justified: false,
        justification: null,
      }).returning();
    }
    res.json(mapRecord(record));
  } catch (err) {
    req.log.error({ err }, "Error upserting attendance");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.post("/attendance/justify", requireAuth, async (req, res) => {
  try {
    const teacherId = req.teacherId!;
    const { studentId, date, justification } = req.body;
    if (!studentId || !date || !justification) {
      res.status(400).json({ error: "studentId, date e justification são obrigatórios" });
      return;
    }
    const existing = await db.select().from(attendanceTable)
      .where(and(
        eq(attendanceTable.teacherId, teacherId),
        eq(attendanceTable.studentId, studentId),
        eq(attendanceTable.date, date),
      ));

    let record;
    if (existing.length > 0) {
      [record] = await db.update(attendanceTable)
        .set({ present: false, justified: true, justification })
        .where(and(
          eq(attendanceTable.teacherId, teacherId),
          eq(attendanceTable.studentId, studentId),
          eq(attendanceTable.date, date),
        ))
        .returning();
    } else {
      [record] = await db.insert(attendanceTable).values({
        id: generateId(),
        teacherId,
        studentId,
        date,
        present: false,
        justified: true,
        justification,
      }).returning();
    }
    res.json(mapRecord(record));
  } catch (err) {
    req.log.error({ err }, "Error justifying absence");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
