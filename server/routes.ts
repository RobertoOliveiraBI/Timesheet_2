import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { 
  insertEconomicGroupSchema,
  insertClientSchema,
  insertCampaignSchema,
  insertTaskTypeSchema,
  insertTimeEntrySchema,
  insertCampaignUserSchema
} from "@shared/schema";
import { z } from "zod";

// Middleware to check authentication
function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Não autenticado" });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  setupAuth(app);

  // Economic Groups routes
  app.get('/api/economic-groups', requireAuth, async (req, res) => {
    try {
      const groups = await storage.getEconomicGroups();
      res.json(groups);
    } catch (error) {
      console.error("Error fetching economic groups:", error);
      res.status(500).json({ message: "Failed to fetch economic groups" });
    }
  });

  app.post('/api/economic-groups', requireAuth, async (req: any, res) => {
    try {
      // Check if user has admin permissions
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const data = insertEconomicGroupSchema.parse(req.body);
      const group = await storage.createEconomicGroup(data);
      res.status(201).json(group);
    } catch (error) {
      console.error("Error creating economic group:", error);
      res.status(400).json({ message: "Failed to create economic group" });
    }
  });

  // Clients routes
  app.get('/api/clients', requireAuth, async (req, res) => {
    try {
      const clients = await storage.getClients();
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.post('/api/clients', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const data = insertClientSchema.parse(req.body);
      const client = await storage.createClient(data);
      res.status(201).json(client);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(400).json({ message: "Failed to create client" });
    }
  });

  // Campaigns routes
  app.get('/api/campaigns', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      let campaigns;
      if (user && ['MASTER', 'ADMIN'].includes(user.role)) {
        campaigns = await storage.getCampaigns();
      } else {
        campaigns = await storage.getCampaignsByUser(userId);
      }
      
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ message: "Failed to fetch campaigns" });
    }
  });

  app.post('/api/campaigns', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const data = insertCampaignSchema.parse(req.body);
      const campaign = await storage.createCampaign(data);
      res.status(201).json(campaign);
    } catch (error) {
      console.error("Error creating campaign:", error);
      res.status(400).json({ message: "Failed to create campaign" });
    }
  });

  app.post('/api/campaigns/:id/users', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN', 'GESTOR'].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const campaignId = parseInt(req.params.id);
      const { userId } = insertCampaignUserSchema.parse(req.body);
      
      await storage.addUserToCampaign(campaignId, parseInt(userId.toString()));
      res.status(201).json({ message: "User added to campaign" });
    } catch (error) {
      console.error("Error adding user to campaign:", error);
      res.status(400).json({ message: "Failed to add user to campaign" });
    }
  });

  // Task Types routes
  app.get('/api/task-types', requireAuth, async (req, res) => {
    try {
      const taskTypes = await storage.getTaskTypes();
      res.json(taskTypes);
    } catch (error) {
      console.error("Error fetching task types:", error);
      res.status(500).json({ message: "Failed to fetch task types" });
    }
  });

  app.post('/api/task-types', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const data = insertTaskTypeSchema.parse(req.body);
      const taskType = await storage.createTaskType(data);
      res.status(201).json(taskType);
    } catch (error) {
      console.error("Error creating task type:", error);
      res.status(400).json({ message: "Failed to create task type" });
    }
  });

  // Time Entries routes
  app.get('/api/time-entries', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      const { status, fromDate, toDate } = req.query;

      let entries;
      if (user && ['MASTER', 'ADMIN'].includes(user.role)) {
        // Admins can see all entries
        entries = await storage.getTimeEntries(undefined, status, fromDate, toDate);
      } else if (user && user.role === 'GESTOR') {
        // Managers can see their team's entries
        entries = await storage.getTimeEntries(undefined, status, fromDate, toDate);
        // Filter to only show subordinates' entries
        const subordinates = await storage.getUser(userId);
        // This would need a more complex query in a real implementation
        entries = entries.filter(entry => entry.user.managerId === userId || entry.userId === userId);
      } else {
        // Regular users can only see their own entries
        entries = await storage.getTimeEntriesByUser(userId, fromDate, toDate);
      }

      res.json(entries);
    } catch (error) {
      console.error("Error fetching time entries:", error);
      res.status(500).json({ message: "Failed to fetch time entries" });
    }
  });

  app.post('/api/time-entries', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const data = insertTimeEntrySchema.parse({
        ...req.body,
        userId,
      });

      const timeEntry = await storage.createTimeEntry(data);
      res.status(201).json(timeEntry);
    } catch (error) {
      console.error("Error creating time entry:", error);
      res.status(400).json({ message: "Failed to create time entry" });
    }
  });

  app.patch('/api/time-entries/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const entryId = parseInt(req.params.id);
      const data = req.body;

      // Check if entry belongs to user or user is manager/admin
      const entry = await storage.getTimeEntries();
      const timeEntry = entry.find(e => e.id === entryId);
      
      if (!timeEntry) {
        return res.status(404).json({ message: "Time entry not found" });
      }

      const user = await storage.getUser(userId);
      if (timeEntry.userId !== userId && !user?.isManager && !['MASTER', 'ADMIN'].includes(user?.role || '')) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      // Don't allow editing approved entries
      if (timeEntry.status === 'APPROVED' && !['MASTER', 'ADMIN'].includes(user?.role || '')) {
        return res.status(400).json({ message: "Cannot edit approved entries" });
      }

      const updatedEntry = await storage.updateTimeEntry(entryId, data);
      res.json(updatedEntry);
    } catch (error) {
      console.error("Error updating time entry:", error);
      res.status(400).json({ message: "Failed to update time entry" });
    }
  });

  app.post('/api/time-entries/:id/submit', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const entryId = parseInt(req.params.id);

      const timeEntry = await storage.submitTimeEntry(entryId, userId);
      res.json(timeEntry);
    } catch (error) {
      console.error("Error submitting time entry:", error);
      res.status(400).json({ message: "Failed to submit time entry" });
    }
  });

  // Approval routes
  app.get('/api/approvals/pending', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || !user.isManager && !['MASTER', 'ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const pendingEntries = user.isManager 
        ? await storage.getPendingTimeEntries(userId)
        : await storage.getPendingTimeEntries();
      
      res.json(pendingEntries);
    } catch (error) {
      console.error("Error fetching pending approvals:", error);
      res.status(500).json({ message: "Failed to fetch pending approvals" });
    }
  });

  app.post('/api/time-entries/:id/approve', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const entryId = parseInt(req.params.id);
      const { comment } = req.body;

      const user = await storage.getUser(userId);
      if (!user || !user.isManager && !['MASTER', 'ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const timeEntry = await storage.approveTimeEntry(entryId, userId, comment);
      res.json(timeEntry);
    } catch (error) {
      console.error("Error approving time entry:", error);
      res.status(400).json({ message: "Failed to approve time entry" });
    }
  });

  app.post('/api/time-entries/:id/reject', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const entryId = parseInt(req.params.id);
      const { comment } = req.body;

      const user = await storage.getUser(userId);
      if (!user || !user.isManager && !['MASTER', 'ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const timeEntry = await storage.rejectTimeEntry(entryId, userId, comment);
      res.json(timeEntry);
    } catch (error) {
      console.error("Error rejecting time entry:", error);
      res.status(400).json({ message: "Failed to reject time entry" });
    }
  });

  // Reports routes
  app.get('/api/reports/user-stats', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { fromDate, toDate } = req.query;
      
      const stats = await storage.getUserTimeStats(userId, fromDate, toDate);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ message: "Failed to fetch user stats" });
    }
  });

  app.get('/api/reports/team-stats', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      const { fromDate, toDate } = req.query;
      
      if (!user || !user.isManager && !['MASTER', 'ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const stats = user.isManager 
        ? await storage.getTeamTimeStats(userId, fromDate, toDate)
        : await storage.getTeamTimeStats('', fromDate, toDate); // All team stats for admins
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching team stats:", error);
      res.status(500).json({ message: "Failed to fetch team stats" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
