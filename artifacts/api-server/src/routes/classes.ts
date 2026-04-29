import { Router, type IRouter } from "express";
import { db, classesTable, studentsTable } from "@workspace/db";
import { eq, and, sql, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

const CLASS_COLORS = [
  '#4F7BF7',
  '#F7634F',
  '#4FBF87',
  '#F7B74F',
  '#9B4FF7',
  '#F74FAA',
  '#4FBFBF',
  '#F78C4F',
  '#7C4FF7',
  '#4FAF5A',
];

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

router.get("/classes", requireAuth, async (req, res) => {
  try {
    const classes = await db
      .select({
        id: classesTable.id,
        name: classesTable.name,
        color: classesTable.color,
        createdAt: classesTable.createdAt,
        studentCount: sql<number>`cast(count(${studentsTable.id}) as int)`,
      })
      .from(classesTable)
      .leftJoin(studentsTable, eq(studentsTable.classId, classesTable.id))
      .where(eq(classesTable.teacherId, req.teacherId!))
      .groupBy(classesTable.id, classesTable.name, classesTable.color, classesTable.createdAt)
      .orderBy(classesTable.name);

    const uncolored = classes.filter((c) => !c.color);
    if (uncolored.length > 0) {
      const usedColors = new Set(classes.filter((c) => c.color).map((c) => c.color as string));
      let paletteIndex = 0;
      const updates = uncolored.map((c) => {
        while (usedColors.has(CLASS_COLORS[paletteIndex % CLASS_COLORS.length]) && paletteIndex < CLASS_COLORS.length) {
          paletteIndex++;
        }
        const color = CLASS_COLORS[paletteIndex % CLASS_COLORS.length];
        usedColors.add(color);
        paletteIndex++;
        c.color = color;
        return db
          .update(classesTable)
          .set({ color })
          .where(and(eq(classesTable.id, c.id), eq(classesTable.teacherId, req.teacherId!)));
      });
      await Promise.all(updates);
    }

    res.json(
      classes.map((c) => ({
        id: c.id,
        name: c.name,
        color: c.color!,
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

    const [{ total }] = await db
      .select({ total: count() })
      .from(classesTable)
      .where(eq(classesTable.teacherId, req.teacherId!));

    const color = CLASS_COLORS[Number(total) % CLASS_COLORS.length];

    const [created] = await db
      .insert(classesTable)
      .values({
        id: generateId(),
        teacherId: req.teacherId!,
        name: name.trim(),
        color,
      })
      .returning();
    res.status(201).json({
      id: created.id,
      name: created.name,
      color: created.color ?? color,
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
      color: updated.color ?? CLASS_COLORS[0],
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
