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

export type PlanType = "free" | "basic" | "medium" | "advanced";
export type PlanStatus = "trial" | "active" | "overdue" | "canceled";

export const teachersTable = pgTable("teachers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  weeklySchedule: jsonb("weekly_schedule").$type<WeeklySchedule>(),
  grade: text("grade"),
  teacherType: text("teacher_type").$type<"regente" | "disciplina">(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  planType: text("plan_type").$type<PlanType>().default("free").notNull(),
  planStatus: text("plan_status").$type<PlanStatus>().default("active").notNull(),
  planExpirationDate: timestamp("plan_expiration_date"),
  asaasCustomerId: text("asaas_customer_id"),
  asaasSubscriptionId: text("asaas_subscription_id"),
});

export const insertTeacherSchema = createInsertSchema(teachersTable);
export type InsertTeacher = z.infer<typeof insertTeacherSchema>;
export type Teacher = typeof teachersTable.$inferSelect;
