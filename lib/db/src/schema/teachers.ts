import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export type DayEntry = {
  subject: string;
  turma?: string;
};

export type WeeklySchedule = {
  segunda: DayEntry[];
  terca: DayEntry[];
  quarta: DayEntry[];
  quinta: DayEntry[];
  sexta: DayEntry[];
};

export const teachersTable = pgTable("teachers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  weeklySchedule: jsonb("weekly_schedule").$type<WeeklySchedule>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTeacherSchema = createInsertSchema(teachersTable);
export type InsertTeacher = z.infer<typeof insertTeacherSchema>;
export type Teacher = typeof teachersTable.$inferSelect;
