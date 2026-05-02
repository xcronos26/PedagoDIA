import { pgTable, text, integer, jsonb, timestamp, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const relatoriosBimestraisTable = pgTable("relatorios_bimestrais", {
  id: text("id").primaryKey(),
  teacherId: text("teacher_id").notNull(),
  studentId: text("student_id").notNull(),
  studentName: text("student_name").notNull(),
  bimestre: integer("bimestre").notNull(),
  anoLetivo: integer("ano_letivo").notNull(),
  serieTurma: text("serie_turma").notNull(),
  dadosAutomaticos: jsonb("dados_automaticos").notNull().default({}),
  observacoesProfessor: jsonb("observacoes_professor").notNull().default({}),
  textoGerado: text("texto_gerado"),
  status: text("status").notNull().default("rascunho"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type RelatorioBimestral = typeof relatoriosBimestraisTable.$inferSelect;
export type InsertRelatorioBimestral = typeof relatoriosBimestraisTable.$inferInsert;
