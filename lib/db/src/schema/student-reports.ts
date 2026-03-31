import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const studentReportsTable = pgTable("student_reports", {
  id: text("id").primaryKey(),
  teacherId: text("teacher_id").notNull(),
  studentId: text("student_id").notNull(),
  date: text("date").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertStudentReportSchema = createInsertSchema(studentReportsTable);
export type InsertStudentReport = z.infer<typeof insertStudentReportSchema>;
export type StudentReport = typeof studentReportsTable.$inferSelect;
