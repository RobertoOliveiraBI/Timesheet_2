import {
  users,
  economicGroups,
  clients,
  campaigns,
  campaignUsers,
  taskTypes,
  campaignTasks,
  timeEntries,
  timeEntryComments,
  campaignCosts,
  departments,
  costCenters,
  costCategories,
  type User,
  type InsertUser,
  type InsertEconomicGroup,
  type EconomicGroup,
  type InsertClient,
  type Client,
  type InsertCampaign,
  type Campaign,
  type InsertTaskType,
  type TaskType,
  type InsertCampaignTask,
  type CampaignTask,
  type CampaignTaskWithRelations,
  type InsertTimeEntry,
  type TimeEntry,
  type InsertTimeEntryComment,
  type TimeEntryComment,
  type InsertCampaignUser,
  type CampaignUser,
  type TimeEntryWithRelations,
  type CampaignWithRelations,
  type InsertCampaignCost,
  type CampaignCost,
  type CampaignCostWithRelations,
  type InsertCostCategory,
  type CostCategory,
  systemConfig,
  type SystemConfig,
  type InsertSystemConfig,
  type Department,
  type InsertDepartment,
  type CostCenter,
  type InsertCostCenter,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, sql, gte, lte, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  upsertUser(user: any): Promise<User>;
  
  // Economic Groups
  createEconomicGroup(group: InsertEconomicGroup): Promise<EconomicGroup>;
  getEconomicGroups(): Promise<EconomicGroup[]>;
  updateEconomicGroup(id: number, group: Partial<InsertEconomicGroup>): Promise<EconomicGroup>;
  
  // Clients
  createClient(client: InsertClient): Promise<Client>;
  getClients(): Promise<Client[]>;
  getClientsByEconomicGroup(groupId: number): Promise<Client[]>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client>;
  
  // Campaigns
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  getCampaigns(): Promise<CampaignWithRelations[]>;
  getCampaignsByUser(userId: number): Promise<CampaignWithRelations[]>;
  updateCampaign(id: number, campaign: Partial<InsertCampaign>): Promise<Campaign>;
  addUserToCampaign(campaignId: number, userId: number): Promise<void>;
  removeUserFromCampaign(campaignId: number, userId: number): Promise<void>;
  
  // Task Types
  createTaskType(taskType: InsertTaskType): Promise<TaskType>;
  getTaskTypes(): Promise<TaskType[]>;
  updateTaskType(id: number, taskType: Partial<InsertTaskType>): Promise<TaskType>;
  
  // Campaign Tasks
  createCampaignTask(campaignTask: InsertCampaignTask): Promise<CampaignTask>;
  getCampaignTasks(campaignId?: number): Promise<CampaignTaskWithRelations[]>;
  updateCampaignTask(id: number, campaignTask: Partial<InsertCampaignTask>): Promise<CampaignTask>;
  deleteCampaignTask(id: number): Promise<void>;
  
  // Time Entries
  createTimeEntry(timeEntry: InsertTimeEntry): Promise<TimeEntry>;
  getTimeEntries(userId?: number, status?: string, fromDate?: string, toDate?: string): Promise<TimeEntryWithRelations[]>;
  deleteTimeEntry(id: number): Promise<void>;
  getTimeEntry(id: number): Promise<TimeEntry | undefined>;
  getTimeEntriesByUser(userId: number, fromDate?: string, toDate?: string): Promise<TimeEntryWithRelations[]>;
  getPendingTimeEntries(managerId?: number): Promise<TimeEntryWithRelations[]>;
  updateTimeEntry(id: number, timeEntry: Partial<InsertTimeEntry>): Promise<TimeEntry>;
  submitTimeEntry(id: number, userId: number): Promise<TimeEntry>;
  approveTimeEntry(id: number, reviewerId: number, comment?: string): Promise<TimeEntry>;
  rejectTimeEntry(id: number, reviewerId: number, comment?: string): Promise<TimeEntry>;
  returnApprovedToSaved(id: number, reviewedBy: number, comment?: string): Promise<TimeEntry>;
  
  // Time Entry Comments - Sistema de comentários com histórico
  createTimeEntryComment(comment: InsertTimeEntryComment): Promise<TimeEntryComment>;
  getTimeEntryComments(timeEntryId: number): Promise<Array<TimeEntryComment & { user: User }>>;
  respondToComment(timeEntryId: number, userId: number, comment: string): Promise<{comment: TimeEntryComment, updatedEntry: TimeEntry}>;
  
  // Reports
  getUserTimeStats(userId: number, fromDate?: string, toDate?: string): Promise<{
    totalHours: number;
    billableHours: number;
    nonBillableHours: number;
    approvedHours: number;
    pendingHours: number;
  }>;
  getTeamTimeStats(managerId: number, fromDate?: string, toDate?: string): Promise<{
    totalHours: number;
    billableHours: number;
    utilization: number;
    activeUsers: number;
  }>;

  // System configuration operations
  getSystemConfig(): Promise<Record<string, any>>;
  updateSystemConfig(config: Record<string, any>): Promise<void>;

  // Admin operations
  getAllUsers(): Promise<User[]>;
  deleteUser(id: number): Promise<void>;
  deleteEconomicGroup(id: number): Promise<void>;
  deleteClient(id: number): Promise<void>;
  deleteCampaign(id: number): Promise<void>;
  deleteTaskType(id: number): Promise<void>;
  
  // Departments
  getDepartments(): Promise<Department[]>;
  createDepartment(department: InsertDepartment): Promise<Department>;
  updateDepartment(id: number, department: Partial<InsertDepartment>): Promise<Department>;
  deleteDepartment(id: number): Promise<void>;
  
  // Cost Centers
  getCostCenters(): Promise<CostCenter[]>;
  createCostCenter(costCenter: InsertCostCenter): Promise<CostCenter>;
  updateCostCenter(id: number, costCenter: Partial<InsertCostCenter>): Promise<CostCenter>;
  deleteCostCenter(id: number): Promise<void>;
  
  // Cost Categories
  getCostCategories(): Promise<CostCategory[]>;
  createCostCategory(category: InsertCostCategory): Promise<CostCategory>;
  updateCostCategory(id: number, category: Partial<InsertCostCategory>): Promise<CostCategory>;
  deleteCostCategory(id: number): Promise<void>;
  
  // Campaign Costs
  getCampaignCosts(filters?: {
    campaignId?: number;
    referenceMonth?: string;
    status?: string;
    userId?: number;
  }): Promise<CampaignCostWithRelations[]>;
  createCampaignCost(campaignCost: InsertCampaignCost): Promise<CampaignCost>;
  updateCampaignCost(id: number, campaignCost: Partial<InsertCampaignCost>): Promise<CampaignCost>;
  inactivateCampaignCost(id: number, userId: number): Promise<CampaignCost>;
  reactivateCampaignCost(id: number): Promise<CampaignCost>;
  getCampaignCostsTotals(filters?: {
    campaignId?: number;
    referenceMonth?: string;
    status?: string;
    userId?: number;
  }): Promise<{ total: number; count: number; }>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: number): Promise<User | undefined> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
      with: {
        costCenter: true,
        department: true,
        manager: true,
      },
    });
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
      with: {
        costCenter: true,
        department: true,
        manager: true,
      },
    });
    return user;
  }

  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async upsertUser(userData: any): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Economic Groups
  async createEconomicGroup(group: InsertEconomicGroup): Promise<EconomicGroup> {
    const [economicGroup] = await db.insert(economicGroups).values(group).returning();
    return economicGroup;
  }

  async getEconomicGroups(): Promise<EconomicGroup[]> {
    return await db.select().from(economicGroups).orderBy(asc(economicGroups.name));
  }

  async updateEconomicGroup(id: number, group: Partial<InsertEconomicGroup>): Promise<EconomicGroup> {
    const [economicGroup] = await db
      .update(economicGroups)
      .set(group)
      .where(eq(economicGroups.id, id))
      .returning();
    return economicGroup;
  }

  // Clients
  async createClient(client: InsertClient): Promise<Client> {
    const [newClient] = await db.insert(clients).values(client).returning();
    return newClient;
  }

  async getClients(): Promise<Client[]> {
    return await db.select().from(clients).where(eq(clients.isActive, true)).orderBy(asc(clients.companyName));
  }

  async getClientsByEconomicGroup(groupId: number): Promise<Client[]> {
    return await db
      .select()
      .from(clients)
      .where(and(eq(clients.economicGroupId, groupId), eq(clients.isActive, true)))
      .orderBy(asc(clients.companyName));
  }

  async updateClient(id: number, client: Partial<InsertClient>): Promise<Client> {
    const [updatedClient] = await db
      .update(clients)
      .set(client)
      .where(eq(clients.id, id))
      .returning();
    return updatedClient;
  }

  // Campaigns
  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    const [newCampaign] = await db.insert(campaigns).values(campaign).returning();
    return newCampaign;
  }

  async getCampaigns(): Promise<CampaignWithRelations[]> {
    return await db.query.campaigns.findMany({
      where: eq(campaigns.isActive, true),
      with: {
        client: {
          with: {
            economicGroup: true,
          },
        },
        userAccess: {
          with: {
            user: true,
          },
        },
      },
      orderBy: [desc(campaigns.createdAt)],
    });
  }

  async getCampaignsByUser(userId: number): Promise<CampaignWithRelations[]> {
    const userCampaigns = await db.query.campaignUsers.findMany({
      where: eq(campaignUsers.userId, userId),
      with: {
        campaign: {
          with: {
            client: {
              with: {
                economicGroup: true,
              },
            },
            userAccess: {
              with: {
                user: true,
              },
            },
          },
        },
      },
    });

    return userCampaigns
      .filter(uc => uc.campaign.isActive)
      .map(uc => uc.campaign);
  }

  async updateCampaign(id: number, campaign: Partial<InsertCampaign>): Promise<Campaign> {
    const [updatedCampaign] = await db
      .update(campaigns)
      .set(campaign)
      .where(eq(campaigns.id, id))
      .returning();
    return updatedCampaign;
  }

  async addUserToCampaign(campaignId: number, userId: number): Promise<void> {
    await db.insert(campaignUsers).values({
      campaignId,
      userId,
    });
  }

  async removeUserFromCampaign(campaignId: number, userId: number): Promise<void> {
    await db
      .delete(campaignUsers)
      .where(and(eq(campaignUsers.campaignId, campaignId), eq(campaignUsers.userId, userId)));
  }

  // Task Types
  async createTaskType(taskType: InsertTaskType): Promise<TaskType> {
    const [newTaskType] = await db.insert(taskTypes).values(taskType).returning();
    return newTaskType;
  }

  async getTaskTypes(): Promise<TaskType[]> {
    return await db
      .select()
      .from(taskTypes)
      .where(eq(taskTypes.isActive, true))
      .orderBy(asc(taskTypes.name));
  }

  async updateTaskType(id: number, taskType: Partial<InsertTaskType>): Promise<TaskType> {
    const [updatedTaskType] = await db
      .update(taskTypes)
      .set(taskType)
      .where(eq(taskTypes.id, id))
      .returning();
    return updatedTaskType;
  }

  // Campaign Tasks
  async createCampaignTask(campaignTask: InsertCampaignTask): Promise<CampaignTask> {
    const [newCampaignTask] = await db.insert(campaignTasks).values(campaignTask).returning();
    return newCampaignTask;
  }

  async getCampaignTasks(campaignId?: number): Promise<CampaignTaskWithRelations[]> {
    const conditions = [];
    
    if (campaignId) {
      conditions.push(eq(campaignTasks.campaignId, campaignId));
    }
    
    conditions.push(eq(campaignTasks.isActive, true));

    return await db.query.campaignTasks.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        campaign: true,
        taskType: true,
      },
      orderBy: [asc(campaignTasks.description)],
    });
  }

  async updateCampaignTask(id: number, campaignTask: Partial<InsertCampaignTask>): Promise<CampaignTask> {
    const [updatedCampaignTask] = await db
      .update(campaignTasks)
      .set(campaignTask)
      .where(eq(campaignTasks.id, id))
      .returning();
    return updatedCampaignTask;
  }

  async deleteCampaignTask(id: number): Promise<void> {
    await db
      .update(campaignTasks)
      .set({ isActive: false })
      .where(eq(campaignTasks.id, id));
  }

  // Time Entries
  async createTimeEntry(timeEntry: InsertTimeEntry): Promise<TimeEntry> {
    const [newTimeEntry] = await db.insert(timeEntries).values(timeEntry).returning();
    return newTimeEntry;
  }

  async getTimeEntries(userId?: number, status?: string, fromDate?: string, toDate?: string): Promise<TimeEntryWithRelations[]> {
    const conditions = [];
    
    if (userId) {
      conditions.push(eq(timeEntries.userId, userId));
    }
    
    if (status) {
      conditions.push(eq(timeEntries.status, status as any));
    }
    
    if (fromDate) {
      conditions.push(gte(timeEntries.date, fromDate));
    }
    
    if (toDate) {
      conditions.push(lte(timeEntries.date, toDate));
    }

    return await db.query.timeEntries.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        user: true,
        campaign: {
          with: {
            client: {
              with: {
                economicGroup: true,
              },
            },
          },
        },
        campaignTask: {
          with: {
            taskType: true,
          },
        },
        reviewer: true,
      },
      orderBy: [desc(timeEntries.date), desc(timeEntries.createdAt)],
    });
  }

  async getTimeEntriesByUser(userId: number, fromDate?: string, toDate?: string): Promise<TimeEntryWithRelations[]> {
    const conditions = [eq(timeEntries.userId, userId)];
    
    if (fromDate) {
      conditions.push(gte(timeEntries.date, fromDate));
    }
    
    if (toDate) {
      conditions.push(lte(timeEntries.date, toDate));
    }

    try {
      return await db.query.timeEntries.findMany({
        where: and(...conditions),
        with: {
          user: true,
          campaign: {
            with: {
              client: {
                with: {
                  economicGroup: true,
                },
              },
            },
          },
          campaignTask: {
            with: {
              taskType: true,
            },
          },
          reviewer: true,
        },
        orderBy: [desc(timeEntries.date), desc(timeEntries.createdAt)],
      });
    } catch (error) {
      console.error("Error in getTimeEntriesByUser:", error);
      // Fallback to simple query if relations fail
      const simpleEntries = await db.select().from(timeEntries).where(and(...conditions));
      return simpleEntries as TimeEntryWithRelations[];
    }
  }

  async getPendingTimeEntries(managerId?: number): Promise<TimeEntryWithRelations[]> {
    let userIds: number[] | undefined;
    
    if (managerId) {
      // Get subordinates of the manager
      const subordinates = await db.select().from(users).where(eq(users.managerId, managerId));
      userIds = subordinates.map(u => u.id);
      
      if (userIds.length === 0) {
        return [];
      }
    }

    const conditions = [eq(timeEntries.status, "VALIDACAO")];
    
    if (userIds) {
      conditions.push(inArray(timeEntries.userId, userIds));
    }

    return await db.query.timeEntries.findMany({
      where: and(...conditions),
      with: {
        user: true,
        campaign: {
          with: {
            client: {
              with: {
                economicGroup: true,
              },
            },
          },
        },
        campaignTask: {
          with: {
            taskType: true,
          },
        },
        reviewer: true,
      },
      orderBy: [asc(timeEntries.date), asc(timeEntries.createdAt)],
    });
  }

  async updateTimeEntry(id: number, timeEntry: any): Promise<TimeEntry> {
    const updateData: any = {
      ...timeEntry,
      updatedAt: new Date(),
    };
    
    // Convert ISO string dates to Date objects if needed
    if (updateData.reviewedAt && typeof updateData.reviewedAt === 'string') {
      updateData.reviewedAt = new Date(updateData.reviewedAt);
    }
    if (updateData.submittedAt && typeof updateData.submittedAt === 'string') {
      updateData.submittedAt = new Date(updateData.submittedAt);
    }
    
    const [updatedTimeEntry] = await db
      .update(timeEntries)
      .set(updateData)
      .where(eq(timeEntries.id, id))
      .returning();
    return updatedTimeEntry;
  }

  async submitTimeEntry(id: number, userId: number): Promise<TimeEntry> {
    const [timeEntry] = await db
      .update(timeEntries)
      .set({
        status: "VALIDACAO",
        submittedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(timeEntries.id, id), eq(timeEntries.userId, userId)))
      .returning();
    return timeEntry;
  }

  async approveTimeEntry(id: number, reviewerId: number, comment?: string): Promise<TimeEntry> {
    // Se há comentário, adicionar ao feed antes de aprovar
    if (comment && comment.trim()) {
      await db.insert(timeEntryComments).values({
        timeEntryId: id,
        userId: reviewerId,
        comment: comment.trim(),
        commentType: "MANAGER_FEEDBACK",
      });
    }

    const [timeEntry] = await db
      .update(timeEntries)
      .set({
        status: "APROVADO",
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewComment: comment, // Manter por compatibilidade
        updatedAt: new Date(),
      })
      .where(eq(timeEntries.id, id))
      .returning();
    return timeEntry;
  }

  async rejectTimeEntry(id: number, reviewerId: number, comment?: string): Promise<TimeEntry> {
    // Sempre adicionar comentário ao feed quando rejeitar (obrigatório para rejeição)
    if (comment && comment.trim()) {
      await db.insert(timeEntryComments).values({
        timeEntryId: id,
        userId: reviewerId,
        comment: comment.trim(),
        commentType: "MANAGER_FEEDBACK",
      });
    }

    const [timeEntry] = await db
      .update(timeEntries)
      .set({
        status: "RASCUNHO", // Status muda para RASCUNHO para permitir edição
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewComment: comment, // Manter por compatibilidade
        updatedAt: new Date(),
      })
      .where(eq(timeEntries.id, id))
      .returning();
    return timeEntry;
  }

  // Reports
  async getUserTimeStats(userId: number, fromDate?: string, toDate?: string): Promise<{
    totalHours: number;
    billableHours: number;
    nonBillableHours: number;
    approvedHours: number;
    pendingHours: number;
  }> {
    const conditions = [eq(timeEntries.userId, userId)];
    
    if (fromDate) {
      conditions.push(gte(timeEntries.date, fromDate));
    }
    
    if (toDate) {
      conditions.push(lte(timeEntries.date, toDate));
    }

    const entries = await db.query.timeEntries.findMany({
      where: and(...conditions),
      with: {
        campaignTask: {
          with: {
            taskType: true,
          },
        },
      },
    });

    const stats = entries.reduce((acc, entry) => {
      const hours = parseFloat(entry.hours);
      acc.totalHours += hours;
      
      if (entry.campaignTask.taskType.isBillable) {
        acc.billableHours += hours;
      } else {
        acc.nonBillableHours += hours;
      }
      
      if (entry.status === "APROVADO") {
        acc.approvedHours += hours;
      } else if (entry.status === "VALIDACAO") {
        acc.pendingHours += hours;
      }
      
      return acc;
    }, {
      totalHours: 0,
      billableHours: 0,
      nonBillableHours: 0,
      approvedHours: 0,
      pendingHours: 0,
    });

    return stats;
  }

  async getTeamTimeStats(managerId: number, fromDate?: string, toDate?: string): Promise<{
    totalHours: number;
    billableHours: number;
    utilization: number;
    activeUsers: number;
  }> {
    // Get subordinates
    const subordinates = await db.select().from(users).where(eq(users.managerId, managerId));
    const userIds = subordinates.map(u => u.id);
    
    if (userIds.length === 0) {
      return {
        totalHours: 0,
        billableHours: 0,
        utilization: 0,
        activeUsers: 0,
      };
    }

    const conditions = [inArray(timeEntries.userId, userIds)];
    
    if (fromDate) {
      conditions.push(gte(timeEntries.date, fromDate));
    }
    
    if (toDate) {
      conditions.push(lte(timeEntries.date, toDate));
    }

    const entries = await db.query.timeEntries.findMany({
      where: and(...conditions),
      with: {
        campaignTask: {
          with: {
            taskType: true,
          },
        },
      },
    });

    const activeUsers = new Set(entries.map(e => e.userId)).size;
    
    const stats = entries.reduce((acc, entry) => {
      const hours = parseFloat(entry.hours);
      acc.totalHours += hours;
      
      if (entry.campaignTask.taskType.isBillable) {
        acc.billableHours += hours;
      }
      
      return acc;
    }, {
      totalHours: 0,
      billableHours: 0,
    });

    const utilization = stats.totalHours > 0 ? (stats.billableHours / stats.totalHours) * 100 : 0;

    return {
      ...stats,
      utilization: Math.round(utilization),
      activeUsers,
    };
  }

  // System configuration operations
  async getSystemConfig(): Promise<Record<string, any>> {
    const configs = await db.select().from(systemConfig);
    const result: Record<string, any> = {};
    
    for (const config of configs) {
      result[config.key] = config.value;
    }
    
    // Set defaults if not configured
    return {
      fechamento_automatico: false,
      notificacao_email: true,
      backup_automatico: true,
      ...result,
    };
  }

  async updateSystemConfig(config: Record<string, any>): Promise<void> {
    for (const [key, value] of Object.entries(config)) {
      await db
        .insert(systemConfig)
        .values({ key, value })
        .onConflictDoUpdate({
          target: systemConfig.key,
          set: { value, updatedAt: new Date() },
        });
    }
  }

  // Admin operations
  async getAllUsers(): Promise<User[]> {
    return await db.query.users.findMany({
      with: {
        costCenter: true,
        department: true,
        manager: true,
      },
      orderBy: [asc(users.firstName), asc(users.lastName)],
    });
  }

  async updateUserAdmin(id: number, userData: Partial<InsertUser>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({
        ...userData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async deleteUser(id: number): Promise<void> {
    // Check if user has time entries
    const timeEntryCount = await db
      .select({ count: sql`count(*)` })
      .from(timeEntries)
      .where(eq(timeEntries.userId, id));
    
    if (Number(timeEntryCount[0].count) > 0) {
      // Soft delete by setting isActive to false
      await db
        .update(users)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(users.id, id));
    } else {
      // Hard delete if no time entries
      await db.delete(users).where(eq(users.id, id));
    }
  }

  async deleteEconomicGroup(id: number): Promise<void> {
    // Primeiro verifica se existe grupo "Não Informado"
    let [naoInformadoGroup] = await db.select().from(economicGroups).where(eq(economicGroups.name, "Não Informado"));
    
    // Se não existir, cria o grupo "Não Informado"
    if (!naoInformadoGroup) {
      [naoInformadoGroup] = await db.insert(economicGroups).values({
        name: "Não Informado",
        description: "Grupo padrão para clientes sem grupo específico"
      }).returning();
    }
    
    // Move todos os clientes do grupo a ser deletado para "Não Informado"
    await db
      .update(clients)
      .set({ economicGroupId: naoInformadoGroup.id })
      .where(eq(clients.economicGroupId, id));
    
    // Agora pode deletar o grupo
    await db.delete(economicGroups).where(eq(economicGroups.id, id));
  }

  async deleteClient(id: number): Promise<void> {
    // Verifica se existem horas lançadas para campanhas deste cliente
    const timeEntriesCount = await db
      .select({ count: sql`count(*)` })
      .from(timeEntries)
      .innerJoin(campaigns, eq(timeEntries.campaignId, campaigns.id))
      .where(eq(campaigns.clientId, id));
    
    const hasTimeEntries = Number(timeEntriesCount[0].count) > 0;
    
    if (hasTimeEntries) {
      // Se tem horas lançadas, apenas desativa o cliente
      await db
        .update(clients)
        .set({ isActive: false })
        .where(eq(clients.id, id));
    } else {
      // Se não tem horas, pode deletar completamente
      await db.delete(clients).where(eq(clients.id, id));
    }
  }

  async deleteCampaign(id: number): Promise<void> {
    // Check if campaign has time entries
    const timeEntryCount = await db
      .select({ count: sql`count(*)` })
      .from(timeEntries)
      .where(eq(timeEntries.campaignId, id));
    
    const hasTimeEntries = Number(timeEntryCount[0].count) > 0;
    
    if (hasTimeEntries) {
      throw new Error("Não é possível deletar campanha com lançamentos de horas. Desative a campanha em vez de deletá-la.");
    }
    
    // Delete campaign costs first (to avoid foreign key constraint)
    await db.delete(campaignCosts).where(eq(campaignCosts.campaignId, id));
    
    // Delete campaign tasks
    await db.delete(campaignTasks).where(eq(campaignTasks.campaignId, id));
    
    // Delete campaign users
    await db.delete(campaignUsers).where(eq(campaignUsers.campaignId, id));
    
    // Finally delete the campaign
    await db.delete(campaigns).where(eq(campaigns.id, id));
  }

  async deleteTaskType(id: number): Promise<void> {
    await db.delete(taskTypes).where(eq(taskTypes.id, id));
  }

  async deleteTimeEntry(id: number): Promise<void> {
    // Deletar comentários associados primeiro (para evitar violação de foreign key)
    await db.delete(timeEntryComments).where(eq(timeEntryComments.timeEntryId, id));
    
    // Depois deletar a entrada de horas
    await db.delete(timeEntries).where(eq(timeEntries.id, id));
  }

  async getTimeEntry(id: number): Promise<TimeEntry | undefined> {
    const [timeEntry] = await db.select().from(timeEntries).where(eq(timeEntries.id, id));
    return timeEntry;
  }

  async returnApprovedToSaved(id: number, reviewedBy: number, comment?: string): Promise<TimeEntry> {
    // Adicionar comentário ao feed se fornecido
    if (comment && comment.trim()) {
      await db.insert(timeEntryComments).values({
        timeEntryId: id,
        userId: reviewedBy,
        comment: comment.trim(),
        commentType: "MANAGER_FEEDBACK",
      });
    }

    const [timeEntry] = await db
      .update(timeEntries)
      .set({
        status: "SALVO",
        reviewedBy: reviewedBy,
        reviewedAt: new Date(),
        reviewComment: comment, // Manter por compatibilidade
        updatedAt: new Date(),
      })
      .where(eq(timeEntries.id, id))
      .returning();
    return timeEntry;
  }

  // Departments
  async getDepartments(): Promise<Department[]> {
    return await db.select().from(departments).orderBy(asc(departments.name));
  }

  async createDepartment(departmentData: InsertDepartment): Promise<Department> {
    const [department] = await db
      .insert(departments)
      .values(departmentData)
      .returning();
    return department;
  }

  async updateDepartment(id: number, departmentData: Partial<InsertDepartment>): Promise<Department> {
    const [updatedDepartment] = await db
      .update(departments)
      .set({
        ...departmentData,
        updatedAt: new Date(),
      })
      .where(eq(departments.id, id))
      .returning();
    return updatedDepartment;
  }

  async deleteDepartment(id: number): Promise<void> {
    // Check if department has users
    const userCount = await db
      .select({ count: sql`count(*)` })
      .from(users)
      .where(eq(users.departmentId, id));
    
    if (Number(userCount[0].count) > 0) {
      // Soft delete by setting isActive to false
      await db
        .update(departments)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(departments.id, id));
    } else {
      // Hard delete if no users assigned
      await db.delete(departments).where(eq(departments.id, id));
    }
  }

  // Cost Centers
  async getCostCenters(): Promise<CostCenter[]> {
    return await db.select().from(costCenters).orderBy(asc(costCenters.name));
  }

  async createCostCenter(costCenterData: InsertCostCenter): Promise<CostCenter> {
    const [costCenter] = await db
      .insert(costCenters)
      .values(costCenterData)
      .returning();
    return costCenter;
  }

  async updateCostCenter(id: number, costCenterData: Partial<InsertCostCenter>): Promise<CostCenter> {
    const [updatedCostCenter] = await db
      .update(costCenters)
      .set({
        ...costCenterData,
        updatedAt: new Date(),
      })
      .where(eq(costCenters.id, id))
      .returning();
    return updatedCostCenter;
  }

  async deleteCostCenter(id: number): Promise<void> {
    // Check if cost center has users
    const userCount = await db
      .select({ count: sql`count(*)` })
      .from(users)
      .where(eq(users.costCenterId, id));
    
    if (Number(userCount[0].count) > 0) {
      // Soft delete by setting isActive to false
      await db
        .update(costCenters)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(costCenters.id, id));
    } else {
      // Hard delete if no users assigned
      await db.delete(costCenters).where(eq(costCenters.id, id));
    }
  }

  // Cost Categories
  async getCostCategories(): Promise<CostCategory[]> {
    return await db.select().from(costCategories).orderBy(asc(costCategories.name));
  }

  async createCostCategory(categoryData: InsertCostCategory): Promise<CostCategory> {
    const [category] = await db
      .insert(costCategories)
      .values(categoryData)
      .returning();
    return category;
  }

  async updateCostCategory(id: number, categoryData: Partial<InsertCostCategory>): Promise<CostCategory> {
    const [updatedCategory] = await db
      .update(costCategories)
      .set({
        ...categoryData,
        updatedAt: new Date(),
      })
      .where(eq(costCategories.id, id))
      .returning();
    return updatedCategory;
  }

  async deleteCostCategory(id: number): Promise<void> {
    // Check if category has campaign costs
    const costCount = await db
      .select({ count: sql`count(*)` })
      .from(campaignCosts)
      .where(eq(campaignCosts.categoryId, id));
    
    if (Number(costCount[0].count) > 0) {
      // Soft delete by setting isActive to false
      await db
        .update(costCategories)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(costCategories.id, id));
    } else {
      // Hard delete if no campaign costs assigned
      await db.delete(costCategories).where(eq(costCategories.id, id));
    }
  }

  // Campaign Costs
  async getCampaignCosts(filters?: {
    campaignId?: number;
    referenceMonth?: string;
    status?: string;
    userId?: number;
  }): Promise<CampaignCostWithRelations[]> {
    const conditions = [];
    
    if (filters?.campaignId) {
      conditions.push(eq(campaignCosts.campaignId, filters.campaignId));
    }
    if (filters?.referenceMonth) {
      conditions.push(eq(campaignCosts.referenceMonth, filters.referenceMonth));
    }
    if (filters?.status) {
      conditions.push(eq(campaignCosts.status, filters.status as any));
    }
    if (filters?.userId) {
      conditions.push(eq(campaignCosts.userId, filters.userId));
    }

    const costs = await db.query.campaignCosts.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      with: {
        campaign: {
          with: {
            client: true,
          },
        },
        user: true,
        inactivatedByUser: true,
        category: true,
      },
      orderBy: [desc(campaignCosts.createdAt)],
    });

    return costs as CampaignCostWithRelations[];
  }

  async createCampaignCost(campaignCostData: InsertCampaignCost): Promise<CampaignCost> {
    // Validação para prevenir duplicações óbvias
    const existingCost = await db.query.campaignCosts.findFirst({
      where: and(
        eq(campaignCosts.campaignId, campaignCostData.campaignId),
        eq(campaignCosts.subject, campaignCostData.subject),
        eq(campaignCosts.referenceMonth, campaignCostData.referenceMonth),
        eq(campaignCosts.status, "ATIVO")
      ),
    });

    if (existingCost) {
      throw new Error("Já existe um custo ativo com o mesmo assunto para esta campanha no mesmo mês");
    }

    const [campaignCost] = await db
      .insert(campaignCosts)
      .values({
        ...campaignCostData,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    return campaignCost;
  }

  async updateCampaignCost(id: number, campaignCostData: Partial<InsertCampaignCost>): Promise<CampaignCost> {
    // Se atualizando assunto, verificar duplicação
    if (campaignCostData.subject || campaignCostData.campaignId || campaignCostData.referenceMonth) {
      const currentCost = await db.query.campaignCosts.findFirst({
        where: eq(campaignCosts.id, id),
      });

      if (currentCost) {
        const existingCost = await db.query.campaignCosts.findFirst({
          where: and(
            eq(campaignCosts.campaignId, campaignCostData.campaignId || currentCost.campaignId),
            eq(campaignCosts.subject, campaignCostData.subject || currentCost.subject),
            eq(campaignCosts.referenceMonth, campaignCostData.referenceMonth || currentCost.referenceMonth),
            eq(campaignCosts.status, "ATIVO"),
            sql`${campaignCosts.id} != ${id}` // Excluir o próprio registro
          ),
        });

        if (existingCost) {
          throw new Error("Já existe um custo ativo com o mesmo assunto para esta campanha no mesmo mês");
        }
      }
    }

    const [updatedCost] = await db
      .update(campaignCosts)
      .set({
        ...campaignCostData,
        updatedAt: new Date(),
      })
      .where(eq(campaignCosts.id, id))
      .returning();
    
    return updatedCost;
  }

  async inactivateCampaignCost(id: number, userId: number): Promise<CampaignCost> {
    const [inactivatedCost] = await db
      .update(campaignCosts)
      .set({
        status: "INATIVO",
        inactivatedAt: new Date(),
        inactivatedBy: userId,
        updatedAt: new Date(),
      })
      .where(eq(campaignCosts.id, id))
      .returning();
    
    return inactivatedCost;
  }

  async reactivateCampaignCost(id: number): Promise<CampaignCost> {
    const [reactivatedCost] = await db
      .update(campaignCosts)
      .set({
        status: "ATIVO",
        inactivatedAt: null,
        inactivatedBy: null,
        updatedAt: new Date(),
      })
      .where(eq(campaignCosts.id, id))
      .returning();
    
    return reactivatedCost;
  }

  async getCampaignCostsTotals(filters?: {
    campaignId?: number;
    referenceMonth?: string;
    status?: string;
    userId?: number;
  }): Promise<{ total: number; count: number; }> {
    const conditions = [];
    
    if (filters?.campaignId) {
      conditions.push(eq(campaignCosts.campaignId, filters.campaignId));
    }
    if (filters?.referenceMonth) {
      conditions.push(eq(campaignCosts.referenceMonth, filters.referenceMonth));
    }
    if (filters?.status) {
      conditions.push(eq(campaignCosts.status, filters.status as any));
    }
    if (filters?.userId) {
      conditions.push(eq(campaignCosts.userId, filters.userId));
    }

    const result = await db
      .select({
        total: sql<number>`COALESCE(SUM(CAST(${campaignCosts.amount} AS DECIMAL)), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(campaignCosts)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return {
      total: Number(result[0].total) || 0,
      count: Number(result[0].count) || 0,
    };
  }

  // Time Entry Comments - Sistema de comentários com histórico
  async createTimeEntryComment(comment: InsertTimeEntryComment): Promise<TimeEntryComment> {
    const [newComment] = await db
      .insert(timeEntryComments)
      .values({
        ...comment,
        createdAt: new Date(),
      })
      .returning();
    
    return newComment;
  }

  async getTimeEntryComments(timeEntryId: number): Promise<Array<TimeEntryComment & { user: User }>> {
    const comments = await db
      .select({
        id: timeEntryComments.id,
        timeEntryId: timeEntryComments.timeEntryId,
        userId: timeEntryComments.userId,
        comment: timeEntryComments.comment,
        commentType: timeEntryComments.commentType,
        createdAt: timeEntryComments.createdAt,
        user: {
          id: users.id,
          name: sql<string>`COALESCE(${users.firstName}, '') || ' ' || COALESCE(${users.lastName}, '')`,
          email: users.email,
          password: users.password,
          firstName: users.firstName,
          lastName: users.lastName,
          profileImageUrl: users.profileImageUrl,
          role: users.role,
          position: users.position,
          isManager: users.isManager,
          managerId: users.managerId,
          contractType: users.contractType,
          costCenterId: users.costCenterId,
          departmentId: users.departmentId,
          contractStartDate: users.contractStartDate,
          contractEndDate: users.contractEndDate,
          contractValue: users.contractValue,
          companyName: users.companyName,
          cnpj: users.cnpj,
          monthlyCost: users.monthlyCost,
          isActive: users.isActive,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        }
      })
      .from(timeEntryComments)
      .innerJoin(users, eq(timeEntryComments.userId, users.id))
      .where(eq(timeEntryComments.timeEntryId, timeEntryId))
      .orderBy(asc(timeEntryComments.createdAt));

    return comments.map(comment => ({
      id: comment.id,
      timeEntryId: comment.timeEntryId,
      userId: comment.userId,
      comment: comment.comment,
      commentType: comment.commentType,
      createdAt: comment.createdAt,
      user: comment.user
    })) as Array<TimeEntryComment & { user: User }>;
  }

  async respondToComment(timeEntryId: number, userId: number, comment: string): Promise<{comment: TimeEntryComment, updatedEntry: TimeEntry}> {
    const [newComment] = await db
      .insert(timeEntryComments) 
      .values({
        timeEntryId,
        userId,
        comment,
        commentType: "COLLABORATOR_RESPONSE",
        createdAt: new Date(),
      })
      .returning();

    // Atualiza o status do time entry para RASCUNHO permitindo edição
    const [updatedEntry] = await db
      .update(timeEntries)
      .set({
        status: "RASCUNHO",
        updatedAt: new Date(),
      })
      .where(eq(timeEntries.id, timeEntryId))
      .returning();

    return { comment: newComment, updatedEntry };
  }
}

export const storage = new DatabaseStorage();
