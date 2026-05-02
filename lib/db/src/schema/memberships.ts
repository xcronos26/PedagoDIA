import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export type MembershipRole = "admin_institucional" | "professor";
export type MembershipStatus = "pendente" | "ativo";

export const membershipsTable = pgTable("memberships", {
  id: text("id").primaryKey(),
  teacherId: text("teacher_id").notNull(),
  schoolId: text("school_id").notNull(),
  role: text("role").$type<MembershipRole>().default("professor").notNull(),
  status: text("status").$type<MembershipStatus>().default("pendente").notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export type Membership = typeof membershipsTable.$inferSelect;
export type InsertMembership = typeof membershipsTable.$inferInsert;
