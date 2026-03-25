import { Router, type IRouter } from "express";
import { db, subjectsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

const DEFAULT_SUBJECTS = ["Matemática", "Português", "Ciências", "História", "Geografia", "Arte", "Educação Física", "Inglês"];

router.get("/subjects", requireAuth, async (req, res) => {
  try {
    const teacherId = req.teacherId!;
    let subjects = await db.select().from(subjectsTable)
      .where(eq(subjectsTable.teacherId, teacherId))
      .orderBy(subjectsTable.name);

    if (subjects.length === 0) {
      const defaults = await Promise.all(
        DEFAULT_SUBJECTS.map(name =>
          db.insert(subjectsTable).values({ id: generateId(), teacherId, name }).returning()
        )
      );
      subjects = defaults.flat();
    }

    res.json(subjects.map(s => ({ id: s.id, name: s.name, createdAt: s.createdAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "Error listing subjects");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.post("/subjects", requireAuth, async (req, res) => {
  try {
    const teacherId = req.teacherId!;
    const { name } = req.body;
    if (!name || typeof name !== "string" || name.trim() === "") {
      res.status(400).json({ error: "Nome da matéria é obrigatório" });
      return;
    }
    const trimmed = name.trim();
    const existing = await db.select().from(subjectsTable)
      .where(and(eq(subjectsTable.teacherId, teacherId), eq(subjectsTable.name, trimmed)));
    if (existing.length > 0) {
      res.status(409).json({ error: "Matéria já existe" });
      return;
    }
    const [subject] = await db.insert(subjectsTable).values({
      id: generateId(),
      teacherId,
      name: trimmed,
    }).returning();
    res.status(201).json({ id: subject.id, name: subject.name, createdAt: subject.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Error creating subject");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.delete("/subjects/:id", requireAuth, async (req, res) => {
  try {
    const teacherId = req.teacherId!;
    await db.delete(subjectsTable)
      .where(and(eq(subjectsTable.id, req.params.id), eq(subjectsTable.teacherId, teacherId)));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting subject");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
