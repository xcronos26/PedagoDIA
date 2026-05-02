import { Router, type IRouter } from "express";
import { db, relatoriosBimestraisTable, studentsTable, attendanceTable, activitiesTable, examsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { generateContent } from "../lib/ai-provider";

const router: IRouter = Router();

function generateId() {
  return Date.now().toString() + Math.random().toString(36).substring(2, 9);
}

function getBimestreMonths(bimestre: number, ano: number): string[] {
  const ranges: Record<number, [number, number]> = {
    1: [2, 4], 2: [5, 7], 3: [8, 10], 4: [11, 12],
  };
  const [start, end] = ranges[bimestre] ?? [1, 12];
  const months: string[] = [];
  for (let m = start; m <= end; m++) {
    months.push(`${ano}-${String(m).padStart(2, "0")}`);
  }
  return months;
}

router.get("/relatorios-bimestrais", requireAuth, async (req, res) => {
  try {
    const { bimestre, anoLetivo } = req.query;
    let query = db.select().from(relatoriosBimestraisTable)
      .where(eq(relatoriosBimestraisTable.teacherId, req.teacherId!))
      .$dynamic();
    const results = await db.select()
      .from(relatoriosBimestraisTable)
      .where(
        and(
          eq(relatoriosBimestraisTable.teacherId, req.teacherId!),
          ...(bimestre ? [eq(relatoriosBimestraisTable.bimestre, Number(bimestre))] : []),
          ...(anoLetivo ? [eq(relatoriosBimestraisTable.anoLetivo, Number(anoLetivo))] : []),
        )
      )
      .orderBy(desc(relatoriosBimestraisTable.updatedAt));
    res.json(results);
  } catch (err) {
    req.log.error({ err }, "Error listing relatorios bimestrais");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.get("/relatorios-bimestrais/:id", requireAuth, async (req, res) => {
  try {
    const [rel] = await db.select()
      .from(relatoriosBimestraisTable)
      .where(and(
        eq(relatoriosBimestraisTable.id, req.params.id),
        eq(relatoriosBimestraisTable.teacherId, req.teacherId!),
      ));
    if (!rel) { res.status(404).json({ error: "Não encontrado" }); return; }
    res.json(rel);
  } catch (err) {
    req.log.error({ err }, "Error getting relatorio bimestral");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.get("/relatorios-bimestrais/student/:studentId", requireAuth, async (req, res) => {
  try {
    const { bimestre, anoLetivo } = req.query;
    const results = await db.select()
      .from(relatoriosBimestraisTable)
      .where(
        and(
          eq(relatoriosBimestraisTable.teacherId, req.teacherId!),
          eq(relatoriosBimestraisTable.studentId, req.params.studentId),
          ...(bimestre ? [eq(relatoriosBimestraisTable.bimestre, Number(bimestre))] : []),
          ...(anoLetivo ? [eq(relatoriosBimestraisTable.anoLetivo, Number(anoLetivo))] : []),
        )
      )
      .orderBy(desc(relatoriosBimestraisTable.updatedAt));
    res.json(results);
  } catch (err) {
    req.log.error({ err }, "Error getting student relatorios");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.get("/relatorios-bimestrais/dados/:studentId", requireAuth, async (req, res) => {
  try {
    const { bimestre, anoLetivo } = req.query;
    if (!bimestre || !anoLetivo) {
      res.status(400).json({ error: "bimestre e anoLetivo são obrigatórios" });
      return;
    }
    const bim = Number(bimestre);
    const ano = Number(anoLetivo);

    const [student] = await db.select()
      .from(studentsTable)
      .where(and(eq(studentsTable.id, req.params.studentId), eq(studentsTable.teacherId, req.teacherId!)));
    if (!student) { res.status(404).json({ error: "Aluno não encontrado" }); return; }

    const months = getBimestreMonths(bim, ano);

    const allAttendance = await db.select()
      .from(attendanceTable)
      .where(and(
        eq(attendanceTable.teacherId, req.teacherId!),
        eq(attendanceTable.studentId, student.id),
      ));

    const bimAttendance = allAttendance.filter(a => months.some(m => a.date.startsWith(m)));
    const faltas = bimAttendance.filter(a => !a.present && !a.justified).length;
    const faltasJustificadas = bimAttendance.filter(a => !a.present && a.justified).length;

    const exams = await db.select()
      .from(examsTable)
      .where(eq(examsTable.teacherId, req.teacherId!));

    const activities = await db.select()
      .from(activitiesTable)
      .where(eq(activitiesTable.teacherId, req.teacherId!));
    const bimActivities = activities.filter(a => months.some(m => a.date.startsWith(m)));

    res.json({
      student: { id: student.id, name: student.name },
      bimestre: bim,
      anoLetivo: ano,
      faltas,
      faltasJustificadas,
      totalAulas: bimAttendance.length,
      exams: exams.map(e => ({ titulo: e.titulo, disciplina: e.disciplina, valorTotal: e.valorTotal })),
      atividades: bimActivities.map(a => ({ id: a.id, subject: a.subject, date: a.date, type: a.type, description: a.description })),
    });
  } catch (err) {
    req.log.error({ err }, "Error getting dados automaticos");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.post("/relatorios-bimestrais", requireAuth, async (req, res) => {
  try {
    const { studentId, studentName, bimestre, anoLetivo, serieTurma, dadosAutomaticos, observacoesProfessor, textoGerado, status } = req.body;
    if (!studentId || !studentName || !bimestre || !anoLetivo || !serieTurma) {
      res.status(400).json({ error: "Campos obrigatórios: studentId, studentName, bimestre, anoLetivo, serieTurma" });
      return;
    }

    const existing = await db.select({ id: relatoriosBimestraisTable.id })
      .from(relatoriosBimestraisTable)
      .where(and(
        eq(relatoriosBimestraisTable.teacherId, req.teacherId!),
        eq(relatoriosBimestraisTable.studentId, studentId),
        eq(relatoriosBimestraisTable.bimestre, Number(bimestre)),
        eq(relatoriosBimestraisTable.anoLetivo, Number(anoLetivo)),
      ));

    if (existing.length > 0) {
      const [updated] = await db.update(relatoriosBimestraisTable)
        .set({
          serieTurma,
          dadosAutomaticos: dadosAutomaticos ?? {},
          observacoesProfessor: observacoesProfessor ?? {},
          textoGerado: textoGerado ?? null,
          status: status ?? "rascunho",
          updatedAt: new Date(),
        })
        .where(eq(relatoriosBimestraisTable.id, existing[0].id))
        .returning();
      res.json(updated);
    } else {
      const [created] = await db.insert(relatoriosBimestraisTable)
        .values({
          id: generateId(),
          teacherId: req.teacherId!,
          studentId,
          studentName,
          bimestre: Number(bimestre),
          anoLetivo: Number(anoLetivo),
          serieTurma,
          dadosAutomaticos: dadosAutomaticos ?? {},
          observacoesProfessor: observacoesProfessor ?? {},
          textoGerado: textoGerado ?? null,
          status: status ?? "rascunho",
        })
        .returning();
      res.status(201).json(created);
    }
  } catch (err) {
    req.log.error({ err }, "Error saving relatorio bimestral");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.put("/relatorios-bimestrais/:id", requireAuth, async (req, res) => {
  try {
    const [existing] = await db.select({ id: relatoriosBimestraisTable.id })
      .from(relatoriosBimestraisTable)
      .where(and(
        eq(relatoriosBimestraisTable.id, req.params.id),
        eq(relatoriosBimestraisTable.teacherId, req.teacherId!),
      ));
    if (!existing) { res.status(404).json({ error: "Não encontrado" }); return; }

    const [updated] = await db.update(relatoriosBimestraisTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(relatoriosBimestraisTable.id, req.params.id))
      .returning();
    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Error updating relatorio bimestral");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

router.delete("/relatorios-bimestrais/:id", requireAuth, async (req, res) => {
  try {
    const [existing] = await db.select({ id: relatoriosBimestraisTable.id })
      .from(relatoriosBimestraisTable)
      .where(and(
        eq(relatoriosBimestraisTable.id, req.params.id),
        eq(relatoriosBimestraisTable.teacherId, req.teacherId!),
      ));
    if (!existing) { res.status(404).json({ error: "Não encontrado" }); return; }
    await db.delete(relatoriosBimestraisTable).where(eq(relatoriosBimestraisTable.id, req.params.id));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Error deleting relatorio bimestral");
    res.status(500).json({ error: "Erro interno do servidor" });
  }
});

const SYSTEM_PROMPT = `Você é um assistente pedagógico especializado em redigir relatórios bimestrais escolares para a Secretaria de Educação do Distrito Federal (SEEDF), seguindo o padrão da BNCC e do Currículo em Movimento da SEEDF.

Redija um relatório bimestral completo e formal para o(a) estudante informado(a), com base nos dados fornecidos pela professora.

O relatório deve seguir EXATAMENTE esta estrutura:

1. Parágrafo de abertura: "Este relatório sintetiza o desenvolvimento do(a) estudante [NOME COMPLETO], correspondente ao [Nº]º bimestre do ano letivo de [ANO]. A avaliação do desenvolvimento das capacidades e competências está baseada dentro de cada componente curricular tendo como referência a Base Nacional Comum Curricular e o Currículo em Movimento da SEEDF."

2. Para cada disciplina informada, um bloco com as habilidades desenvolvidas, análise do desempenho do estudante, avanços e pontos fortes. Usar linguagem pedagógica formal, na terceira pessoa, positiva e construtiva. Nunca usar linguagem negativa ou depreciativa.

3. Bloco de aspectos comportamentais e sociais.

4. Bloco de estratégias pedagógicas utilizadas pela professora.

5. Parágrafo de síntese final com resumo do desempenho geral, mencionando assiduidade e desenvolvimento.

Regras de escrita:
- Sempre na terceira pessoa (o estudante, a estudante)
- Tom formal, pedagógico e construtivo
- Dificuldades: "encontra-se em processo de consolidação", "ainda necessita de apoio", "segue avançando"
- Extensão: 4 a 5 parágrafos por disciplina
- Apenas texto corrido em parágrafos, sem tópicos ou listas`;

router.post("/relatorios-bimestrais/gerar", requireAuth, async (req, res) => {
  try {
    const { studentName, bimestre, anoLetivo, serieTurma, teacherName, schoolName, dadosAutomaticos, observacoesProfessor } = req.body;
    if (!studentName || !bimestre || !anoLetivo) {
      res.status(400).json({ error: "Dados insuficientes para geração" });
      return;
    }

    const obs = observacoesProfessor as Record<string, any> ?? {};
    const dados = dadosAutomaticos as Record<string, any> ?? {};

    const disciplinas = obs.disciplinas as Array<{ nome: string; avancos: string; dificuldades: string }> ?? [];

    const disciplinasText = disciplinas
      .filter(d => d.avancos || d.dificuldades)
      .map(d => `Disciplina: ${d.nome}\n  Avanços: ${d.avancos || "(não informado)"}\n  Dificuldades: ${d.dificuldades || "(não informado)"}`)
      .join("\n\n");

    const prompt = `${SYSTEM_PROMPT}

Dados do aluno e observações da professora:
Nome do aluno: ${studentName}
Bimestre: ${bimestre}º bimestre de ${anoLetivo}
Série/Turma: ${serieTurma ?? ""}
Professora: ${teacherName ?? ""}
Escola: ${schoolName ?? ""}

DADOS OBJETIVOS DO APP:
- Faltas no bimestre: ${dados.faltas ?? 0}
- Faltas justificadas: ${dados.faltasJustificadas ?? 0}
- Total de aulas: ${dados.totalAulas ?? 0}
- Atividades no bimestre: ${dados.atividades?.length ?? 0}

OBSERVAÇÕES DA PROFESSORA POR DISCIPLINA:
${disciplinasText || "(nenhuma disciplina preenchida)"}

ASPECTOS COMPORTAMENTAIS:
${obs.comportamental || "(não informado)"}

ESTRATÉGIAS PEDAGÓGICAS:
${obs.estrategias || "(não informado)"}

SÍNTESE GERAL:
${obs.sintese || "(não informado)"}`;

    const result = await generateContent(prompt);
    res.json({ texto: result.text, provider: result.provider });
  } catch (err: any) {
    req.log.error({ err }, "Error generating relatorio bimestral");
    res.status(500).json({ error: err.message ?? "Erro ao gerar relatório com IA" });
  }
});

export default router;
