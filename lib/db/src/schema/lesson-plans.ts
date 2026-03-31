import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const lessonPlansTable = pgTable("lesson_plans", {
  id: text("id").primaryKey(),
  teacherId: text("teacher_id").notNull(),
  date: text("date").notNull(),
  description: text("description").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const lessonPlanActivitiesTable = pgTable("lesson_plan_activities", {
  id: text("id").primaryKey(),
  lessonPlanId: text("lesson_plan_id").notNull(),
  activityId: text("activity_id").notNull(),
});

export type LessonPlan = typeof lessonPlansTable.$inferSelect;
export type LessonPlanActivity = typeof lessonPlanActivitiesTable.$inferSelect;
