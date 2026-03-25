import { Router, type IRouter } from "express";
import { db, studentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

router.get("/students", requireAuth, async (req, res) => {
  try {
    const students = await db.select().from(studentsTable)
      .where(eq(studentsTable.teacherId, req.teacherId!))
      .orderBy(studentsTable.name);
    res.json(students.map(s => ({
      id: s.id,
      name: s.name,
      createdAt: s.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Error listing students");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.post("/students", requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== "string" || name.trim() === "") {
      res.status(400).json({ error: "Nome é obrigatório" });
      return;
    }
    const [student] = await db.insert(studentsTable).values({
      id: generateId(),
      teacherId: req.teacherId!,
      name: name.trim(),
    }).returning();
    res.status(201).json({
      id: student.id,
      name: student.name,
      createdAt: student.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error creating student");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.patch("/students/:id", requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== "string" || name.trim() === "") {
      res.status(400).json({ error: "Nome é obrigatório" });
      return;
    }
    const [student] = await db.update(studentsTable)
      .set({ name: name.trim() })
      .where(and(eq(studentsTable.id, req.params.id), eq(studentsTable.teacherId, req.teacherId!)))
      .returning();
    if (!student) {
      res.status(404).json({ error: "Aluno não encontrado" });
      return;
    }
    res.json({ id: student.id, name: student.name, createdAt: student.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Error updating student");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.delete("/students/:id", requireAuth, async (req, res) => {
  try {
    await db.delete(studentsTable)
      .where(and(eq(studentsTable.id, req.params.id), eq(studentsTable.teacherId, req.teacherId!)));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting student");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
