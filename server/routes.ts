import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { 
  insertEmployeeSchema, 
  insertTimeEntrySchema, 
  insertLocationBreadcrumbSchema,
  insertLocationDepartureSchema 
} from "@shared/schema";
import { z } from "zod";

// Google Sheets API integration (placeholder - would use googleapis in production)
async function syncToGoogleSheets(departure: any) {
  // In production, this would use the Google Sheets API
  // const auth = await google.auth.getClient({
  //   keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
  //   scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  // });
  
  console.log("Syncing departure to Google Sheets:", departure);
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return { success: true };
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws) => {
    console.log('Client connected to WebSocket');
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Received WebSocket message:', data);
      } catch (error) {
        console.error('Invalid WebSocket message:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('Client disconnected from WebSocket');
    });
  });

  // Broadcast to all connected clients
  function broadcast(data: any) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  }

  // Employee routes
  app.get("/api/employees", async (req, res) => {
    try {
      const employees = await storage.getAllEmployees();
      res.json(employees);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch employees" });
    }
  });

  app.get("/api/employees/:id", async (req, res) => {
    try {
      const employee = await storage.getEmployee(req.params.id);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }
      res.json(employee);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch employee" });
    }
  });

  app.post("/api/employees", async (req, res) => {
    try {
      const validatedData = insertEmployeeSchema.parse(req.body);
      const employee = await storage.createEmployee(validatedData);
      res.status(201).json(employee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid employee data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create employee" });
    }
  });

  // Time entry routes
  app.get("/api/employees/:employeeId/time-entries", async (req, res) => {
    try {
      const { limit } = req.query;
      const timeEntries = await storage.getTimeEntriesByEmployee(
        req.params.employeeId, 
        limit ? parseInt(limit as string) : undefined
      );
      res.json(timeEntries);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch time entries" });
    }
  });

  app.get("/api/employees/:employeeId/active-time-entry", async (req, res) => {
    try {
      const activeEntry = await storage.getActiveTimeEntry(req.params.employeeId);
      res.json(activeEntry || null);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch active time entry" });
    }
  });

  app.post("/api/time-entries/clock-in", async (req, res) => {
    try {
      const schema = insertTimeEntrySchema.extend({
        clockInLocation: z.object({
          lat: z.number(),
          lng: z.number(),
          address: z.string()
        }).optional()
      });
      
      const validatedData = schema.parse(req.body);
      
      // Check if employee already has an active time entry
      const existingActive = await storage.getActiveTimeEntry(validatedData.employeeId);
      if (existingActive) {
        return res.status(400).json({ message: "Employee is already clocked in" });
      }
      
      const timeEntry = await storage.createTimeEntry({
        ...validatedData,
        clockInTime: new Date(),
        isActive: true
      });
      
      broadcast({ type: 'CLOCK_IN', timeEntry });
      res.status(201).json(timeEntry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid clock-in data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to clock in" });
    }
  });

  app.post("/api/time-entries/:id/clock-out", async (req, res) => {
    try {
      const schema = z.object({
        clockOutLocation: z.object({
          lat: z.number(),
          lng: z.number(),
          address: z.string()
        }).optional()
      });
      
      const validatedData = schema.parse(req.body);
      const clockOutTime = new Date();
      
      const timeEntry = await storage.getTimeEntry(req.params.id);
      if (!timeEntry) {
        return res.status(404).json({ message: "Time entry not found" });
      }
      
      if (timeEntry.clockOutTime) {
        return res.status(400).json({ message: "Already clocked out" });
      }
      
      // Calculate total hours
      const clockInTime = new Date(timeEntry.clockInTime);
      const totalHours = ((clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60)).toFixed(2);
      
      const updatedEntry = await storage.updateTimeEntry(req.params.id, {
        clockOutTime,
        clockOutLocation: validatedData.clockOutLocation,
        totalHours: totalHours,
        isActive: false
      });
      
      broadcast({ type: 'CLOCK_OUT', timeEntry: updatedEntry });
      res.json(updatedEntry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid clock-out data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to clock out" });
    }
  });

  // Location breadcrumb routes
  app.get("/api/time-entries/:timeEntryId/breadcrumbs", async (req, res) => {
    try {
      const breadcrumbs = await storage.getBreadcrumbsByTimeEntry(req.params.timeEntryId);
      res.json(breadcrumbs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch breadcrumbs" });
    }
  });

  app.post("/api/time-entries/:timeEntryId/breadcrumbs", async (req, res) => {
    try {
      const validatedData = insertLocationBreadcrumbSchema.parse({
        ...req.body,
        timeEntryId: req.params.timeEntryId
      });
      
      const breadcrumb = await storage.createBreadcrumb(validatedData);
      
      // Check for location departure
      const allBreadcrumbs = await storage.getBreadcrumbsByTimeEntry(req.params.timeEntryId);
      if (allBreadcrumbs.length > 1) {
        const prevBreadcrumb = allBreadcrumbs[allBreadcrumbs.length - 2];
        const currentBreadcrumb = breadcrumb;
        
        // Calculate distance between locations (simplified)
        const lat1 = parseFloat(prevBreadcrumb.latitude);
        const lng1 = parseFloat(prevBreadcrumb.longitude);
        const lat2 = parseFloat(currentBreadcrumb.latitude);
        const lng2 = parseFloat(currentBreadcrumb.longitude);
        
        const distance = Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lng2 - lng1, 2)) * 111000; // rough meters
        
        // If moved more than 100 meters, consider it a departure
        if (distance > 100) {
          const departure = await storage.createDeparture({
            timeEntryId: req.params.timeEntryId,
            fromLocation: {
              lat: lat1,
              lng: lng1,
              address: prevBreadcrumb.address || "Unknown location"
            },
            toLocation: {
              lat: lat2,
              lng: lng2,
              address: currentBreadcrumb.address || "Unknown location"
            },
            distance: distance.toString()
          });
          
          // Sync to Google Sheets
          try {
            await syncToGoogleSheets(departure);
            await storage.markDepartureSynced(departure.id);
          } catch (syncError) {
            console.error("Failed to sync departure to Google Sheets:", syncError);
          }
          
          broadcast({ type: 'LOCATION_DEPARTURE', departure });
        }
      }
      
      broadcast({ type: 'LOCATION_UPDATE', breadcrumb });
      res.status(201).json(breadcrumb);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid breadcrumb data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create breadcrumb" });
    }
  });

  // Location departure routes
  app.get("/api/time-entries/:timeEntryId/departures", async (req, res) => {
    try {
      const departures = await storage.getDeparturesByTimeEntry(req.params.timeEntryId);
      res.json(departures);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch departures" });
    }
  });

  app.get("/api/departures/unsynced", async (req, res) => {
    try {
      const unsyncedDepartures = await storage.getUnsyncedDepartures();
      res.json(unsyncedDepartures);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch unsynced departures" });
    }
  });

  app.post("/api/sync-departures", async (req, res) => {
    try {
      const unsyncedDepartures = await storage.getUnsyncedDepartures();
      const results = [];
      
      for (const departure of unsyncedDepartures) {
        try {
          await syncToGoogleSheets(departure);
          await storage.markDepartureSynced(departure.id);
          results.push({ id: departure.id, success: true });
        } catch (error) {
          results.push({ id: departure.id, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }
      
      broadcast({ type: 'SYNC_COMPLETE', results });
      res.json({ synced: results.filter(r => r.success).length, failed: results.filter(r => !r.success).length });
    } catch (error) {
      res.status(500).json({ message: "Failed to sync departures" });
    }
  });

  return httpServer;
}
