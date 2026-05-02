import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export type TipoQuestaoSimples = "multipla_escolha" | "dissertativa";

export interface AlternativasQuestao {
  A: string;
  B: string;
  C: string;
  D: string;
}

export const questionsTable = pgTable("questions", {
  id: text("id").primaryKey(),
  teacherId: text("teacher_id").notNull(),
  enunciado: text("enunciado").notNull(),
  alternativas: jsonb("alternativas").$type<AlternativasQuestao>(),
  resposta_correta: text("resposta_correta"),
  descritivo: text("descritivo").default("").notNull(),
  disciplina: text("disciplina").default("").notNull(),
  serieTurma: text("serie_turma").default("").notNull(),
  tipoQuestao: text("tipo_questao").$type<TipoQuestaoSimples>().default("multipla_escolha").notNull(),
  tags: jsonb("tags").$type<string[]>().default([]),
  criadaEm: timestamp("criada_em").defaultNow().notNull(),
});

export type Question = typeof questionsTable.$inferSelect;
export type InsertQuestion = typeof questionsTable.$inferInsert;
