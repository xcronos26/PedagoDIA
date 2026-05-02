import { pgTable, text, timestamp, jsonb, numeric } from "drizzle-orm/pg-core";

export type TipoQuestao = "multipla_escolha" | "dissertativa" | "misto";
export type OrigemProva = "ia" | "atividades" | "misto";
export type StatusProva = "rascunho" | "ativa" | "finalizada";
export type NivelDificuldade = "facil" | "medio" | "dificil";

export interface Questao {
  numero: number;
  enunciado: string;
  alternativas?: { A: string; B: string; C: string; D: string };
  resposta_correta?: string;
  descritivo: string;
}

export interface Gabarito {
  [numero: number]: string;
}

export const examsTable = pgTable("exams", {
  id: text("id").primaryKey(),
  teacherId: text("teacher_id").notNull(),
  titulo: text("titulo").notNull(),
  disciplina: text("disciplina").notNull(),
  serieTurma: text("serie_turma").notNull(),
  tema: text("tema").notNull(),
  numeroQuestoes: text("numero_questoes").notNull(),
  valorTotal: numeric("valor_total", { precision: 10, scale: 2 }).notNull(),
  valorPorQuestao: numeric("valor_por_questao", { precision: 10, scale: 4 }).notNull(),
  tipoQuestao: text("tipo_questao").$type<TipoQuestao>().notNull(),
  origem: text("origem").$type<OrigemProva>().notNull(),
  atividadesBaseIds: jsonb("atividades_base_ids").$type<string[]>().default([]),
  questoes: jsonb("questoes").$type<Questao[]>().notNull(),
  gabarito: jsonb("gabarito").$type<Gabarito>().notNull(),
  status: text("status").$type<StatusProva>().default("rascunho").notNull(),
  nomeEscola: text("nome_escola"),
  criadaEm: timestamp("criada_em").defaultNow().notNull(),
  atualizadaEm: timestamp("atualizada_em").defaultNow().notNull(),
});

export type Exam = typeof examsTable.$inferSelect;
export type InsertExam = typeof examsTable.$inferInsert;
