import { Router, type IRouter } from "express";
import { db, examsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

router.get("/exams", requireAuth, async (req, res) => {
  try {
    const exams = await db
      .select()
      .from(examsTable)
      .where(eq(examsTable.teacherId, req.teacherId!));
    res.json(exams);
  } catch (err) {
    req.log.error({ err }, "Error listing exams");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.get("/exams/:id", requireAuth, async (req, res) => {
  try {
    const [exam] = await db
      .select()
      .from(examsTable)
      .where(
        and(
          eq(examsTable.id, req.params.id),
          eq(examsTable.teacherId, req.teacherId!)
        )
      );
    if (!exam) {
      res.status(404).json({ error: "Prova não encontrada" });
      return;
    }
    res.json(exam);
  } catch (err) {
    req.log.error({ err }, "Error fetching exam");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.post("/exams", requireAuth, async (req, res) => {
  try {
    const {
      titulo,
      disciplina,
      serieTurma,
      tema,
      numeroQuestoes,
      valorTotal,
      tipoQuestao,
      origem,
      atividadesBaseIds,
      questoes,
      gabarito,
      status,
      nomeEscola,
    } = req.body;

    if (!titulo || !disciplina || !serieTurma || !tema || !numeroQuestoes || !valorTotal || !tipoQuestao || !origem || !questoes) {
      res.status(400).json({ error: "Campos obrigatórios faltando" });
      return;
    }

    const nq = Number(numeroQuestoes);
    const vt = Number(valorTotal);
    const valorPorQuestao = nq > 0 ? (vt / nq).toFixed(4) : "0";

    const [exam] = await db
      .insert(examsTable)
      .values({
        id: generateId(),
        teacherId: req.teacherId!,
        titulo,
        disciplina,
        serieTurma,
        tema,
        numeroQuestoes: String(numeroQuestoes),
        valorTotal: String(valorTotal),
        valorPorQuestao,
        tipoQuestao,
        origem,
        atividadesBaseIds: atividadesBaseIds ?? [],
        questoes,
        gabarito: gabarito ?? {},
        status: status ?? "rascunho",
        nomeEscola: nomeEscola ?? null,
      })
      .returning();

    res.status(201).json(exam);
  } catch (err) {
    req.log.error({ err }, "Error creating exam");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.put("/exams/:id", requireAuth, async (req, res) => {
  try {
    const {
      titulo,
      disciplina,
      serieTurma,
      tema,
      numeroQuestoes,
      valorTotal,
      tipoQuestao,
      origem,
      atividadesBaseIds,
      questoes,
      gabarito,
      status,
      nomeEscola,
    } = req.body;

    const nq = Number(numeroQuestoes);
    const vt = Number(valorTotal);
    const valorPorQuestao = nq > 0 ? (vt / nq).toFixed(4) : "0";

    const [exam] = await db
      .update(examsTable)
      .set({
        ...(titulo !== undefined && { titulo }),
        ...(disciplina !== undefined && { disciplina }),
        ...(serieTurma !== undefined && { serieTurma }),
        ...(tema !== undefined && { tema }),
        ...(numeroQuestoes !== undefined && { numeroQuestoes: String(numeroQuestoes) }),
        ...(valorTotal !== undefined && { valorTotal: String(valorTotal), valorPorQuestao }),
        ...(tipoQuestao !== undefined && { tipoQuestao }),
        ...(origem !== undefined && { origem }),
        ...(atividadesBaseIds !== undefined && { atividadesBaseIds }),
        ...(questoes !== undefined && { questoes }),
        ...(gabarito !== undefined && { gabarito }),
        ...(status !== undefined && { status }),
        ...(nomeEscola !== undefined && { nomeEscola }),
        atualizadaEm: new Date(),
      })
      .where(
        and(
          eq(examsTable.id, req.params.id),
          eq(examsTable.teacherId, req.teacherId!)
        )
      )
      .returning();

    if (!exam) {
      res.status(404).json({ error: "Prova não encontrada" });
      return;
    }

    res.json(exam);
  } catch (err) {
    req.log.error({ err }, "Error updating exam");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.delete("/exams/:id", requireAuth, async (req, res) => {
  try {
    await db
      .delete(examsTable)
      .where(
        and(
          eq(examsTable.id, req.params.id),
          eq(examsTable.teacherId, req.teacherId!)
        )
      );
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting exam");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

export default router;
