import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export type WeeklySchedule = {
  segunda: string[];
  terca: string[];
  quarta: string[];
  quinta: string[];
  sexta: string[];
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
