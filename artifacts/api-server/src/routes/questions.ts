import { Router, type IRouter } from "express";
import { db, questionsTable, examsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

router.get("/questions", requireAuth, async (req, res) => {
  try {
    const questions = await db
      .select()
      .from(questionsTable)
      .where(eq(questionsTable.teacherId, req.teacherId!));
    res.json(questions);
  } catch (err) {
    req.log.error({ err }, "Error listing questions");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.post("/questions", requireAuth, async (req, res) => {
  try {
    const { enunciado, alternativas, resposta_correta, descritivo, disciplina, serieTurma, tipoQuestao, tags } = req.body;

    if (!enunciado || typeof enunciado !== "string" || !enunciado.trim()) {
      res.status(400).json({ error: "Enunciado é obrigatório" });
      return;
    }

    const [question] = await db.insert(questionsTable).values({
      id: generateId(),
      teacherId: req.teacherId!,
      enunciado: enunciado.trim(),
      alternativas: alternativas ?? null,
      resposta_correta: resposta_correta ?? null,
      descritivo: descritivo ?? "",
      disciplina: disciplina ?? "",
      serieTurma: serieTurma ?? "",
      tipoQuestao: tipoQuestao ?? "multipla_escolha",
      tags: Array.isArray(tags) ? tags : [],
    }).returning();

    res.status(201).json(question);
  } catch (err) {
    req.log.error({ err }, "Error creating question");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.post("/questions/bulk", requireAuth, async (req, res) => {
  try {
    const { questions } = req.body;

    if (!Array.isArray(questions) || questions.length === 0) {
      res.status(400).json({ error: "Lista de questões é obrigatória" });
      return;
    }

    const inserted = await db.insert(questionsTable).values(
      questions.map((q: any) => ({
        id: generateId(),
        teacherId: req.teacherId!,
        enunciado: (q.enunciado ?? "").trim(),
        alternativas: q.alternativas ?? null,
        resposta_correta: q.resposta_correta ?? null,
        descritivo: q.descritivo ?? "",
        disciplina: q.disciplina ?? "",
        serieTurma: q.serieTurma ?? "",
        tipoQuestao: q.tipoQuestao ?? (q.alternativas ? "multipla_escolha" : "dissertativa"),
        tags: Array.isArray(q.tags) ? q.tags : [],
      }))
    ).returning();

    res.status(201).json(inserted);
  } catch (err) {
    req.log.error({ err }, "Error bulk creating questions");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.delete("/questions/:id", requireAuth, async (req, res) => {
  try {
    await db
      .delete(questionsTable)
      .where(
        and(
          eq(questionsTable.id, req.params.id),
          eq(questionsTable.teacherId, req.teacherId!)
        )
      );
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting question");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
