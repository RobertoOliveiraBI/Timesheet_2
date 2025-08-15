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
import { eq, and, asc, desc, gte, lte, inArray } from "drizzle-orm";
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

  // Temporary endpoint to fix user password or create user
  app.post('/api/admin/fix-user-password', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const { email, newPassword } = req.body;

      if (!email || !newPassword) {
        return res.status(400).json({ message: "Email e nova senha são obrigatórios" });
      }

      // Import hashPassword function
      const { hashPassword } = await import('./auth');
      const hashedPassword = await hashPassword(newPassword);

      // Check if user exists
      let targetUser = await storage.getUserByEmail(email);

      if (!targetUser) {
        // Create the user if it doesn't exist
        const [firstName, lastName] = email.split('@')[0].split('.');

        targetUser = await storage.createUser({
          email,
          password: hashedPassword,
          firstName: firstName.charAt(0).toUpperCase() + firstName.slice(1),
          lastName: lastName ? lastName.charAt(0).toUpperCase() + lastName.slice(1) : '',
          role: "COLABORADOR",
          isActive: true
        });

        res.json({ 
          message: "Usuário criado com sucesso", 
          user: { 
            id: targetUser.id, 
            email: targetUser.email, 
            firstName: targetUser.firstName,
            lastName: targetUser.lastName,
            role: targetUser.role,
            isActive: targetUser.isActive 
          } 
        });
      } else {
        // Update existing user password
        const updatedUser = await storage.updateUser(targetUser.id, {
          password: hashedPassword,
          isActive: true // Ensure user is active
        });

        res.json({ 
          message: "Senha alterada com sucesso", 
          user: { 
            id: updatedUser.id, 
            email: updatedUser.email, 
            isActive: updatedUser.isActive 
          } 
        });
      }
    } catch (error) {
      console.error("Error fixing user password:", error);
      res.status(500).json({ message: "Erro ao alterar senha do usuário" });
    }
  });

  // Users endpoints
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
      res.status(500).json({ message: "Erro ao carregar usuários" });
    }
  });

  app.get('/api/users', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user || !['MASTER', 'ADMIN'].includes(user.role)) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Erro ao carregar usuários" });
    }
  });

  app.put('/api/usuarios/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = parseInt(req.params.id);
      const currentUser = await storage.getUser(req.user.id);
      
      if (!currentUser) {
        return res.status(401).json({ message: "Usuário não autenticado" });
      }

      // Allow users to update their own profile or admins to update any profile
      if (currentUser.id !== userId && !['MASTER', 'ADMIN'].includes(currentUser.role)) {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const updateData = req.body;
      
      // Remove password from updates if present (should use separate endpoint)
      delete updateData.password;
      delete updateData.id;

      const updatedUser = await storage.updateUserAdmin(userId, updateData);
      
      // Return user data without password
      const { password, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Erro ao atualizar usuário" });
    }
  });

  // Groups endpoints
  app.get('/api/grupos', requireAuth, async (req: any, res) => {
    try {
      const groups = await storage.getEconomicGroups();
      res.json(groups);
    } catch (error) {
      console.error("Error fetching groups:", error);
      res.status(500).json({ message: "Erro ao carregar grupos" });
    }
  });

  // Clients endpoints
  app.get('/api/clientes', requireAuth, async (req: any, res) => {
    try {
      const clients = await storage.getClients();
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Erro ao carregar clientes" });
    }
  });

  // Campaigns endpoints
  app.get('/api/campanhas', requireAuth, async (req: any, res) => {
    try {
      const campaigns = await storage.getCampaigns();
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ message: "Erro ao carregar campanhas" });
    }
  });

  app.get('/api/campaigns', requireAuth, async (req: any, res) => {
    try {
      const campaigns = await storage.getCampaigns();
      res.json(campaigns);
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      res.status(500).json({ message: "Erro ao carregar campanhas" });
    }
  });

  // Task Types endpoints
  app.get('/api/task-types', requireAuth, async (req: any, res) => {
    try {
      const taskTypes = await storage.getTaskTypes();
      res.json(taskTypes);
    } catch (error) {
      console.error("Error fetching task types:", error);
      res.status(500).json({ message: "Erro ao carregar tipos de tarefa" });
    }
  });

  // Campaign Tasks endpoints
  app.get('/api/campaign-tasks', requireAuth, async (req: any, res) => {
    try {
      const campaignTasks = await storage.getCampaignTasks();
      res.json(campaignTasks);
    } catch (error) {
      console.error("Error fetching campaign tasks:", error);
      res.status(500).json({ message: "Erro ao carregar tarefas de campanha" });
    }
  });

  // Departments endpoints
  app.get('/api/departments', requireAuth, async (req: any, res) => {
    try {
      const departments = await storage.getDepartments();
      res.json(departments);
    } catch (error) {
      console.error("Error fetching departments:", error);
      res.status(500).json({ message: "Erro ao carregar departamentos" });
    }
  });

  // Cost Centers endpoints
  app.get('/api/cost-centers', requireAuth, async (req: any, res) => {
    try {
      const costCenters = await storage.getCostCenters();
      res.json(costCenters);
    } catch (error) {
      console.error("Error fetching cost centers:", error);
      res.status(500).json({ message: "Erro ao carregar centros de custo" });
    }
  });

  // Time entries endpoints
  app.get('/api/time-entries/user', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { fromDate, toDate } = req.query;
      
      const timeEntries = await storage.getTimeEntriesByUser(
        userId, 
        fromDate as string, 
        toDate as string
      );
      res.json(timeEntries);
    } catch (error) {
      console.error("Error fetching user time entries:", error);
      res.status(500).json({ message: "Erro ao carregar entradas de tempo" });
    }
  });

  app.get('/api/time-entries/validation-count', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(401).json({ message: "Usuário não encontrado" });
      }

      // Get pending time entries for this manager
      const pendingEntries = await storage.getPendingTimeEntries(user.id);
      res.json({ count: pendingEntries.length });
    } catch (error) {
      console.error("Error fetching validation count:", error);
      res.status(500).json({ message: "Erro ao carregar contagem de validações" });
    }
  });

  // Timesheet endpoints
  app.get('/api/timesheet/semana', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);

      const timeEntries = await storage.getTimeEntriesByUser(
        userId,
        format(startOfWeek, 'yyyy-MM-dd'),
        format(endOfWeek, 'yyyy-MM-dd')
      );

      res.json(timeEntries);
    } catch (error) {
      console.error("Error fetching weekly timesheet:", error);
      res.status(500).json({ message: "Erro ao carregar timesheet semanal" });
    }
  });

  // Reports endpoints
  app.get('/api/reports/user-stats', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      const timeEntries = await storage.getTimeEntriesByUser(
        userId,
        format(startOfMonth, 'yyyy-MM-dd'),
        format(endOfMonth, 'yyyy-MM-dd')
      );

      const totalHours = timeEntries.reduce((sum, entry) => sum + Number(entry.hours || 0), 0);
      const approvedHours = timeEntries
        .filter(entry => entry.status === 'APROVADO')
        .reduce((sum, entry) => sum + Number(entry.hours || 0), 0);

      res.json({
        totalHours,
        approvedHours,
        entriesCount: timeEntries.length,
        pendingCount: timeEntries.filter(entry => entry.status === 'VALIDACAO').length
      });
    } catch (error) {
      console.error("Error fetching user stats:", error);
      res.status(500).json({ message: "Erro ao carregar estatísticas do usuário" });
    }
  });

  // CSV Import - incluir rotas em arquivo separado
  const csvImportModule = await import('./csvImportRoutes');
  csvImportModule.setupCsvImportRoutes(app, storage);

  const httpServer = createServer(app);
  return httpServer;
}