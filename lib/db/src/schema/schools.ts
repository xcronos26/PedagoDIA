import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export type SchoolStatus = "ativa" | "inativa";

export const schoolsTable = pgTable("schools", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  status: text("status").$type<SchoolStatus>().default("ativa").notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type School = typeof schoolsTable.$inferSelect;
export type InsertSchool = typeof schoolsTable.$inferInsert;
