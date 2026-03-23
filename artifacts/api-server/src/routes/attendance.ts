import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { attendanceTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

router.get("/attendance", async (req, res) => {
  try {
    const { date } = req.query;
    let records;
    if (date && typeof date === "string") {
      records = await db.select().from(attendanceTable).where(eq(attendanceTable.date, date));
    } else {
      records = await db.select().from(attendanceTable);
    }
    res.json(records.map(r => ({
      id: r.id,
      studentId: r.studentId,
      date: r.date,
      present: r.present,
      createdAt: r.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Error listing attendance");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/attendance", async (req, res) => {
  try {
    const { studentId, date, present } = req.body;
    if (!studentId || !date || present === undefined) {
      res.status(400).json({ error: "studentId, date, and present are required" });
      return;
    }
    const existing = await db.select().from(attendanceTable)
      .where(and(eq(attendanceTable.studentId, studentId), eq(attendanceTable.date, date)));

    let record;
    if (existing.length > 0) {
      [record] = await db.update(attendanceTable)
        .set({ present })
        .where(and(eq(attendanceTable.studentId, studentId), eq(attendanceTable.date, date)))
        .returning();
    } else {
      const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
      [record] = await db.insert(attendanceTable).values({
        id,
        studentId,
        date,
        present,
      }).returning();
    }
    res.json({
      id: record.id,
      studentId: record.studentId,
      date: record.date,
      present: record.present,
      createdAt: record.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error upserting attendance");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
