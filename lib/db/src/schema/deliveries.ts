import { pgTable, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const deliveriesTable = pgTable("deliveries", {
  id: text("id").primaryKey(),
  teacherId: text("teacher_id"),
  activityId: text("activity_id").notNull(),
  studentId: text("student_id").notNull(),
  delivered: boolean("delivered").notNull().default(false),
  seen: boolean("seen").notNull().default(false),
  deliveredAt: timestamp("delivered_at"),
  seenAt: timestamp("seen_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDeliverySchema = createInsertSchema(deliveriesTable);
export type InsertDelivery = z.infer<typeof insertDeliverySchema>;
export type Delivery = typeof deliveriesTable.$inferSelect;
