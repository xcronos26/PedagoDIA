import { Router, type IRouter } from "express";
import { db, questionsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import type { TipoQuestaoSimples, AlternativasQuestao } from "@workspace/db";

const router: IRouter = Router();

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

interface QuestionInput {
  enunciado: string;
  alternativas?: AlternativasQuestao | null;
  resposta_correta?: string | null;
  descritivo?: string;
  disciplina?: string;
  serieTurma?: string;
  tipoQuestao?: TipoQuestaoSimples;
  tags?: string[];
}

function validateEnunciado(enunciado: unknown): enunciado is string {
  return typeof enunciado === "string" && enunciado.trim().length > 0;
}

function buildValues(q: QuestionInput, teacherId: string) {
  return {
    id: generateId(),
    teacherId,
    enunciado: q.enunciado.trim(),
    alternativas: q.alternativas ?? null,
    resposta_correta: q.resposta_correta ?? null,
    descritivo: q.descritivo ?? "",
    disciplina: q.disciplina ?? "",
    serieTurma: q.serieTurma ?? "",
    tipoQuestao: (q.tipoQuestao ?? (q.alternativas ? "multipla_escolha" : "dissertativa")) as TipoQuestaoSimples,
    tags: Array.isArray(q.tags) ? q.tags : [],
  };
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

router.get("/questions/:id", requireAuth, async (req, res) => {
  try {
    const [question] = await db
      .select()
      .from(questionsTable)
      .where(and(eq(questionsTable.id, req.params.id), eq(questionsTable.teacherId, req.teacherId!)));
    if (!question) {
      res.status(404).json({ error: "Questão não encontrada" });
      return;
    }
    res.json(question);
  } catch (err) {
    req.log.error({ err }, "Error fetching question");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.post("/questions", requireAuth, async (req, res) => {
  try {
    const body = req.body as QuestionInput;

    if (!validateEnunciado(body.enunciado)) {
      res.status(400).json({ error: "Enunciado é obrigatório" });
      return;
    }

    const [question] = await db
      .insert(questionsTable)
      .values(buildValues(body, req.teacherId!))
      .returning();

    res.status(201).json(question);
  } catch (err) {
    req.log.error({ err }, "Error creating question");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.post("/questions/bulk", requireAuth, async (req, res) => {
  try {
    const { questions } = req.body as { questions: QuestionInput[] };

    if (!Array.isArray(questions) || questions.length === 0) {
      res.status(400).json({ error: "Lista de questões é obrigatória" });
      return;
    }

    const valid = questions.filter((q) => validateEnunciado(q.enunciado));
    if (valid.length === 0) {
      res.status(400).json({ error: "Nenhuma questão com enunciado válido" });
      return;
    }

    const inserted = await db
      .insert(questionsTable)
      .values(valid.map((q) => buildValues(q, req.teacherId!)))
      .returning();

    res.status(201).json(inserted);
  } catch (err) {
    req.log.error({ err }, "Error bulk creating questions");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.put("/questions/:id", requireAuth, async (req, res) => {
  try {
    const body = req.body as Partial<QuestionInput>;

    if (body.enunciado !== undefined && !validateEnunciado(body.enunciado)) {
      res.status(400).json({ error: "Enunciado não pode ser vazio" });
      return;
    }

    const [updated] = await db
      .update(questionsTable)
      .set({
        ...(body.enunciado !== undefined && { enunciado: body.enunciado.trim() }),
        ...(body.alternativas !== undefined && { alternativas: body.alternativas }),
        ...(body.resposta_correta !== undefined && { resposta_correta: body.resposta_correta }),
        ...(body.descritivo !== undefined && { descritivo: body.descritivo }),
        ...(body.disciplina !== undefined && { disciplina: body.disciplina }),
        ...(body.serieTurma !== undefined && { serieTurma: body.serieTurma }),
        ...(body.tipoQuestao !== undefined && { tipoQuestao: body.tipoQuestao }),
        ...(body.tags !== undefined && { tags: Array.isArray(body.tags) ? body.tags : [] }),
      })
      .where(and(eq(questionsTable.id, req.params.id), eq(questionsTable.teacherId, req.teacherId!)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Questão não encontrada" });
      return;
    }

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Error updating question");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.delete("/questions/:id", requireAuth, async (req, res) => {
  try {
    await db
      .delete(questionsTable)
      .where(and(eq(questionsTable.id, req.params.id), eq(questionsTable.teacherId, req.teacherId!)));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting question");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
