import { Router, type IRouter } from "express";
import { db, classesTable, studentsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

router.get("/classes", requireAuth, async (req, res) => {
  try {
    const classes = await db
      .select({
        id: classesTable.id,
        name: classesTable.name,
        createdAt: classesTable.createdAt,
        studentCount: sql<number>`cast(count(${studentsTable.id}) as int)`,
      })
      .from(classesTable)
      .leftJoin(studentsTable, eq(studentsTable.classId, classesTable.id))
      .where(eq(classesTable.teacherId, req.teacherId!))
      .groupBy(classesTable.id, classesTable.name, classesTable.createdAt)
      .orderBy(classesTable.name);

    res.json(
      classes.map((c) => ({
        id: c.id,
        name: c.name,
        studentCount: c.studentCount ?? 0,
        createdAt: c.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Error listing classes");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.post("/classes", requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== "string" || name.trim() === "") {
      res.status(400).json({ error: "Nome da turma é obrigatório" });
      return;
    }
    const [created] = await db
      .insert(classesTable)
      .values({
        id: generateId(),
        teacherId: req.teacherId!,
        name: name.trim(),
      })
      .returning();
    res.status(201).json({
      id: created.id,
      name: created.name,
      studentCount: 0,
      createdAt: created.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error creating class");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.put("/classes/:id", requireAuth, async (req, res) => {
  try {
    const classId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { name } = req.body;
    if (!name || typeof name !== "string" || name.trim() === "") {
      res.status(400).json({ error: "Nome da turma é obrigatório" });
      return;
    }
    const [updated] = await db
      .update(classesTable)
      .set({ name: name.trim() })
      .where(and(eq(classesTable.id, classId), eq(classesTable.teacherId, req.teacherId!)))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Turma não encontrada" });
      return;
    }
    res.json({
      id: updated.id,
      name: updated.name,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Error updating class");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.delete("/classes/:id", requireAuth, async (req, res) => {
  try {
    const classId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const [cls] = await db
      .select()
      .from(classesTable)
      .where(and(eq(classesTable.id, classId), eq(classesTable.teacherId, req.teacherId!)));

    if (!cls) {
      res.status(404).json({ error: "Turma não encontrada" });
      return;
    }

    await db
      .update(studentsTable)
      .set({ classId: null })
      .where(and(eq(studentsTable.classId, classId), eq(studentsTable.teacherId, req.teacherId!)));

    await db
      .delete(classesTable)
      .where(and(eq(classesTable.id, classId), eq(classesTable.teacherId, req.teacherId!)));

    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting class");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
