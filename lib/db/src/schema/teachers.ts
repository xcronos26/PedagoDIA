import { pgTable, text, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
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
export type TeacherRole = "professor" | "admin_institucional" | "super_admin";
export type TeacherVinculo = "individual" | "escola";

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
  role: text("role").$type<TeacherRole>().default("professor").notNull(),
  vinculo: text("vinculo").$type<TeacherVinculo>().default("individual").notNull(),
  isBlocked: boolean("is_blocked").default(false).notNull(),
});

export const insertTeacherSchema = createInsertSchema(teachersTable);
export type InsertTeacher = z.infer<typeof insertTeacherSchema>;
export type Teacher = typeof teachersTable.$inferSelect;
