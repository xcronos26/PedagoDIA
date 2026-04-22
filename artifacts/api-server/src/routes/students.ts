import { Router, type IRouter } from "express";
import { db, studentsTable, classesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

function generateParentToken() {
  return crypto.randomUUID();
}

function formatStudent(s: typeof studentsTable.$inferSelect) {
  return {
    id: s.id,
    name: s.name,
    classId: s.classId ?? null,
    createdAt: s.createdAt.toISOString(),
  };
}

router.get("/students", requireAuth, async (req, res) => {
  try {
    const classId = req.query.classId as string | undefined;

    const conditions = [eq(studentsTable.teacherId, req.teacherId!)];
    if (classId) {
      conditions.push(eq(studentsTable.classId, classId));
    }

    const students = await db
      .select()
      .from(studentsTable)
      .where(and(...conditions))
      .orderBy(studentsTable.name);

    res.json(students.map(formatStudent));
  } catch (err) {
    req.log.error({ err }, "Error listing students");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.post("/students", requireAuth, async (req, res) => {
  try {
    const { name, classId } = req.body;
    if (!name || typeof name !== "string" || name.trim() === "") {
      res.status(400).json({ error: "Nome é obrigatório" });
      return;
    }

    const resolvedClassId: string | null =
      classId !== undefined && classId !== null ? String(classId).trim() || null : null;

    if (resolvedClassId) {
      const [cls] = await db
        .select()
        .from(classesTable)
        .where(and(eq(classesTable.id, resolvedClassId), eq(classesTable.teacherId, req.teacherId!)));
      if (!cls) {
        res.status(400).json({ error: "Turma não encontrada" });
        return;
      }
    }

    const [student] = await db
      .insert(studentsTable)
      .values({
        id: generateId(),
        teacherId: req.teacherId!,
        name: name.trim(),
        classId: resolvedClassId,
      })
      .returning();
    res.status(201).json(formatStudent(student));
  } catch (err) {
    req.log.error({ err }, "Error creating student");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.patch("/students/:id", requireAuth, async (req, res) => {
  try {
    const studentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { name, classId } = req.body;

    if (name !== undefined && (typeof name !== "string" || name.trim() === "")) {
      res.status(400).json({ error: "Nome inválido" });
      return;
    }

    if (classId !== undefined && classId !== null) {
      const [cls] = await db
        .select()
        .from(classesTable)
        .where(and(eq(classesTable.id, classId), eq(classesTable.teacherId, req.teacherId!)));
      if (!cls) {
        res.status(400).json({ error: "Turma não encontrada" });
        return;
      }
    }

    const updates: Partial<typeof studentsTable.$inferInsert> = {};
    if (name !== undefined) updates.name = name.trim();
    if (classId !== undefined) updates.classId = classId ?? null;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "Nenhum campo para atualizar" });
      return;
    }

    const [student] = await db
      .update(studentsTable)
      .set(updates)
      .where(and(eq(studentsTable.id, studentId), eq(studentsTable.teacherId, req.teacherId!)))
      .returning();

    if (!student) {
      res.status(404).json({ error: "Aluno não encontrado" });
      return;
    }
    res.json(formatStudent(student));
  } catch (err) {
    req.log.error({ err }, "Error updating student");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.delete("/students/:id", requireAuth, async (req, res) => {
  try {
    const studentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    await db
      .delete(studentsTable)
      .where(and(eq(studentsTable.id, studentId), eq(studentsTable.teacherId, req.teacherId!)));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting student");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.post("/students/:id/generate-parent-token", requireAuth, async (req, res) => {
  try {
    const studentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const [existing] = await db
      .select()
      .from(studentsTable)
      .where(and(eq(studentsTable.id, studentId), eq(studentsTable.teacherId, req.teacherId!)));

    if (!existing) {
      res.status(404).json({ error: "Aluno não encontrado" });
      return;
    }

    const now = new Date();
    const hasValidToken =
      existing.parentAccessToken &&
      existing.parentTokenExpires &&
      existing.parentTokenExpires > now;

    let finalToken: string;
    let finalExpires: Date;

    if (hasValidToken) {
      finalToken = existing.parentAccessToken!;
      finalExpires = existing.parentTokenExpires!;
    } else {
      finalToken = generateParentToken();
      finalExpires = new Date();
      finalExpires.setMonth(finalExpires.getMonth() + 6);

      await db
        .update(studentsTable)
        .set({ parentAccessToken: finalToken, parentTokenExpires: finalExpires })
        .where(eq(studentsTable.id, studentId));
    }

    const host = req.get("x-forwarded-host") || req.get("host") || "localhost";
    const proto = req.get("x-forwarded-proto") || req.protocol || "https";

    res.json({
      token: finalToken,
      expiresAt: finalExpires.toISOString(),
      url: `${proto}://${host}/web/relatorio/${finalToken}`,
    });
  } catch (err: any) {
    req.log.error({ err }, "Error generating parent token");
    res.status(500).json({ error: "Erro interno do servidor", details: err.message });
  }
});

export default router;
