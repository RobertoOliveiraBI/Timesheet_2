import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "./db";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { 
  insertEconomicGroupSchema,
  insertClientSchema,
  insertCampaignSchema,
  insertTaskTypeSchema,
  insertCampaignTaskSchema,
  insertTimeEntrySchema,
  insertTimeEntryCommentSchema,
  insertCampaignUserSchema,
  insertUserSchema,
  insertDepartmentSchema,
  insertCostCenterSchema,
  insertCostCategorySchema,
  insertCampaignCostSchema,
  clients as clientsTable,
  campaigns as campaignsTable,
  campaignTasks as campaignTasksTable,
  campaignUsers as campaignUsersTable,
  timeEntries,
  timeEntryComments,
  departments,
  costCenters,
  costCategories,
  campaignCosts,
} from "@shared/schema";
import { z } from "zod";
import { eq, and, asc, desc, gte, lte, inArray, sql } from "drizzle-orm";
import { format } from "date-fns";

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
  app.get('/api/clientes', requireAuth, async (req: any, res) => {
    try {
      const clients = await storage.getClients();
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.post('/api/clientes', requireAuth, async (req: any, res) => {
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

  // Get time entries for current user only (used in monthly history)
  app.get('/api/time-entries/user', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { fromDate, toDate } = req.query;
      
      // Always return only current user's entries
      const entries = await storage.getTimeEntriesByUser(userId, fromDate, toDate);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching user time entries:", error);
      res.status(500).json({ message: "Failed to fetch user time entries" });
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

      // Don't allow editing approved entries unless user is GESTOR, ADMIN, or MASTER
      if (timeEntry.status === 'APROVADO' && !['MASTER', 'ADMIN', 'GESTOR'].includes(user?.role || '')) {
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
      const { date } = req.query; // Get date filter from query params
      
      if (!user || !user.isManager && !['MASTER', 'ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      let whereCondition;
      if (date) {
        // Filter by specific date
        whereCondition = and(
          eq(timeEntries.status, "VALIDACAO"),
          eq(timeEntries.date, date as string)
        );
      } else {
        // No date filter, show all pending
        whereCondition = eq(timeEntries.status, "VALIDACAO");
      }

      let pendingEntries;
      if (user.role === 'GESTOR' && user.isManager) {
        // Gestor sees only their team entries
        const entries = await db.query.timeEntries.findMany({
          where: whereCondition,
          with: {
            user: true,
            campaign: {
              with: {
                client: true,
              },
            },
            campaignTask: {
              with: {
                taskType: true,
              },
            },
          },
        });
        
        // Filter to only managed users
        pendingEntries = entries.filter(entry => entry.user.managerId === user.id);
      } else {
        // MASTER and ADMIN see all entries
        pendingEntries = await db.query.timeEntries.findMany({
          where: whereCondition,
          with: {
            user: true,
            campaign: {
              with: {
                client: true,
              },
            },
            campaignTask: {
              with: {
                taskType: true,
              },
            },
          },
        });
      }
      
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

  // Validation route for managers
  app.get('/api/time-entries/validation', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN', 'GESTOR'].includes(user.role)) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      // Buscar entradas em VALIDACAO que o gestor pode gerenciar
      let entries;
      if (user.role === 'GESTOR' && user.isManager) {
        // Gestor vê apenas entradas de sua equipe
        entries = await db.query.timeEntries.findMany({
          where: and(
            eq(timeEntries.status, "VALIDACAO")
          ),
          with: {
            user: true,
            campaign: {
              with: {
                client: true,
              },
            },
            campaignTask: {
              with: {
                taskType: true,
              },
            },
          },
        });
        
        // Filtrar apenas colaboradores gerenciados por este gestor
        entries = entries.filter(entry => entry.user.managerId === user.id);
      } else {
        // MASTER e ADMIN veem todas as entradas
        entries = await db.query.timeEntries.findMany({
          where: eq(timeEntries.status, "VALIDACAO"),
          with: {
            user: true,
            campaign: {
              with: {
                client: true,
              },
            },
            campaignTask: {
              with: {
                taskType: true,
              },
            },
          },
        });
      }

      res.json(entries);
    } catch (error) {
      console.error("Error fetching validation entries:", error);
      res.status(500).json({ message: "Failed to fetch validation entries" });
    }
  });

  // Validation count for badge
  app.get('/api/time-entries/validation-count', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN', 'GESTOR'].includes(user.role)) {
        return res.json({ count: 0 });
      }

      let count;
      if (user.role === 'GESTOR' && user.isManager) {
        // Gestor conta apenas entradas de sua equipe
        const entries = await db.query.timeEntries.findMany({
          where: eq(timeEntries.status, "VALIDACAO"),
          with: {
            user: true,
          },
        });
        
        count = entries.filter(entry => entry.user.managerId === user.id).length;
      } else {
        // MASTER e ADMIN contam todas as entradas
        const entries = await db.query.timeEntries.findMany({
          where: eq(timeEntries.status, "VALIDACAO"),
        });
        count = entries.length;
      }

      res.json({ count });
    } catch (error) {
      console.error("Error counting validation entries:", error);
      res.json({ count: 0 });
    }
  });

  // Get approved time entries (manager/admin only)
  app.get('/api/time-entries/approved', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN', 'GESTOR'].includes(user.role)) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const { userId, fromDate, toDate, page, pageSize } = req.query;

      // Construir condições de filtro
      const conditions = [eq(timeEntries.status, "APROVADO")];
      
      // Filtro por usuário específico
      if (userId && userId !== "all") {
        conditions.push(eq(timeEntries.userId, parseInt(userId)));
      }
      
      // Filtro por data
      if (fromDate) {
        conditions.push(gte(timeEntries.date, fromDate));
      }
      if (toDate) {
        conditions.push(lte(timeEntries.date, toDate));
      }

      // Buscar entradas APROVADAS com filtros aplicados
      let entries = await db.query.timeEntries.findMany({
        where: and(...conditions),
        with: {
          user: true,
          campaign: {
            with: {
              client: true,
            },
          },
          campaignTask: {
            with: {
              taskType: true,
            },
          },
        },
        orderBy: [desc(timeEntries.reviewedAt), desc(timeEntries.date)],
      });

      // Para GESTOR, filtrar apenas membros da equipe
      if (user.role === 'GESTOR' && user.isManager) {
        entries = entries.filter(entry => entry.user.managerId === user.id);
      }

      res.json(entries);
    } catch (error) {
      console.error("Error fetching approved entries:", error);
      res.status(500).json({ message: "Failed to fetch approved entries" });
    }
  });

  // Delete approved time entry (manager/admin only)

  app.delete('/api/time-entries/approved/:id', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN', 'GESTOR'].includes(user.role)) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const entryId = parseInt(req.params.id);

      // Verificar se a entrada existe e está aprovada
      const entry = await storage.getTimeEntry(entryId);
      if (!entry) {
        return res.status(404).json({ message: "Lançamento não encontrado" });
      }

      if (entry.status !== 'APROVADO') {
        return res.status(400).json({ message: "Apenas lançamentos aprovados podem ser excluídos" });
      }

      // Para GESTOR, verificar se é da sua equipe
      if (user.role === 'GESTOR' && user.isManager) {
        const entryUser = await storage.getUser(entry.userId);
        if (!entryUser || entryUser.managerId !== user.id) {
          return res.status(403).json({ message: "Você só pode excluir lançamentos da sua equipe" });
        }
      }

      await storage.deleteTimeEntry(entryId);
      res.json({ message: "Lançamento excluído com sucesso" });
    } catch (error) {
      console.error("Error deleting approved entry:", error);
      res.status(500).json({ message: "Failed to delete approved entry" });
    }
  });

  // Change approved entry status to SALVO (manager/admin only)
  app.patch('/api/time-entries/approved/:id/return-to-saved', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN', 'GESTOR'].includes(user.role)) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const entryId = parseInt(req.params.id);
      const { comment } = req.body;

      // Verificar se a entrada existe e está aprovada
      const entry = await storage.getTimeEntry(entryId);
      if (!entry) {
        return res.status(404).json({ message: "Lançamento não encontrado" });
      }

      if (entry.status !== 'APROVADO') {
        return res.status(400).json({ message: "Apenas lançamentos aprovados podem ser retornados para salvo" });
      }

      // Para GESTOR, verificar se é da sua equipe
      if (user.role === 'GESTOR' && user.isManager) {
        const entryUser = await storage.getUser(entry.userId);
        if (!entryUser || entryUser.managerId !== user.id) {
          return res.status(403).json({ message: "Você só pode alterar lançamentos da sua equipe" });
        }
      }

      const updatedEntry = await storage.returnApprovedToSaved(entryId, user.id, comment);
      res.json(updatedEntry);
    } catch (error) {
      console.error("Error returning approved entry to saved:", error);
      res.status(500).json({ message: "Failed to return entry to saved status" });
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

  // Alias em inglês para compatibilidade - retorna todos os usuários
  app.get('/api/users', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN', 'GESTOR'].includes(user.role)) {
        return res.status(403).json({ message: "Acesso negado" });
      }
      
      const allUsers = await storage.getAllUsers();
      res.json(allUsers);
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
      
      // Hash the password before creating the user
      if (userData.password) {
        const bcrypt = require('bcryptjs');
        userData.password = await bcrypt.hash(userData.password, 10);
      }
      
      const newUser = await storage.createUser(userData);
      
      // Return user data without password
      const { password: _, ...userWithoutPassword } = newUser;
      res.status(201).json(userWithoutPassword);
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
      
      // Hash password if being updated
      if (updates.password) {
        const bcrypt = require('bcryptjs');
        updates.password = await bcrypt.hash(updates.password, 10);
      }
      
      const updatedUser = await storage.updateUser(id, updates);
      
      // Return user data without password
      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(400).json({ message: "Failed to update user" });
    }
  });

  app.put('/api/usuarios/:id', requireAuth, async (req: any, res) => {
    try {
      const currentUserId = req.user.id;
      const targetUserId = parseInt(req.params.id);
      const updateData = req.body;

      const currentUser = await storage.getUser(currentUserId);
      
      // Users can only update their own profile, unless they are admin/master
      if (currentUserId !== targetUserId && !['MASTER', 'ADMIN'].includes(currentUser?.role || '')) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      // Non-admin users cannot change role or sensitive fields
      if (currentUserId === targetUserId && !['MASTER', 'ADMIN'].includes(currentUser?.role || '')) {
        delete updateData.role;
        delete updateData.isManager;
        delete updateData.managerId;
        delete updateData.isActive;
      }

      // Clean up data - convert empty strings to null for date and numeric fields
      if (updateData.contractStartDate === '') updateData.contractStartDate = null;
      if (updateData.contractEndDate === '') updateData.contractEndDate = null;
      if (updateData.contractValue === '') updateData.contractValue = null;
      if (updateData.monthlyCost === '') updateData.monthlyCost = null;
      
      // Convert string IDs to integers or null
      if (updateData.departmentId === '' || updateData.departmentId === undefined) updateData.departmentId = null;
      if (updateData.costCenterId === '' || updateData.costCenterId === undefined) updateData.costCenterId = null;
      if (updateData.managerId === '' || updateData.managerId === undefined) updateData.managerId = null;

      // Hash password if being updated
      if (updateData.password) {
        const bcrypt = require('bcryptjs');
        updateData.password = await bcrypt.hash(updateData.password, 10);
      }

      const updatedUser = await storage.updateUser(targetUserId, updateData);
      
      // Return user data without password
      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(400).json({ message: "Erro ao atualizar usuário" });
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
      
      // Clean up data - convert empty strings to null for date and numeric fields
      if (userData.contractStartDate === '') userData.contractStartDate = null;
      if (userData.contractEndDate === '') userData.contractEndDate = null;
      if (userData.contractValue === '') userData.contractValue = null;
      if (userData.monthlyCost === '') userData.monthlyCost = null;
      
      // Convert string IDs to integers or null
      if (userData.departmentId === '' || userData.departmentId === undefined) userData.departmentId = null;
      if (userData.costCenterId === '' || userData.costCenterId === undefined) userData.costCenterId = null;
      if (userData.managerId === '' || userData.managerId === undefined) userData.managerId = null;
      
      // Hash password if being updated
      if (userData.password) {
        const bcrypt = require('bcryptjs');
        userData.password = await bcrypt.hash(userData.password, 10);
      }
      
      const updatedUser = await storage.updateUser(userId, userData);
      
      // Return user data without password
      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
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

  // Atualizar usuário por nome e sobrenome (para dados de razão social e CNPJ)
  app.patch('/api/usuarios/by-name', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Acesso negado - apenas MASTER e ADMIN podem atualizar usuários" });
      }

      const { firstName, lastName, companyName, cnpj } = req.body;

      if (!firstName || !lastName) {
        return res.status(400).json({ message: "Nome e sobrenome são obrigatórios" });
      }

      // Buscar usuário por nome e sobrenome
      const targetUser = await storage.getUserByName(firstName, lastName);
      if (!targetUser) {
        return res.status(404).json({ message: `Usuário ${firstName} ${lastName} não encontrado` });
      }

      // Preparar dados para atualização
      const updateData: any = {};
      if (companyName !== undefined) updateData.companyName = companyName || null;
      if (cnpj !== undefined) updateData.cnpj = cnpj || null;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "Nenhum dado para atualizar fornecido" });
      }

      const updatedUser = await storage.updateUser(targetUser.id, updateData);
      
      // Return user data without password
      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json({ 
        message: "Usuário atualizado com sucesso",
        user: userWithoutPassword 
      });
    } catch (error) {
      console.error("Error updating user by name:", error);
      res.status(400).json({ message: "Erro ao atualizar usuário" });
    }
  });

  // Atualizar múltiplos usuários em lote (para processamento de planilhas)
  app.post('/api/usuarios/batch-update', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Acesso negado - apenas MASTER e ADMIN podem atualizar usuários" });
      }

      const { users: userUpdates } = req.body;

      if (!Array.isArray(userUpdates) || userUpdates.length === 0) {
        return res.status(400).json({ message: "Lista de usuários é obrigatória" });
      }

      const results = [];
      const errors = [];

      for (const userUpdate of userUpdates) {
        try {
          const { firstName, lastName, companyName, cnpj } = userUpdate;

          if (!firstName || !lastName) {
            errors.push({ 
              user: userUpdate, 
              error: "Nome e sobrenome são obrigatórios" 
            });
            continue;
          }

          // Buscar usuário por nome e sobrenome
          const targetUser = await storage.getUserByName(firstName, lastName);
          if (!targetUser) {
            errors.push({ 
              user: userUpdate, 
              error: `Usuário ${firstName} ${lastName} não encontrado` 
            });
            continue;
          }

          // Preparar dados para atualização
          const updateData: any = {};
          if (companyName !== undefined) updateData.companyName = companyName || null;
          if (cnpj !== undefined) updateData.cnpj = cnpj || null;

          if (Object.keys(updateData).length === 0) {
            errors.push({ 
              user: userUpdate, 
              error: "Nenhum dado para atualizar fornecido" 
            });
            continue;
          }

          const updatedUser = await storage.updateUser(targetUser.id, updateData);
          const { password: _, ...userWithoutPassword } = updatedUser;
          
          results.push({
            firstName,
            lastName,
            updated: userWithoutPassword
          });

        } catch (error) {
          errors.push({ 
            user: userUpdate, 
            error: error instanceof Error ? error.message : "Erro desconhecido" 
          });
        }
      }

      res.json({
        message: `Processamento concluído. ${results.length} usuários atualizados, ${errors.length} erros`,
        success: results,
        errors: errors
      });

    } catch (error) {
      console.error("Error in batch update:", error);
      res.status(400).json({ message: "Erro ao processar atualização em lote" });
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

  // Clientes - Todos os usuários autenticados podem acessar
  app.get('/api/clientes', requireAuth, async (req: any, res) => {
    try {
      console.log('API /api/clientes chamada - user:', req.user?.id);
      
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(403).json({ message: "Usuário não encontrado" });
      }
      
      console.log('User role:', user.role);
      
      // Todos os usuários autenticados podem ver clientes (necessário para timesheet)
      const clients = await db.select({
        id: clientsTable.id,
        companyName: clientsTable.companyName,
        economicGroupId: clientsTable.economicGroupId
      }).from(clientsTable).where(eq(clientsTable.isActive, true));
      
      console.log('Clientes encontrados:', clients.length);
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Erro ao buscar clientes", error: error instanceof Error ? error.message : "Unknown error" });
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
      
      // Verifica se existem horas lançadas antes de tentar deletar
      const timeEntriesCount = await db
        .select({ count: sql`count(*)` })
        .from(timeEntries)
        .innerJoin(campaignsTable, eq(timeEntries.campaignId, campaignsTable.id))
        .where(eq(campaignsTable.clientId, clientId));
      
      const hasTimeEntries = Number(timeEntriesCount[0].count) > 0;
      
      await storage.deleteClient(clientId);
      
      if (hasTimeEntries) {
        res.json({ message: "Cliente desativado com sucesso (possui horas lançadas)" });
      } else {
        res.json({ message: "Cliente removido com sucesso" });
      }
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(400).json({ message: "Erro ao processar cliente" });
    }
  });

  // Campanhas com controle de acesso por usuário
  app.get('/api/campaigns', requireAuth, async (req: any, res) => {
    try {
      console.log('API /api/campaigns chamada - user:', req.user?.id);
      
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(403).json({ message: "Usuário não encontrado" });
      }
      
      console.log('User role:', user.role);
      
      let campaigns;
      if (['MASTER', 'ADMIN', 'GESTOR'].includes(user.role)) {
        // Admins, masters e gestores veem todas as campanhas ativas
        campaigns = await db.select().from(campaignsTable).where(eq(campaignsTable.isActive, true));
      } else {
        // Colaboradores veem apenas campanhas às quais têm acesso
        campaigns = await db.select({
          id: campaignsTable.id,
          name: campaignsTable.name,
          description: campaignsTable.description,
          contractStartDate: campaignsTable.contractStartDate,
          contractEndDate: campaignsTable.contractEndDate,
          contractValue: campaignsTable.contractValue,
          clientId: campaignsTable.clientId,
          isActive: campaignsTable.isActive,
          createdAt: campaignsTable.createdAt,
        })
        .from(campaignsTable)
        .innerJoin(campaignUsersTable, eq(campaignUsersTable.campaignId, campaignsTable.id))
        .where(and(
          eq(campaignsTable.isActive, true),
          eq(campaignUsersTable.userId, user.id)
        ));
      }
      
      console.log('Campanhas encontradas:', campaigns.length);
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ message: "Erro ao buscar campanhas", error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Alias para /api/campaigns em português
  app.get('/api/campanhas', requireAuth, async (req: any, res) => {
    try {
      console.log('API /api/campanhas chamada - user:', req.user?.id);
      const { client_id } = req.query;
      
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(403).json({ message: "Usuário não encontrado" });
      }
      
      console.log('User role:', user.role, 'Client filter:', client_id);
      
      let campaigns;
      if (['MASTER', 'ADMIN', 'GESTOR'].includes(user.role)) {
        // Admins, masters e gestores veem todas as campanhas ativas
        let whereConditions = [eq(campaignsTable.isActive, true)];
        
        // Se há filtro por cliente, aplicar
        if (client_id) {
          whereConditions.push(eq(campaignsTable.clientId, parseInt(client_id)));
        }
        
        campaigns = await db.select().from(campaignsTable).where(and(...whereConditions));
      } else {
        // Colaboradores veem apenas campanhas às quais têm acesso
        let whereConditions = [
          eq(campaignsTable.isActive, true),
          eq(campaignUsersTable.userId, user.id)
        ];
        
        // Se há filtro por cliente, aplicar
        if (client_id) {
          whereConditions.push(eq(campaignsTable.clientId, parseInt(client_id)));
        }
        
        campaigns = await db.select({
          id: campaignsTable.id,
          name: campaignsTable.name,
          description: campaignsTable.description,
          contractStartDate: campaignsTable.contractStartDate,
          contractEndDate: campaignsTable.contractEndDate,
          contractValue: campaignsTable.contractValue,
          clientId: campaignsTable.clientId,
          isActive: campaignsTable.isActive,
          createdAt: campaignsTable.createdAt,
        })
        .from(campaignsTable)
        .innerJoin(campaignUsersTable, eq(campaignUsersTable.campaignId, campaignsTable.id))
        .where(and(...whereConditions));
      }
      
      console.log('Campanhas encontradas:', campaigns.length);
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ message: "Erro ao buscar campanhas", error: error instanceof Error ? error.message : "Unknown error" });
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

  // Gestão de acesso de colaboradores às campanhas
  app.get('/api/campanhas/:id/colaboradores', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN', 'GESTOR'].includes(user.role)) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const campaignId = parseInt(req.params.id);
      const collaborators = await db.query.campaignUsers.findMany({
        where: eq(campaignUsersTable.campaignId, campaignId),
        with: {
          user: true,
        },
      });

      res.json(collaborators.map(cu => cu.user));
    } catch (error) {
      console.error("Error fetching campaign collaborators:", error);
      res.status(500).json({ message: "Erro ao buscar colaboradores da campanha" });
    }
  });

  app.post('/api/campanhas/:id/colaboradores', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN', 'GESTOR'].includes(user.role)) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const campaignId = parseInt(req.params.id);
      const { userId } = req.body;

      // Verificar se já existe
      const existing = await db.query.campaignUsers.findFirst({
        where: and(
          eq(campaignUsersTable.campaignId, campaignId),
          eq(campaignUsersTable.userId, parseInt(userId))
        ),
      });

      if (existing) {
        return res.status(400).json({ message: "Colaborador já tem acesso a esta campanha" });
      }

      await storage.addUserToCampaign(campaignId, parseInt(userId));
      res.status(201).json({ message: "Colaborador adicionado à campanha com sucesso" });
    } catch (error) {
      console.error("Error adding collaborator to campaign:", error);
      res.status(400).json({ message: "Erro ao adicionar colaborador à campanha" });
    }
  });

  app.delete('/api/campanhas/:campaignId/colaboradores/:userId', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN', 'GESTOR'].includes(user.role)) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const campaignId = parseInt(req.params.campaignId);
      const userId = parseInt(req.params.userId);

      await db.delete(campaignUsersTable)
        .where(and(
          eq(campaignUsersTable.campaignId, campaignId),
          eq(campaignUsersTable.userId, userId)
        ));

      res.json({ message: "Colaborador removido da campanha com sucesso" });
    } catch (error) {
      console.error("Error removing collaborator from campaign:", error);
      res.status(400).json({ message: "Erro ao remover colaborador da campanha" });
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

  // Endpoints específicos para Timesheet - hierarquia Cliente → Campanha → Tarefa
  
  // Buscar campanhas por cliente
  app.get("/api/clientes/:clientId/campanhas", requireAuth, async (req: any, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(403).json({ message: "Usuário não encontrado" });
      }
      
      let campaigns;
      if (['MASTER', 'ADMIN'].includes(user.role)) {
        // Admins veem todas as campanhas do cliente
        campaigns = await db.select({
          id: campaignsTable.id,
          name: campaignsTable.name,
          description: campaignsTable.description,
          clientId: campaignsTable.clientId,
          isActive: campaignsTable.isActive
        })
        .from(campaignsTable)
        .where(and(
          eq(campaignsTable.clientId, clientId),
          eq(campaignsTable.isActive, true)
        ))
        .orderBy(asc(campaignsTable.name));
      } else {
        // Colaboradores só veem campanhas às quais têm acesso
        campaigns = await storage.getCampaignsByUser(userId);
        campaigns = campaigns.filter(campaign => campaign.clientId === clientId);
      }
      
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching campaigns by client:", error);
      res.status(500).json({ message: "Erro ao buscar campanhas do cliente" });
    }
  });

  // Buscar tarefas por campanha
  app.get("/api/campanhas/:campaignId/tarefas", requireAuth, async (req: any, res) => {
    try {
      const campaignId = parseInt(req.params.campaignId);
      
      const campaignTasks = await db.select({
        id: campaignTasksTable.id,
        campaignId: campaignTasksTable.campaignId,
        taskTypeId: campaignTasksTable.taskTypeId,
        description: campaignTasksTable.description,
        isActive: campaignTasksTable.isActive
      })
      .from(campaignTasksTable)
      .where(and(
        eq(campaignTasksTable.campaignId, campaignId),
        eq(campaignTasksTable.isActive, true)
      ))
      .orderBy(asc(campaignTasksTable.description));
      
      res.json(campaignTasks);
    } catch (error) {
      console.error("Error fetching tasks by campaign:", error);
      res.status(500).json({ message: "Erro ao buscar tarefas da campanha" });
    }
  });

  // Buscar entradas de timesheet por semana
  app.get("/api/timesheet/semana", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { inicioSemana, fimSemana } = req.query;
      
      if (!inicioSemana || !fimSemana) {
        return res.status(400).json({ 
          message: "Parâmetros inicioSemana e fimSemana são obrigatórios" 
        });
      }

      const entries = await storage.getTimeEntriesByUser(userId, inicioSemana, fimSemana);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching weekly timesheet:", error);
      res.status(500).json({ message: "Erro ao buscar timesheet da semana" });
    }
  });

  // Excluir entrada de timesheet
  app.delete("/api/time-entries/:id", requireAuth, async (req: any, res) => {
    try {
      const entryId = parseInt(req.params.id);
      const userId = req.user.id;

      // Verificar se a entrada existe e pertence ao usuário
      const entries = await storage.getTimeEntries(userId);
      const entry = entries.find(e => e.id === entryId);
      
      if (!entry) {
        return res.status(404).json({ message: "Entrada não encontrada" });
      }

      // Verificar se o usuário pode excluir esta entrada
      if (entry.userId !== userId) {
        const user = await storage.getUser(userId);
        if (!user || !['MASTER', 'ADMIN', 'GESTOR'].includes(user.role)) {
          return res.status(403).json({ message: "Acesso negado" });
        }
      }

      // Verificar se a entrada está validada (status APROVADO)
      if (entry.status === 'APROVADO') {
        return res.status(400).json({ 
          message: "Entradas validadas não podem ser excluídas" 
        });
      }

      await storage.deleteTimeEntry(entryId);
      res.json({ message: "Entrada excluída com sucesso" });
    } catch (error) {
      console.error("Error deleting time entry:", error);
      res.status(500).json({ message: "Erro ao excluir entrada" });
    }
  });

  // Deletar entradas de timesheet por período e tarefa
  app.delete("/api/timesheet/limpar-semana", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { inicioSemana, fimSemana, campaignTaskId } = req.body;
      
      if (!inicioSemana || !fimSemana || !campaignTaskId) {
        return res.status(400).json({ 
          message: "Parâmetros inicioSemana, fimSemana e campaignTaskId são obrigatórios" 
        });
      }

      await db.delete(timeEntries)
        .where(and(
          eq(timeEntries.userId, userId),
          eq(timeEntries.campaignTaskId, parseInt(campaignTaskId)),
          gte(timeEntries.date, inicioSemana),
          lte(timeEntries.date, fimSemana)
        ));

      res.json({ message: "Entradas removidas com sucesso" });
    } catch (error) {
      console.error("Error clearing weekly entries:", error);
      res.status(500).json({ message: "Erro ao limpar entradas da semana" });
    }
  });

  // Endpoint para submissão de entrada de horas individual
  app.post("/api/timesheet/entrada-horas", requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { clientId, campaignId, campaignTaskId, date, hours, description, status = "RASCUNHO" } = req.body;
      
      // Validações
      if (!clientId || !campaignId || !campaignTaskId || !date || !hours) {
        return res.status(400).json({ 
          message: "Todos os campos obrigatórios devem ser preenchidos",
          required: ["clientId", "campaignId", "campaignTaskId", "date", "hours"]
        });
      }
      
      // Validar se a tarefa pertence à campanha especificada
      const taskExists = await db.select()
        .from(campaignTasksTable)
        .where(and(
          eq(campaignTasksTable.id, parseInt(campaignTaskId)),
          eq(campaignTasksTable.campaignId, parseInt(campaignId)),
          eq(campaignTasksTable.isActive, true)
        ))
        .limit(1);
        
      if (taskExists.length === 0) {
        return res.status(400).json({ message: "Tarefa não encontrada ou inválida para esta campanha" });
      }
      
      // Validar se a campanha pertence ao cliente especificado
      const campaignExists = await db.select()
        .from(campaignsTable)
        .where(and(
          eq(campaignsTable.id, parseInt(campaignId)),
          eq(campaignsTable.clientId, parseInt(clientId)),
          eq(campaignsTable.isActive, true)
        ))
        .limit(1);
        
      if (campaignExists.length === 0) {
        return res.status(400).json({ message: "Campanha não encontrada ou inválida para este cliente" });
      }
      
      const data = insertTimeEntrySchema.parse({
        userId,
        date,
        campaignId: parseInt(campaignId),
        campaignTaskId: parseInt(campaignTaskId),
        hours: hours.toString(),
        description: description || null,
        status
      });

      const timeEntry = await storage.createTimeEntry(data);
      res.status(201).json(timeEntry);
    } catch (error) {
      console.error("Error creating time entry:", error);
      res.status(400).json({ message: "Erro ao criar entrada de horas" });
    }
  });

  // Campaign Tasks Routes (mantidos para admin)
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

  app.get("/api/campaign-tasks", requireAuth, async (req: any, res) => {
    try {      
      const user = await storage.getUser(req.user?.id);
      if (!user) {
        return res.status(403).json({ message: "Usuário não encontrado" });
      }
      
      // Buscar tarefas com informações de campanha e cliente para melhor visualização
      const campaignTasks = await db.query.campaignTasks.findMany({
        where: eq(campaignTasksTable.isActive, true),
        with: {
          campaign: {
            with: {
              client: true,
            },
          },
          taskType: true,
        },
      });
      
      res.json(campaignTasks);
    } catch (error) {
      console.error("Error fetching campaign tasks:", error);
      res.status(500).json({ message: "Erro ao buscar tarefas", error: error instanceof Error ? error.message : "Unknown error" });
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

  // Departments routes
  app.get("/api/departments", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const departments = await storage.getDepartments();
      res.json(departments);
    } catch (error) {
      console.error("Error fetching departments:", error);
      res.status(500).json({ message: "Failed to fetch departments" });
    }
  });

  app.post("/api/departments", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const data = insertDepartmentSchema.parse(req.body);
      const department = await storage.createDepartment(data);
      res.status(201).json(department);
    } catch (error) {
      console.error("Error creating department:", error);
      res.status(400).json({ message: "Failed to create department" });
    }
  });

  app.patch("/api/departments/:id", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const id = parseInt(req.params.id);
      const data = insertDepartmentSchema.partial().parse(req.body);
      const updatedDepartment = await storage.updateDepartment(id, data);
      res.json(updatedDepartment);
    } catch (error) {
      console.error("Error updating department:", error);
      res.status(400).json({ message: "Failed to update department" });
    }
  });

  app.delete("/api/departments/:id", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const id = parseInt(req.params.id);
      await storage.deleteDepartment(id);
      res.json({ message: "Department deleted successfully" });
    } catch (error) {
      console.error("Error deleting department:", error);
      res.status(500).json({ message: "Failed to delete department" });
    }
  });

  // Cost Centers routes
  app.get("/api/cost-centers", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const costCenters = await storage.getCostCenters();
      res.json(costCenters);
    } catch (error) {
      console.error("Error fetching cost centers:", error);
      res.status(500).json({ message: "Failed to fetch cost centers" });
    }
  });

  app.post("/api/cost-centers", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const data = insertCostCenterSchema.parse(req.body);
      const costCenter = await storage.createCostCenter(data);
      res.status(201).json(costCenter);
    } catch (error) {
      console.error("Error creating cost center:", error);
      res.status(400).json({ message: "Failed to create cost center" });
    }
  });

  app.patch("/api/cost-centers/:id", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const id = parseInt(req.params.id);
      const data = insertCostCenterSchema.partial().parse(req.body);
      const updatedCostCenter = await storage.updateCostCenter(id, data);
      res.json(updatedCostCenter);
    } catch (error) {
      console.error("Error updating cost center:", error);
      res.status(400).json({ message: "Failed to update cost center" });
    }
  });

  app.delete("/api/cost-centers/:id", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const id = parseInt(req.params.id);
      await storage.deleteCostCenter(id);
      res.json({ message: "Cost center deleted successfully" });
    } catch (error) {
      console.error("Error deleting cost center:", error);
      res.status(500).json({ message: "Failed to delete cost center" });
    }
  });

  // Cost Categories routes  
  app.get("/api/cost-categories", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN', 'GESTOR'].includes(user.role)) {
        return res.status(403).json({ message: "Acesso negado. Função insuficiente." });
      }

      const categories = await storage.getCostCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching cost categories:", error);
      res.status(500).json({ message: "Erro ao buscar categorias de custo" });
    }
  });

  app.post("/api/cost-categories", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Acesso negado. Apenas administradores podem criar categorias." });
      }

      const data = insertCostCategorySchema.parse(req.body);
      const category = await storage.createCostCategory(data);
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating cost category:", error);
      if (error instanceof Error && error.message.includes("duplicate")) {
        res.status(409).json({ message: "Já existe uma categoria com este nome" });
      } else {
        res.status(400).json({ message: "Erro ao criar categoria de custo" });
      }
    }
  });

  app.patch("/api/cost-categories/:id", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Acesso negado. Apenas administradores podem editar categorias." });
      }

      const id = parseInt(req.params.id);
      const data = insertCostCategorySchema.partial().parse(req.body);
      const updatedCategory = await storage.updateCostCategory(id, data);
      res.json(updatedCategory);
    } catch (error) {
      console.error("Error updating cost category:", error);
      if (error instanceof Error && error.message.includes("duplicate")) {
        res.status(409).json({ message: "Já existe uma categoria com este nome" });
      } else {
        res.status(400).json({ message: "Erro ao atualizar categoria de custo" });
      }
    }
  });

  app.delete("/api/cost-categories/:id", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Acesso negado. Apenas administradores podem excluir categorias." });
      }

      const id = parseInt(req.params.id);
      await storage.deleteCostCategory(id);
      res.json({ message: "Categoria de custo removida com sucesso" });
    } catch (error) {
      console.error("Error deleting cost category:", error);
      res.status(500).json({ message: "Erro ao remover categoria de custo" });
    }
  });

  // Campaign Costs routes
  app.get("/api/campaign-costs", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN', 'GESTOR'].includes(user.role)) {
        return res.status(403).json({ message: "Acesso negado. Função insuficiente." });
      }

      const { campaignId, referenceMonth, status, userId } = req.query;
      
      const filters: any = {};
      if (campaignId) filters.campaignId = parseInt(campaignId);
      if (referenceMonth) filters.referenceMonth = referenceMonth;
      if (status) filters.status = status;
      if (userId) filters.userId = parseInt(userId);

      const costs = await storage.getCampaignCosts(filters);
      res.json(costs);
    } catch (error) {
      console.error("Error fetching campaign costs:", error);
      res.status(500).json({ message: "Erro ao buscar custos de campanha" });
    }
  });

  app.post("/api/campaign-costs", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN', 'GESTOR'].includes(user.role)) {
        return res.status(403).json({ message: "Acesso negado. Função insuficiente." });
      }

      // Validar dados de entrada e adicionar userId automaticamente
      const data = insertCampaignCostSchema.parse({
        ...req.body,
        userId: req.user.id,
      });

      const cost = await storage.createCampaignCost(data);
      res.status(201).json(cost);
    } catch (error) {
      console.error("Error creating campaign cost:", error);
      if (error instanceof Error && error.message.includes("Já existe")) {
        res.status(409).json({ message: error.message });
      } else {
        res.status(400).json({ message: "Erro ao criar custo de campanha" });
      }
    }
  });

  app.patch("/api/campaign-costs/:id", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN', 'GESTOR'].includes(user.role)) {
        return res.status(403).json({ message: "Acesso negado. Função insuficiente." });
      }

      const id = parseInt(req.params.id);
      
      // Validar se o custo existe e se o usuário pode editá-lo
      const existingCosts = await storage.getCampaignCosts();
      const existingCost = existingCosts.find(c => c.id === id);
      
      if (!existingCost) {
        return res.status(404).json({ message: "Custo não encontrado" });
      }

      // Apenas o criador ou MASTER/ADMIN podem editar
      if (existingCost.userId !== req.user.id && !['MASTER', 'ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Apenas o autor ou administradores podem editar este custo" });
      }

      const data = insertCampaignCostSchema.partial().parse(req.body);
      const updatedCost = await storage.updateCampaignCost(id, data);
      res.json(updatedCost);
    } catch (error) {
      console.error("Error updating campaign cost:", error);
      if (error instanceof Error && error.message.includes("Já existe")) {
        res.status(409).json({ message: error.message });
      } else {
        res.status(400).json({ message: "Erro ao atualizar custo de campanha" });
      }
    }
  });

  app.patch("/api/campaign-costs/:id/inactivate", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN', 'GESTOR'].includes(user.role)) {
        return res.status(403).json({ message: "Acesso negado. Função insuficiente." });
      }

      const id = parseInt(req.params.id);
      
      // Validar se o custo existe e se o usuário pode inativá-lo
      const existingCosts = await storage.getCampaignCosts();
      const existingCost = existingCosts.find(c => c.id === id);
      
      if (!existingCost) {
        return res.status(404).json({ message: "Custo não encontrado" });
      }

      // Apenas o criador ou MASTER/ADMIN podem inativar
      if (existingCost.userId !== req.user.id && !['MASTER', 'ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Apenas o autor ou administradores podem inativar este custo" });
      }

      const inactivatedCost = await storage.inactivateCampaignCost(id, req.user.id);
      res.json(inactivatedCost);
    } catch (error) {
      console.error("Error inactivating campaign cost:", error);
      res.status(500).json({ message: "Erro ao inativar custo de campanha" });
    }
  });

  app.patch("/api/campaign-costs/:id/reactivate", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Acesso negado. Apenas administradores podem reativar custos." });
      }

      const id = parseInt(req.params.id);
      const reactivatedCost = await storage.reactivateCampaignCost(id);
      res.json(reactivatedCost);
    } catch (error) {
      console.error("Error reactivating campaign cost:", error);
      res.status(500).json({ message: "Erro ao reativar custo de campanha" });
    }
  });

  app.get("/api/campaign-costs/totals", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN', 'GESTOR'].includes(user.role)) {
        return res.status(403).json({ message: "Acesso negado. Função insuficiente." });
      }

      const { campaignId, referenceMonth, status, userId } = req.query;
      
      const filters: any = {};
      if (campaignId) filters.campaignId = parseInt(campaignId);
      if (referenceMonth) filters.referenceMonth = referenceMonth;
      if (status) filters.status = status;
      if (userId) filters.userId = parseInt(userId);

      const totals = await storage.getCampaignCostsTotals(filters);
      res.json(totals);
    } catch (error) {
      console.error("Error fetching campaign costs totals:", error);
      res.status(500).json({ message: "Erro ao buscar totais de custos" });
    }
  });

  // Time Entry Comments - Sistema de comentários com histórico
  app.get('/api/time-entries/:id/comments', requireAuth, async (req: any, res) => {
    try {
      const timeEntryId = parseInt(req.params.id);
      
      if (isNaN(timeEntryId)) {
        return res.status(400).json({ message: "ID do time entry inválido" });
      }

      // Verifica se o usuário tem acesso ao time entry
      const timeEntry = await storage.getTimeEntry(timeEntryId);
      if (!timeEntry) {
        return res.status(404).json({ message: "Entrada de tempo não encontrada" });
      }

      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(401).json({ message: "Usuário não encontrado" });
      }

      // Verificar acesso baseado no role
      const canAccess = timeEntry.userId === user.id || 
                       ['MASTER', 'ADMIN', 'GESTOR'].includes(user.role);
      
      if (!canAccess) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const comments = await storage.getTimeEntryComments(timeEntryId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching time entry comments:", error);
      res.status(500).json({ message: "Erro ao buscar comentários" });
    }
  });

  app.post('/api/time-entries/:id/comments', requireAuth, async (req: any, res) => {
    try {
      const timeEntryId = parseInt(req.params.id);
      
      if (isNaN(timeEntryId)) {
        return res.status(400).json({ message: "ID do time entry inválido" });
      }

      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(401).json({ message: "Usuário não encontrado" });
      }

      // Verificar acesso ao time entry
      const timeEntry = await storage.getTimeEntry(timeEntryId);
      if (!timeEntry) {
        return res.status(404).json({ message: "Entrada de tempo não encontrada" });
      }

      const { comment, commentType } = req.body;

      // Validar role vs commentType
      const isManager = ['MASTER', 'ADMIN', 'GESTOR'].includes(user.role);
      const isOwner = timeEntry.userId === user.id;

      if (commentType === 'MANAGER_FEEDBACK' && !isManager) {
        return res.status(403).json({ message: "Apenas gestores podem enviar feedback de gestor" });
      }

      if (commentType === 'COLLABORATOR_RESPONSE' && !isOwner) {
        return res.status(403).json({ message: "Apenas o colaborador dono pode responder" });
      }

      // Verificar acesso geral
      if (!isManager && !isOwner) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      // Valida dados do comentário
      const data = insertTimeEntryCommentSchema.parse({
        comment,
        commentType,
        timeEntryId,
        userId: user.id,
      });

      const newComment = await storage.createTimeEntryComment(data);
      res.status(201).json(newComment);
    } catch (error) {
      console.error("Error creating time entry comment:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Dados inválidos", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Erro ao criar comentário" });
    }
  });

  app.post('/api/time-entries/:id/respond', requireAuth, async (req: any, res) => {
    try {
      const timeEntryId = parseInt(req.params.id);
      const { comment } = req.body;
      
      if (isNaN(timeEntryId)) {
        return res.status(400).json({ message: "ID do time entry inválido" });
      }

      if (!comment || comment.trim() === '') {
        return res.status(400).json({ message: "Comentário é obrigatório" });
      }

      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(401).json({ message: "Usuário não encontrado" });
      }

      // Verifica se o usuário tem acesso ao time entry
      const timeEntry = await storage.getTimeEntry(timeEntryId);
      if (!timeEntry) {
        return res.status(404).json({ message: "Entrada de tempo não encontrada" });
      }

      // Apenas o colaborador dono do time entry pode responder
      if (timeEntry.userId !== user.id) {
        return res.status(403).json({ message: "Apenas o colaborador pode responder aos comentários" });
      }

      const result = await storage.respondToComment(timeEntryId, user.id, comment);
      res.json(result);
    } catch (error) {
      console.error("Error responding to comment:", error);
      res.status(500).json({ message: "Erro ao responder comentário" });
    }
  });

  // Importação CSV - incluir rotas em arquivo separado
  const csvImportModule = await import('./csvImportRoutes');
  csvImportModule.setupCsvImportRoutes(app, storage);

  const httpServer = createServer(app);
  return httpServer;
}
