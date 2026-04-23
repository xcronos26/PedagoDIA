import { Router, type IRouter } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { requireAuth } from "../middlewares/auth";
import type { WeeklySchedule, DayEntry } from "@workspace/db";

const router: IRouter = Router();

function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY não configurada");
  return new GoogleGenerativeAI(apiKey);
}

const SUGGEST_PROMPT = (text: string, serie?: string) => `
Você é um especialista em pedagogia brasileira e na BNCC (Base Nacional Comum Curricular).

Um professor${serie ? ` do ${serie}` : ''} está escrevendo a descrição de uma aula com o seguinte texto:
"${text}"

Com base nesse texto, sugira:
1. Até 3 habilidades da BNCC relevantes (formato: "CODIGO – descrição curta")
2. Até 3 objetivos de aprendizagem curtos e práticos

Responda APENAS com JSON válido, sem markdown, no formato:
{
  "bncc": ["EF04LP05 – Leitura e interpretação de textos", "..."],
  "objetivos": ["Desenvolver a leitura crítica", "..."]
}
`.trim();

const DAY_PROMPT = (serie: string, disciplina: string, tema: string) => `
Você é um especialista em planejamento de aulas baseado na BNCC.

Crie um plano de aula para um único dia.

Dados:
- Série: ${serie}
- Disciplina: ${disciplina}
- Tema: ${tema}

Gere o plano com objetivo, habilidade BNCC, descrição da condução da aula e sugestão de atividade prática.
Use linguagem simples e prática. Não seja genérico.

Regras de tamanho (obrigatório):
- Objetivo: no máximo 20 palavras
- Descrição da aula: no máximo 80 palavras
- Atividade: no máximo 60 palavras
- Seja direto e prático, evite explicações longas
- Não use parágrafos grandes

Responda APENAS com JSON válido, sem markdown:
{
  "tema": "${tema}",
  "objetivo": "",
  "bncc": { "codigo": "", "descricao": "" },
  "descricao": "",
  "atividade": ""
}
`.trim();

function formatEntry(entry: DayEntry | string): string {
  if (typeof entry === "string") return entry;
  return entry.turma ? `${entry.subject} (${entry.turma})` : entry.subject;
}

function formatWeeklySchedule(schedule: WeeklySchedule): string {
  const days: Array<{ label: string; key: keyof WeeklySchedule }> = [
    { label: "Segunda-feira", key: "segunda" },
    { label: "Terça-feira", key: "terca" },
    { label: "Quarta-feira", key: "quarta" },
    { label: "Quinta-feira", key: "quinta" },
    { label: "Sexta-feira", key: "sexta" },
  ];
  const lines = days
    .filter(d => schedule[d.key] && schedule[d.key].length > 0)
    .map(d => `  - ${d.label}: ${(schedule[d.key] as Array<DayEntry | string>).map(formatEntry).join(", ")}`);
  return lines.length > 0 ? lines.join("\n") : "";
}

const WEEK_REGENTE_PROMPT = (serie: string, tema: string, schedule?: WeeklySchedule | null) => {
  const scheduleSection = schedule ? formatWeeklySchedule(schedule) : "";
  const hasSchedule = scheduleSection.trim().length > 0;

  return `
Você é um especialista em pedagogia brasileira e planejamento escolar alinhado à BNCC.

Gere um planejamento semanal para um professor regente do ensino fundamental.

Dados:
- Série: ${serie}
- Tipo de professor: regente (leciona todas as matérias)
${tema ? `- Tema geral: ${tema}` : ''}
${hasSchedule ? `\nGrade semanal do professor (RESPEITE essa distribuição de matérias por dia):\n${scheduleSection}` : ''}

Regras:
- Estruture a semana de segunda a sexta
${hasSchedule ? '- Use as disciplinas de acordo com a grade semanal fornecida acima' : '- Inclua diferentes disciplinas ao longo da semana (português, matemática, ciências, história, geografia, artes, educação física)'}
- Para cada dia, inclua: disciplina, tema, objetivo, habilidade BNCC (código e descrição), descrição simples da aula, sugestão de atividade prática
- Use linguagem simples e prática
- Não seja genérico, evite textos longos

Regras de tamanho (obrigatório):
- Cada dia deve ter no máximo 90 palavras no total
- Objetivo: até 10 palavras
- Descrição: até 30 palavras
- Atividade: até 20 palavras
- Seja direto e resumido
- Não escreva textos longos

Responda APENAS com JSON válido, sem markdown:
{
  "semana": [
    {
      "dia": "Segunda",
      "aulas": [
        {
          "disciplina": "",
          "tema": "",
          "objetivo": "",
          "bncc": { "codigo": "", "descricao": "" },
          "descricao": "",
          "atividade": ""
        }
      ]
    }
  ]
}
`.trim();
};

const WEEK_DISCIPLINA_PROMPT = (serie: string, disciplina: string, tema: string) => `
Você é um especialista em pedagogia brasileira alinhado à BNCC.

Gere um planejamento semanal para um professor que leciona apenas uma disciplina.

Dados:
- Série: ${serie}
- Disciplina: ${disciplina}
${tema ? `- Tema: ${tema}` : ''}

Regras:
- Estruture de segunda a sexta
- Crie progressão pedagógica ao longo da semana
- Para cada dia inclua: tema, objetivo, habilidade BNCC (código e descrição), explicação simples da aula, sugestão de atividade
- Use linguagem simples e prática

Regras de tamanho (obrigatório):
- Cada dia deve ter no máximo 90 palavras no total
- Objetivo: até 10 palavras
- Descrição: até 30 palavras
- Atividade: até 20 palavras
- Seja direto e resumido
- Não escreva textos longos

Responda APENAS com JSON válido, sem markdown:
{
  "semana": [
    {
      "dia": "Segunda",
      "tema": "",
      "objetivo": "",
      "bncc": { "codigo": "", "descricao": "" },
      "descricao": "",
      "atividade": ""
    }
  ]
}
`.trim();

const ACTIVITY_PROMPT = (serie: string, disciplina: string, tema: string) => `
Você é um especialista em atividades pedagógicas alinhadas à BNCC.

Crie uma atividade escolar para:
- Série: ${serie}
- Disciplina: ${disciplina}
- Tema: ${tema}

A atividade deve ser prática, clara e adequada para a sala de aula.

Responda APENAS com JSON válido, sem markdown:
{
  "titulo": "",
  "descricao": "",
  "tipo": "classwork",
  "bncc": { "codigo": "", "descricao": "" }
}
`.trim();

router.post("/ai/suggest", requireAuth, async (req, res) => {
  try {
    const { text, serie } = req.body;
    if (!text || typeof text !== "string" || text.trim().length < 10) {
      res.status(400).json({ error: "text deve ter ao menos 10 caracteres" });
      return;
    }

    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json", maxOutputTokens: 8192 },
    });

    const result = await model.generateContent(SUGGEST_PROMPT(text.trim(), serie));
    const raw = result.response.text();
    const parsed = JSON.parse(raw);

    res.json({
      bncc: Array.isArray(parsed.bncc) ? parsed.bncc.slice(0, 3) : [],
      objetivos: Array.isArray(parsed.objetivos) ? parsed.objetivos.slice(0, 3) : [],
    });
  } catch (err) {
    req.log.error({ err }, "Error in AI suggest");
    res.status(500).json({ error: "Erro ao gerar sugestões" });
  }
});

router.post("/ai/generate-plan", requireAuth, async (req, res) => {
  try {
    const { mode, serie, tipo, disciplina, tema, weeklySchedule } = req.body;

    if (!mode || !["day", "week"].includes(mode)) {
      res.status(400).json({ error: "mode deve ser 'day' ou 'week'" });
      return;
    }
    if (!serie || typeof serie !== "string") {
      res.status(400).json({ error: "serie é obrigatório" });
      return;
    }

    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json", maxOutputTokens: 8192 },
    });

    let prompt: string;
    if (mode === "day") {
      const disc = disciplina || "Geral";
      const t = tema || "Aula do dia";
      prompt = DAY_PROMPT(serie, disc, t);
    } else {
      if (tipo === "regente") {
        prompt = WEEK_REGENTE_PROMPT(serie, tema || "", weeklySchedule ?? null);
      } else {
        const disc = disciplina || "Geral";
        prompt = WEEK_DISCIPLINA_PROMPT(serie, disc, tema || "");
      }
    }

    const result = await model.generateContent(prompt);
    const raw = result.response.text();
    const parsed = JSON.parse(raw);

    res.json(parsed);
  } catch (err) {
    req.log.error({ err }, "Error in AI generate-plan");
    res.status(500).json({ error: "Erro ao gerar planejamento" });
  }
});

router.post("/ai/generate-activity", requireAuth, async (req, res) => {
  try {
    const { serie, disciplina, tema } = req.body;
    if (!disciplina || !tema) {
      res.status(400).json({ error: "disciplina e tema são obrigatórios" });
      return;
    }

    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json", maxOutputTokens: 8192 },
    });

    const result = await model.generateContent(ACTIVITY_PROMPT(serie || "Ensino Fundamental", disciplina, tema));
    const raw = result.response.text();
    const parsed = JSON.parse(raw);

    res.json({
      titulo: parsed.titulo ?? "",
      descricao: parsed.descricao ?? "",
      tipo: parsed.tipo === "homework" ? "homework" : "classwork",
      bncc: parsed.bncc ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "Error in AI generate-activity");
    res.status(500).json({ error: "Erro ao gerar atividade" });
  }
});

export default router;
