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

  // CSV Import - incluir rotas em arquivo separado
  const csvImportModule = await import('./csvImportRoutes');
  csvImportModule.setupCsvImportRoutes(app, storage);

  const httpServer = createServer(app);
  return httpServer;
}