import { Router, type IRouter } from "express";
import { db, studentReportsTable, studentsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

router.get("/student-reports", requireAuth, async (req, res) => {
  try {
    const { studentId } = req.query;
    if (!studentId || typeof studentId !== "string") {
      res.status(400).json({ error: "studentId é obrigatório" });
      return;
    }
    const reports = await db.select()
      .from(studentReportsTable)
      .where(and(
        eq(studentReportsTable.teacherId, req.teacherId!),
        eq(studentReportsTable.studentId, studentId)
      ))
      .orderBy(desc(studentReportsTable.date));
    res.json(reports.map(r => ({
      id: r.id,
      studentId: r.studentId,
      date: r.date,
      content: r.content,
      createdAt: r.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Error listing student reports");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.post("/student-reports", requireAuth, async (req, res) => {
  try {
    const { studentId, date, content } = req.body;
    if (!studentId || typeof studentId !== "string") {
      res.status(400).json({ error: "studentId é obrigatório" });
      return;
    }
    if (!date || typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: "date é obrigatório no formato YYYY-MM-DD" });
      return;
    }
    if (!content || typeof content !== "string" || content.trim() === "") {
      res.status(400).json({ error: "content é obrigatório" });
      return;
    }
    const [student] = await db.select({ id: studentsTable.id })
      .from(studentsTable)
      .where(and(eq(studentsTable.id, studentId), eq(studentsTable.teacherId, req.teacherId!)));
    if (!student) {
      res.status(403).json({ error: "Aluno não encontrado ou não pertence ao professor" });
      return;
    }
    const [report] = await db.insert(studentReportsTable).values({
      id: generateId(),
      teacherId: req.teacherId!,
      studentId,
      date,
      content: content.trim(),
    }).returning();
    res.status(201).json({
      id: report.id,
      studentId: report.studentId,
      date: report.date,
      content: report.content,
      createdAt: report.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error creating student report");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
