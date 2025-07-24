import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { 
  insertEconomicGroupSchema,
  insertClientSchema,
  insertCampaignSchema,
  insertTaskTypeSchema,
  insertCampaignTaskSchema,
  insertTimeEntrySchema,
  insertCampaignUserSchema,
  insertUserSchema
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

  app.patch('/api/campaigns/:id', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const campaign = await storage.updateCampaign(id, updates);
      res.json(campaign);
    } catch (error) {
      console.error("Error updating campaign:", error);
      res.status(400).json({ message: "Failed to update campaign" });
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

  app.patch('/api/task-types/:id', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const taskType = await storage.updateTaskType(id, updates);
      res.json(taskType);
    } catch (error) {
      console.error("Error updating task type:", error);
      res.status(400).json({ message: "Failed to update task type" });
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

  app.post('/api/tipos-tarefa', requireAuth, async (req: any, res) => {
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

  app.patch('/api/tipos-tarefa/:id', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const taskTypeId = parseInt(req.params.id);
      const data = req.body;
      const taskType = await storage.updateTaskType(taskTypeId, data);
      res.json(taskType);
    } catch (error) {
      console.error("Error updating task type:", error);
      res.status(400).json({ message: "Failed to update task type" });
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
        ? await storage.getTeamTimeStats(parseInt(userId), fromDate as string, toDate as string)
        : await storage.getTeamTimeStats(0, fromDate as string, toDate as string); // All team stats for admins
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching team stats:", error);
      res.status(500).json({ message: "Failed to fetch team stats" });
    }
  });

  // Admin routes - Sistema de administração completo
  
  // Usuários
  app.get('/api/usuarios', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Erro ao buscar usuários" });
    }
  });

  app.post('/api/usuarios', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const userData = insertUserSchema.parse(req.body);
      const newUser = await storage.createUser(userData);
      res.status(201).json(newUser);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(400).json({ message: "Erro ao criar usuário" });
    }
  });

  app.patch('/api/users/:id', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const updatedUser = await storage.updateUser(id, updates);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(400).json({ message: "Failed to update user" });
    }
  });

  app.patch('/api/usuarios/:id', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const userId = parseInt(req.params.id);
      const userData = req.body;
      
      // Clean up data - convert empty strings to null for date fields
      if (userData.contractStartDate === '') userData.contractStartDate = null;
      if (userData.contractEndDate === '') userData.contractEndDate = null;
      if (userData.contractValue === '') userData.contractValue = null;
      
      const updatedUser = await storage.updateUser(userId, userData);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(400).json({ message: "Erro ao atualizar usuário" });
    }
  });

  app.delete('/api/usuarios/:id', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || user.role !== 'MASTER') {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const userId = parseInt(req.params.id);
      await storage.deleteUser(userId);
      res.json({ message: "Usuário removido com sucesso" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(400).json({ message: "Erro ao remover usuário" });
    }
  });

  // Grupos Econômicos
  app.get('/api/grupos', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const groups = await storage.getEconomicGroups();
      res.json(groups);
    } catch (error) {
      console.error("Error fetching economic groups:", error);
      res.status(500).json({ message: "Erro ao buscar grupos econômicos" });
    }
  });

  app.post('/api/grupos', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const groupData = insertEconomicGroupSchema.parse(req.body);
      const newGroup = await storage.createEconomicGroup(groupData);
      res.status(201).json(newGroup);
    } catch (error) {
      console.error("Error creating economic group:", error);
      res.status(400).json({ message: "Erro ao criar grupo econômico" });
    }
  });

  app.patch('/api/economic-groups/:id', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const group = await storage.updateEconomicGroup(id, updates);
      res.json(group);
    } catch (error) {
      console.error("Error updating economic group:", error);
      res.status(400).json({ message: "Failed to update economic group" });
    }
  });

  app.patch('/api/grupos/:id', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const groupId = parseInt(req.params.id);
      const groupData = req.body;
      const updatedGroup = await storage.updateEconomicGroup(groupId, groupData);
      res.json(updatedGroup);
    } catch (error) {
      console.error("Error updating economic group:", error);
      res.status(400).json({ message: "Erro ao atualizar grupo econômico" });
    }
  });

  app.delete('/api/grupos/:id', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || user.role !== 'MASTER') {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const groupId = parseInt(req.params.id);
      await storage.deleteEconomicGroup(groupId);
      res.json({ message: "Grupo econômico removido com sucesso" });
    } catch (error) {
      console.error("Error deleting economic group:", error);
      res.status(400).json({ message: "Erro ao remover grupo econômico" });
    }
  });

  // Clientes
  app.get('/api/clientes', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const clients = await storage.getClients();
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Erro ao buscar clientes" });
    }
  });

  app.post('/api/clientes', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const clientData = insertClientSchema.parse(req.body);
      const newClient = await storage.createClient(clientData);
      res.status(201).json(newClient);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(400).json({ message: "Erro ao criar cliente" });
    }
  });

  app.patch('/api/clients/:id', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }
      
      const id = parseInt(req.params.id);
      const updates = req.body;
      
      const client = await storage.updateClient(id, updates);
      res.json(client);
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(400).json({ message: "Failed to update client" });
    }
  });

  app.patch('/api/clientes/:id', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const clientId = parseInt(req.params.id);
      const clientData = req.body;
      const updatedClient = await storage.updateClient(clientId, clientData);
      res.json(updatedClient);
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(400).json({ message: "Erro ao atualizar cliente" });
    }
  });

  app.delete('/api/clientes/:id', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || user.role !== 'MASTER') {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const clientId = parseInt(req.params.id);
      await storage.deleteClient(clientId);
      res.json({ message: "Cliente removido com sucesso" });
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(400).json({ message: "Erro ao remover cliente" });
    }
  });

  // Campanhas 
  app.get('/api/campaigns', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN', 'GESTOR'].includes(user.role)) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const campaigns = await storage.getCampaigns();
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ message: "Erro ao buscar campanhas" });
    }
  });

  app.post('/api/campanhas', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const campaignData = insertCampaignSchema.parse(req.body);
      const newCampaign = await storage.createCampaign(campaignData);
      res.status(201).json(newCampaign);
    } catch (error) {
      console.error("Error creating campaign:", error);
      res.status(400).json({ message: "Erro ao criar campanha" });
    }
  });

  app.patch('/api/campanhas/:id', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const campaignId = parseInt(req.params.id);
      const campaignData = req.body;
      const updatedCampaign = await storage.updateCampaign(campaignId, campaignData);
      res.json(updatedCampaign);
    } catch (error) {
      console.error("Error updating campaign:", error);
      res.status(400).json({ message: "Erro ao atualizar campanha" });
    }
  });

  app.delete('/api/campanhas/:id', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || user.role !== 'MASTER') {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const campaignId = parseInt(req.params.id);
      await storage.deleteCampaign(campaignId);
      res.json({ message: "Campanha removida com sucesso" });
    } catch (error) {
      console.error("Error deleting campaign:", error);
      res.status(400).json({ message: "Erro ao remover campanha" });
    }
  });

  // Tipos de Tarefa
  app.get('/api/task-types', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN', 'GESTOR'].includes(user.role)) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const taskTypes = await storage.getTaskTypes();
      res.json(taskTypes);
    } catch (error) {
      console.error("Error fetching task types:", error);
      res.status(500).json({ message: "Erro ao buscar tipos de tarefa" });
    }
  });

  app.post('/api/tipos-tarefa', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const taskTypeData = insertTaskTypeSchema.parse(req.body);
      const newTaskType = await storage.createTaskType(taskTypeData);
      res.status(201).json(newTaskType);
    } catch (error) {
      console.error("Error creating task type:", error);
      res.status(400).json({ message: "Erro ao criar tipo de tarefa" });
    }
  });

  app.patch('/api/tipos-tarefa/:id', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const taskTypeId = parseInt(req.params.id);
      const taskTypeData = req.body;
      const updatedTaskType = await storage.updateTaskType(taskTypeId, taskTypeData);
      res.json(updatedTaskType);
    } catch (error) {
      console.error("Error updating task type:", error);
      res.status(400).json({ message: "Erro ao atualizar tipo de tarefa" });
    }
  });

  app.delete('/api/tipos-tarefa/:id', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || user.role !== 'MASTER') {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const taskTypeId = parseInt(req.params.id);
      await storage.deleteTaskType(taskTypeId);
      res.json({ message: "Tipo de tarefa removido com sucesso" });
    } catch (error) {
      console.error("Error deleting task type:", error);
      res.status(400).json({ message: "Erro ao remover tipo de tarefa" });
    }
  });

  // Configurações do Sistema
  app.get('/api/config', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const config = await storage.getSystemConfig();
      res.json(config);
    } catch (error) {
      console.error("Error fetching system config:", error);
      res.status(500).json({ message: "Erro ao buscar configurações" });
    }
  });

  app.patch('/api/config', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const config = req.body;
      await storage.updateSystemConfig(config);
      res.json({ message: "Configurações atualizadas com sucesso" });
    } catch (error) {
      console.error("Error updating system config:", error);
      res.status(400).json({ message: "Erro ao atualizar configurações" });
    }
  });

  // Campaign Tasks Routes
  app.post("/api/campaign-tasks", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN', 'GESTOR'].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const data = insertCampaignTaskSchema.parse(req.body);
      const newCampaignTask = await storage.createCampaignTask(data);
      res.status(201).json(newCampaignTask);
    } catch (error) {
      console.error("Error creating campaign task:", error);
      res.status(400).json({ message: "Failed to create campaign task" });
    }
  });

  app.get("/api/campaign-tasks", requireAuth, async (req, res) => {
    try {
      const campaignId = req.query.campaignId ? parseInt(req.query.campaignId as string) : undefined;
      const campaignTasks = await storage.getCampaignTasks(campaignId);
      res.json(campaignTasks);
    } catch (error) {
      console.error("Error fetching campaign tasks:", error);
      res.status(500).json({ message: "Failed to fetch campaign tasks" });
    }
  });

  app.patch("/api/campaign-tasks/:id", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN', 'GESTOR'].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const id = parseInt(req.params.id);
      const data = insertCampaignTaskSchema.partial().parse(req.body);
      const updatedCampaignTask = await storage.updateCampaignTask(id, data);
      res.json(updatedCampaignTask);
    } catch (error) {
      console.error("Error updating campaign task:", error);
      res.status(400).json({ message: "Failed to update campaign task" });
    }
  });

  app.delete("/api/campaign-tasks/:id", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN', 'GESTOR'].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const id = parseInt(req.params.id);
      await storage.deleteCampaignTask(id);
      res.json({ message: "Campaign task deleted successfully" });
    } catch (error) {
      console.error("Error deleting campaign task:", error);
      res.status(500).json({ message: "Failed to delete campaign task" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
