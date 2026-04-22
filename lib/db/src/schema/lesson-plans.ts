import { pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";

export const lessonPlansTable = pgTable("lesson_plans", {
  id: text("id").primaryKey(),
  teacherId: text("teacher_id").notNull(),
  date: text("date").notNull(),
  tema: text("tema"),
  description: text("description").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => ({
  teacherDateUniq: unique("lesson_plans_teacher_date_uniq").on(t.teacherId, t.date),
}));

export const lessonPlanActivitiesTable = pgTable("lesson_plan_activities", {
  id: text("id").primaryKey(),
  lessonPlanId: text("lesson_plan_id").notNull(),
  activityId: text("activity_id").notNull(),
}, (t) => ({
  planActivityUniq: unique("lesson_plan_activities_plan_activity_uniq").on(t.lessonPlanId, t.activityId),
}));

export type LessonPlan = typeof lessonPlansTable.$inferSelect;
export type LessonPlanActivity = typeof lessonPlanActivitiesTable.$inferSelect;
