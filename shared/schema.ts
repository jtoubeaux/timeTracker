import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, decimal, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const employees = pgTable("employees", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const timeEntries = pgTable("time_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  employeeId: varchar("employee_id").notNull().references(() => employees.id),
  clockInTime: timestamp("clock_in_time").notNull(),
  clockOutTime: timestamp("clock_out_time"),
  clockInLocation: jsonb("clock_in_location").$type<{lat: number, lng: number, address: string}>(),
  clockOutLocation: jsonb("clock_out_location").$type<{lat: number, lng: number, address: string}>(),
  totalHours: decimal("total_hours", { precision: 4, scale: 2 }),
  isActive: boolean("is_active").notNull().default(true),
});

export const locationBreadcrumbs = pgTable("location_breadcrumbs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timeEntryId: varchar("time_entry_id").notNull().references(() => timeEntries.id),
  timestamp: timestamp("timestamp").notNull().default(sql`now()`),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  accuracy: decimal("accuracy", { precision: 6, scale: 2 }),
  address: text("address"),
});

export const locationDepartures = pgTable("location_departures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timeEntryId: varchar("time_entry_id").notNull().references(() => timeEntries.id),
  timestamp: timestamp("timestamp").notNull().default(sql`now()`),
  fromLocation: jsonb("from_location").$type<{lat: number, lng: number, address: string}>().notNull(),
  toLocation: jsonb("to_location").$type<{lat: number, lng: number, address: string}>().notNull(),
  distance: decimal("distance", { precision: 8, scale: 2 }), // in meters
  synced: boolean("synced").notNull().default(false),
});

export const insertEmployeeSchema = createInsertSchema(employees).omit({
  id: true,
  createdAt: true,
});

export const insertTimeEntrySchema = createInsertSchema(timeEntries).omit({
  id: true,
  totalHours: true,
});

export const insertLocationBreadcrumbSchema = createInsertSchema(locationBreadcrumbs).omit({
  id: true,
  timestamp: true,
});

export const insertLocationDepartureSchema = createInsertSchema(locationDepartures).omit({
  id: true,
  timestamp: true,
  synced: true,
});

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type TimeEntry = typeof timeEntries.$inferSelect;
export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;
export type LocationBreadcrumb = typeof locationBreadcrumbs.$inferSelect;
export type InsertLocationBreadcrumb = z.infer<typeof insertLocationBreadcrumbSchema>;
export type LocationDeparture = typeof locationDepartures.$inferSelect;
export type InsertLocationDeparture = z.infer<typeof insertLocationDepartureSchema>;
