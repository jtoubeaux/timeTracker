import { 
  type Employee, 
  type InsertEmployee,
  type TimeEntry,
  type InsertTimeEntry,
  type LocationBreadcrumb,
  type InsertLocationBreadcrumb,
  type LocationDeparture,
  type InsertLocationDeparture
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Employee methods
  getEmployee(id: string): Promise<Employee | undefined>;
  getEmployeeByEmail(email: string): Promise<Employee | undefined>;
  getAllEmployees(): Promise<Employee[]>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(id: string, updates: Partial<Employee>): Promise<Employee | undefined>;
  
  // Time entry methods
  getTimeEntry(id: string): Promise<TimeEntry | undefined>;
  getActiveTimeEntry(employeeId: string): Promise<TimeEntry | undefined>;
  getTimeEntriesByEmployee(employeeId: string, limit?: number): Promise<TimeEntry[]>;
  createTimeEntry(timeEntry: InsertTimeEntry): Promise<TimeEntry>;
  updateTimeEntry(id: string, updates: Partial<TimeEntry>): Promise<TimeEntry | undefined>;
  
  // Location breadcrumb methods
  getBreadcrumbsByTimeEntry(timeEntryId: string): Promise<LocationBreadcrumb[]>;
  createBreadcrumb(breadcrumb: InsertLocationBreadcrumb): Promise<LocationBreadcrumb>;
  
  // Location departure methods
  getDeparturesByTimeEntry(timeEntryId: string): Promise<LocationDeparture[]>;
  getUnsyncedDepartures(): Promise<LocationDeparture[]>;
  createDeparture(departure: InsertLocationDeparture): Promise<LocationDeparture>;
  markDepartureSynced(id: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private employees: Map<string, Employee>;
  private timeEntries: Map<string, TimeEntry>;
  private locationBreadcrumbs: Map<string, LocationBreadcrumb>;
  private locationDepartures: Map<string, LocationDeparture>;

  constructor() {
    this.employees = new Map();
    this.timeEntries = new Map();
    this.locationBreadcrumbs = new Map();
    this.locationDepartures = new Map();
    
    // Create demo employee
    const demoEmployee: Employee = {
      id: randomUUID(),
      name: "John Doe",
      email: "john.doe@company.com",
      isActive: true,
      createdAt: new Date(),
    };
    this.employees.set(demoEmployee.id, demoEmployee);
  }

  async getEmployee(id: string): Promise<Employee | undefined> {
    return this.employees.get(id);
  }

  async getEmployeeByEmail(email: string): Promise<Employee | undefined> {
    return Array.from(this.employees.values()).find(emp => emp.email === email);
  }

  async getAllEmployees(): Promise<Employee[]> {
    return Array.from(this.employees.values());
  }

  async createEmployee(insertEmployee: InsertEmployee): Promise<Employee> {
    const id = randomUUID();
    const employee: Employee = {
      ...insertEmployee,
      id,
      isActive: insertEmployee.isActive ?? true,
      createdAt: new Date(),
    };
    this.employees.set(id, employee);
    return employee;
  }

  async updateEmployee(id: string, updates: Partial<Employee>): Promise<Employee | undefined> {
    const employee = this.employees.get(id);
    if (!employee) return undefined;
    
    const updated = { ...employee, ...updates };
    this.employees.set(id, updated);
    return updated;
  }

  async getTimeEntry(id: string): Promise<TimeEntry | undefined> {
    return this.timeEntries.get(id);
  }

  async getActiveTimeEntry(employeeId: string): Promise<TimeEntry | undefined> {
    return Array.from(this.timeEntries.values()).find(
      entry => entry.employeeId === employeeId && entry.isActive && !entry.clockOutTime
    );
  }

  async getTimeEntriesByEmployee(employeeId: string, limit?: number): Promise<TimeEntry[]> {
    const entries = Array.from(this.timeEntries.values())
      .filter(entry => entry.employeeId === employeeId)
      .sort((a, b) => new Date(b.clockInTime).getTime() - new Date(a.clockInTime).getTime());
    
    return limit ? entries.slice(0, limit) : entries;
  }

  async createTimeEntry(insertTimeEntry: InsertTimeEntry): Promise<TimeEntry> {
    const id = randomUUID();
    const timeEntry: TimeEntry = {
      ...insertTimeEntry,
      id,
      isActive: insertTimeEntry.isActive ?? true,
      clockOutTime: insertTimeEntry.clockOutTime ?? null,
      clockInLocation: insertTimeEntry.clockInLocation ?? null,
      clockOutLocation: insertTimeEntry.clockOutLocation ?? null,
      totalHours: null,
    };
    this.timeEntries.set(id, timeEntry);
    return timeEntry;
  }

  async updateTimeEntry(id: string, updates: Partial<TimeEntry>): Promise<TimeEntry | undefined> {
    const timeEntry = this.timeEntries.get(id);
    if (!timeEntry) return undefined;
    
    const updated = { ...timeEntry, ...updates };
    this.timeEntries.set(id, updated);
    return updated;
  }

  async getBreadcrumbsByTimeEntry(timeEntryId: string): Promise<LocationBreadcrumb[]> {
    return Array.from(this.locationBreadcrumbs.values())
      .filter(breadcrumb => breadcrumb.timeEntryId === timeEntryId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  async createBreadcrumb(insertBreadcrumb: InsertLocationBreadcrumb): Promise<LocationBreadcrumb> {
    const id = randomUUID();
    const breadcrumb: LocationBreadcrumb = {
      ...insertBreadcrumb,
      id,
      address: insertBreadcrumb.address ?? null,
      accuracy: insertBreadcrumb.accuracy ?? null,
      timestamp: new Date(),
    };
    this.locationBreadcrumbs.set(id, breadcrumb);
    return breadcrumb;
  }

  async getDeparturesByTimeEntry(timeEntryId: string): Promise<LocationDeparture[]> {
    return Array.from(this.locationDepartures.values())
      .filter(departure => departure.timeEntryId === timeEntryId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  async getUnsyncedDepartures(): Promise<LocationDeparture[]> {
    return Array.from(this.locationDepartures.values()).filter(departure => !departure.synced);
  }

  async createDeparture(insertDeparture: InsertLocationDeparture): Promise<LocationDeparture> {
    const id = randomUUID();
    const departure: LocationDeparture = {
      ...insertDeparture,
      id,
      distance: insertDeparture.distance ?? null,
      timestamp: new Date(),
      synced: false,
    };
    this.locationDepartures.set(id, departure);
    return departure;
  }

  async markDepartureSynced(id: string): Promise<void> {
    const departure = this.locationDepartures.get(id);
    if (departure) {
      departure.synced = true;
      this.locationDepartures.set(id, departure);
    }
  }
}

export const storage = new MemStorage();
