import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export type PromptStatus = "sucesso" | "erro";

export const promptLogsTable = pgTable("prompt_logs", {
  id: text("id").primaryKey(),
  teacherId: text("teacher_id").notNull(),
  schoolId: text("school_id"),
  endpoint: text("endpoint").notNull(),
  status: text("status").$type<PromptStatus>().default("sucesso").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PromptLog = typeof promptLogsTable.$inferSelect;
export type InsertPromptLog = typeof promptLogsTable.$inferInsert;
