import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import {
  employeesTable,
  timeEntriesTable,
  locationBreadcrumbsTable,
  locationDeparturesTable,
  type Employee,
  type InsertEmployee,
  type TimeEntry,
  type InsertTimeEntry,
  type LocationBreadcrumb,
  type InsertLocationBreadcrumb,
  type LocationDeparture,
  type InsertLocationDeparture,
} from '@shared/schema';
import { eq, and, desc, isNull } from 'drizzle-orm';

// This interface is the contract for what our storage must do.
export interface IStorage {
  getEmployee(id: string): Promise<Employee | undefined>;
  getAllEmployees(): Promise<Employee[]>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  getTimeEntry(id: string): Promise<TimeEntry | undefined>;
  getActiveTimeEntry(employeeId: string): Promise<TimeEntry | undefined>;
  getTimeEntriesByEmployee(employeeId: string, limit?: number): Promise<TimeEntry[]>;
  createTimeEntry(timeEntry: InsertTimeEntry): Promise<TimeEntry>;
  updateTimeEntry(id: string, updates: Partial<TimeEntry>): Promise<TimeEntry | undefined>;
  getBreadcrumbsByTimeEntry(timeEntryId: string): Promise<LocationBreadcrumb[]>;
  createBreadcrumb(breadcrumb: InsertLocationBreadcrumb): Promise<LocationBreadcrumb>;
  getDeparturesByTimeEntry(timeEntryId: string): Promise<LocationDeparture[]>;
  getUnsyncedDepartures(): Promise<LocationDeparture[]>;
  createDeparture(departure: InsertLocationDeparture): Promise<LocationDeparture>;
  markDepartureSynced(id: string): Promise<void>;
}

// This is the REAL implementation that uses our Neon database.
class DrizzleStorage implements IStorage {
  private db;

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    const client = postgres(process.env.DATABASE_URL, { ssl: 'require' });
    this.db = drizzle(client);
  }

  async getEmployee(id: string): Promise<Employee | undefined> {
    const result = await this.db.select().from(employeesTable).where(eq(employeesTable.id, id)).limit(1);
    return result[0];
  }

  async getAllEmployees(): Promise<Employee[]> {
    return this.db.select().from(employeesTable);
  }

  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const result = await this.db.insert(employeesTable).values(employee).returning();
    return result[0];
  }

  async getTimeEntry(id: string): Promise<TimeEntry | undefined> {
    const result = await this.db.select().from(timeEntriesTable).where(eq(timeEntriesTable.id, id)).limit(1);
    return result[0];
  }

  async getActiveTimeEntry(employeeId: string): Promise<TimeEntry | undefined> {
    const result = await this.db.select().from(timeEntriesTable).where(
      and(
        eq(timeEntriesTable.employeeId, employeeId),
        eq(timeEntriesTable.isActive, true),
        isNull(timeEntriesTable.clockOutTime)
      )
    ).limit(1);
    return result[0];
  }

  async getTimeEntriesByEmployee(employeeId: string, limit: number = 20): Promise<TimeEntry[]> {
    return this.db.select().from(timeEntriesTable)
      .where(eq(timeEntriesTable.employeeId, employeeId))
      .orderBy(desc(timeEntriesTable.clockInTime))
      .limit(limit);
  }

  async createTimeEntry(timeEntry: InsertTimeEntry): Promise<TimeEntry> {
    const result = await this.db.insert(timeEntriesTable).values(timeEntry).returning();
    return result[0];
  }

  async updateTimeEntry(id: string, updates: Partial<TimeEntry>): Promise<TimeEntry | undefined> {
    const result = await this.db.update(timeEntriesTable)
      .set(updates)
      .where(eq(timeEntriesTable.id, id))
      .returning();
    return result[0];
  }

  async getBreadcrumbsByTimeEntry(timeEntryId: string): Promise<LocationBreadcrumb[]> {
    return this.db.select().from(locationBreadcrumbsTable)
      .where(eq(locationBreadcrumbsTable.timeEntryId, timeEntryId))
      .orderBy(desc(locationBreadcrumbsTable.timestamp));
  }

  async createBreadcrumb(breadcrumb: InsertLocationBreadcrumb): Promise<LocationBreadcrumb> {
    const result = await this.db.insert(locationBreadcrumbsTable).values(breadcrumb).returning();
    return result[0];
  }

  async getDeparturesByTimeEntry(timeEntryId: string): Promise<LocationDeparture[]> {
    return this.db.select().from(locationDeparturesTable)
      .where(eq(locationDeparturesTable.timeEntryId, timeEntryId))
      .orderBy(desc(locationDeparturesTable.timestamp));
  }
  
  async getUnsyncedDepartures(): Promise<LocationDeparture[]> {
    return this.db.select().from(locationDeparturesTable)
      .where(eq(locationDeparturesTable.synced, false));
  }

  async createDeparture(departure: InsertLocationDeparture): Promise<LocationDeparture> {
    const result = await this.db.insert(locationDeparturesTable).values(departure).returning();
    return result[0];
  }

  async markDepartureSynced(id: string): Promise<void> {
    await this.db.update(locationDeparturesTable)
      .set({ synced: true })
      .where(eq(locationDeparturesTable.id, id));
  }
}

// Export the one, real, database-connected storage instance.
export const storage = new DrizzleStorage();