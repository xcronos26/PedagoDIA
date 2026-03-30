import { Router, type IRouter } from "express";
import { db, studentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

function generateParentToken() {
  return crypto.randomUUID();
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
    const studentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    
    if (!name || typeof name !== "string" || name.trim() === "") {
      res.status(400).json({ error: "Nome é obrigatório" });
      return;
    }
    const [student] = await db.update(studentsTable)
      .set({ name: name.trim() })
      .where(and(eq(studentsTable.id, studentId), eq(studentsTable.teacherId, req.teacherId!)))
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
    const studentId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    
    await db.delete(studentsTable)
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
    
    // Testar se os campos existem tentando uma consulta simples
    try {
      await db.select().from(studentsTable).limit(1);
    } catch (err: any) {
      // Se der erro de coluna, informar claramente
      if (err.message?.includes('column') || err.message?.includes('does not exist') || err.code === '42703') {
        return res.status(500).json({ 
          error: "Banco de dados não atualizado",
          details: "Os campos parent_access_token e parent_token_expires não existem na tabela students. Execute a migration no banco.",
          sql: "ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_access_token TEXT; ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_token_expires TIMESTAMP;"
        });
      }
    }
    
    const token = generateParentToken();
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 6); // 6 meses de validade

    const [student] = await db.update(studentsTable)
      .set({ 
        parentAccessToken: token,
        parentTokenExpires: expiresAt
      })
      .where(and(eq(studentsTable.id, studentId), eq(studentsTable.teacherId, req.teacherId!)))
      .returning();

    if (!student) {
      res.status(404).json({ error: "Aluno não encontrado" });
      return;
    }

    res.json({ 
      token: student.parentAccessToken,
      expiresAt: student.parentTokenExpires?.toISOString(),
      url: `${req.protocol}://${req.get('host')}/relatorio/${student.parentAccessToken}`
    });
  } catch (err: any) {
    req.log.error({ err }, "Error generating parent token");
    
    // Verificar se é erro de coluna não existente
    if (err.message?.includes('column') || err.message?.includes('does not exist') || err.code === '42703') {
      return res.status(500).json({ 
        error: "Banco de dados não atualizado",
        details: "Os campos parent_access_token e parent_token_expires não existem na tabela students. Execute a migration no banco.",
        sql: "ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_access_token TEXT; ALTER TABLE students ADD COLUMN IF NOT EXISTS parent_token_expires TIMESTAMP;"
      });
    }
    
    res.status(500).json({ error: "Erro interno do servidor", details: err.message });
  }
});

export default router;
